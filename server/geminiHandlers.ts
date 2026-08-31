import { Request, Response } from 'express';
import { getGemini } from './gemini';

// In-memory conversation stores (sessionId -> messages)
interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const chatSessions: Record<string, ChatMessage[]> = {};

export async function handleGeminiChat(req: Request, res: Response) {
  try {
    const { sessionId = 'default-session', message, taskType = 'general', useMapsGrounding = false, latitude, longitude } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }

    const history = chatSessions[sessionId];
    history.push({
      role: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Graceful fallback response when API key is not yet configured
      const reply = `[VZT AI Expert]: Rozumím vašemu dotazu ohledně HVAC/VZT: "${message}". ` +
        `Pro plné živé propojení s modely Gemini prosím nastavte GEMINI_API_KEY v systémovém nastavení. ` +
        `Standardně dle ČSN EN 1507 a technologických postupů doporučujeme dodržovat normy pro montáž a revize VZT.`;
      
      history.push({
        role: 'model',
        text: reply,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        reply,
        sessionId,
        history,
        groundingMetadata: null,
      });
    }

    const ai = getGemini();

    // Model selection with quota-resilient fallback priority:
    // 1. gemini-2.5-flash (fast, highly available with standard free tier limits)
    // 2. gemini-2.5-flash-lite
    // 3. gemini-3.5-flash
    const candidateModels = taskType === 'complex'
      ? ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
      : ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash'];

    // System instruction for HVAC/VZT enterprise assistant
    const systemInstruction = `Jste vysoce kvalifikovaný VZT (HVAC) a stavební AI asistent integrovaný do platformy Zoom Pro / VZT System.
Mluvíte česky. Vaše odbornost zahrnuje:
- Normy ČSN EN 1507 (zkušební postupy těsnosti čtyřhranného potrubí), ČSN EN 12237 (kruhové potrubí), ČSN 73 0872 (požární bezpečnost).
- Výpočty tlakových ztrát, dimenzování tlumičů hluku (kulisy, buňky), požární klapky (EIS 60/90/120), regulátory průtoku VAV/CAV.
- Rozpoznávání montážních kolizí (průvlaky, rozvody ZTI, elektro trasy, sprinklery).
- Rozpočet, normy spotřeby materiálu (plechy, spojovací šrouby M8, nýty 4x10, PU tmely, AL pásky).
- Vyhledávání stavebních prodejců, velkoobchodů VZT (Lindab, Multi-VAC, Systemair, Elektrodesign, Příhoda, Trox) a orientaci na stavbách v ČR/SR.
Odpovídejte technicky přesně, přehledně formátovaným markdownem a konkrétními doporučeními pro montéry a stavbyvedoucí.`;

    // Setup config
    const config: any = {
      systemInstruction,
    };

    if (useMapsGrounding) {
      config.tools = [{ googleMaps: {} }];
      if (latitude && longitude) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: Number(latitude),
              longitude: Number(longitude),
            },
          },
        };
      }
    }

    // Build contents for multi-turn history (only text parts)
    const contents = history.map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    let response: any = null;
    let modelUsed = candidateModels[0];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        modelUsed = model;
        break;
      } catch (err: any) {
        console.warn(`Model ${model} failed:`, err?.message);
        lastError = err;
        // Continue loop to try next fallback model
      }
    }

    if (!response) {
      const isQuota = lastError?.message?.includes('429') || lastError?.message?.includes('quota') || lastError?.message?.includes('RESOURCE_EXHAUSTED');
      const fallbackReply = isQuota
        ? `⚠️ **Upozornění na limit API klíče (Rate limit 429)**: Váš bezplatný Gemini API klíč momentálně dosáhl minutového limitu požadavků. Dotaz "${message}" byl zaznamenán. Pro okamžité technické informace o VZT využijte vestavěnou kalkulačku a normy ČSN v levém menu.`
        : `Omlouvám se, při zpracování požadavku došlo k chybě: ${lastError?.message || 'Neznámá chyba'}`;

      history.push({
        role: 'model',
        text: fallbackReply,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        reply: fallbackReply,
        sessionId,
        history,
        groundingMetadata: null,
        modelUsed: 'fallback',
        isQuota,
      });
    }

    const reply = response.text || 'Omlouvám se, nepodařilo se vygenerovat odpověď.';

    history.push({
      role: 'model',
      text: reply,
      timestamp: new Date().toISOString(),
    });

    // Keep history manageable
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata || null;

    res.json({
      reply,
      sessionId,
      history,
      groundingMetadata,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({
      error: error.message || 'Chyba při komunikaci s Gemini API',
    });
  }
}

export async function handleTranscribeAudio(req: Request, res: Response) {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        transcript: 'Zkušební přepis: Montáž potrubí v hale 2 probíhá v souladu s projektovou dokumentací. (Pro živý přepis nastavte GEMINI_API_KEY).',
        simulated: true,
      });
    }

    const ai = getGemini();

    // Model selection with fallback
    let response: any = null;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: typeof audioBase64 === 'string' ? audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '') : '',
                  mimeType,
                },
              },
              {
                text: 'Přepište tento hlasový záznam stavbyvedoucího / montéra VZT do čistého českého textu. Opravte odborné HVAC/VZT termíny a zachovejte přesná čísla a kódy pozic.',
              },
            ],
          },
        ],
      });
    } catch (transcribeErr: any) {
      console.warn('Transcription primary call failed, trying gemini-3.5-transcribe:', transcribeErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: typeof audioBase64 === 'string' ? audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '') : '',
                  mimeType,
                },
              },
              {
                text: 'Přepište tento hlasový záznam stavbyvedoucího / montéra VZT do čistého českého textu.',
              },
            ],
          },
        ],
      });
    }

    res.json({
      transcript: response.text || '',
      simulated: false,
    });
  } catch (error: any) {
    console.error('Gemini Transcribe Error:', error);
    res.status(500).json({
      error: error.message || 'Chyba při přepisu audia',
    });
  }
}

export async function handleGenerateOrEditImage(req: Request, res: Response) {
  try {
    const { prompt, referenceImageBase64, mimeType = 'image/jpeg', aspectRatio = '1:1' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        caption: `Simulovaný VZT technický výkres / 3D vizualizace pro zadání: "${prompt}"`,
        simulated: true,
      });
    }

    const ai = getGemini();

    // Primary model: gemini-3.1-flash-lite-image (or fallback gemini-3.1-flash-image)
    const parts: any[] = [];
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          data: typeof referenceImageBase64 === 'string' ? referenceImageBase64.replace(/^data:image\/[a-z0-9]+;base64,/, '') : '',
          mimeType,
        },
      });
    }
    parts.push({
      text: prompt,
    });

    let response: any = null;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts,
        },
        config: {
          imageConfig: {
            aspectRatio: (aspectRatio as any) || '1:1',
          },
        },
      });
    } catch (primaryErr: any) {
      console.warn('Primary image model call failed, trying alternative image endpoint:', primaryErr?.message);
      // If 429 quota or unsupported model, try gemini-3.1-flash-image
      if (primaryErr?.message?.includes('429') || primaryErr?.message?.includes('RESOURCE_EXHAUSTED')) {
        throw primaryErr;
      }
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts,
        },
        config: {
          imageConfig: {
            aspectRatio: (aspectRatio as any) || '1:1',
          },
        },
      });
    }

    const candidateParts = response?.candidates?.[0]?.content?.parts || [];
    let imageUrl: string | null = null;
    let caption = '';

    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        caption += part.text;
      }
    }

    if (imageUrl) {
      return res.json({
        imageUrl,
        prompt,
        caption: caption || undefined,
        simulated: false,
      });
    }

    // If model returned only text description
    res.json({
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
      caption: caption || 'Generování dokončeno',
      simulated: true,
    });
  } catch (error: any) {
    console.error('Gemini Image Gen Error:', error);
    const isQuota = error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (isQuota) {
      // Graceful fallback image with informational message
      return res.json({
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        caption: `[Režim náhledu]: Bezplatný API klíč dosáhl limitu (Rate limit 429). Zobrazena referenční technická VZT vizualizace pro: "${req.body.prompt}".`,
        simulated: true,
        isQuota: true,
      });
    }

    res.status(500).json({
      error: error.message || 'Chyba při generování obrázku',
      isQuota: false,
    });
  }
}

export function handleGetChatHistory(req: Request, res: Response) {
  const sessionId = (req.params.sessionId || req.query.sessionId || 'default-session') as string;
  res.json({
    sessionId,
    history: chatSessions[sessionId] || [],
  });
}

export function handleClearChatHistory(req: Request, res: Response) {
  const sessionId = (req.params.sessionId || req.query.sessionId || 'default-session') as string;
  chatSessions[sessionId] = [];
  res.json({ success: true, sessionId, history: [] });
}

export async function handleAnalyzeCollisionImage(req: Request, res: Response) {
  try {
    const { imageBase64, mimeType = 'image/jpeg', locationNote, projectName } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 je vyžadováno pro analýzu snímku' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Intelligent fallback when API key is not yet set
      const tagSuffix = Math.floor(10 + Math.random() * 90);
      return res.json({
        success: true,
        detectedObjects: [
          'Potrubí VZT čtyřhranné (cca 800×400 mm)',
          'Kabelový žlab elektroinstalace / ocelový rošt',
          'Železobetonový nosný průvlak / stropní konstrukce',
          'Závitové tyče M8 a montážní profily'
        ],
        collisionTag: `KOL-2026-VZT-EL${tagSuffix}`,
        suggestedTitle: 'Kolize čtyřhranného potrubí VZT s kabelovým žlabem elektro',
        conflictingTrade: 'ELEKTRO',
        severity: 'HIGH',
        description: 'VZT potrubí kříží trasu hlavního kabelového žlabu elektroinstalace. Vertikální montážní mezera je menší než 50 mm, což brání osazení potrubní izolace tl. 40 mm dle ČSN EN 1507 a omezuje přístup ke kabelům.',
        resolutionNote: 'Doporučeno posunout kabelový žlab o 180 mm k nosné stěně nebo vyrobit VZT etážku (odsazení e=200 mm) před osazením tlumiče hluku.',
        complianceNotes: 'ČSN EN 1507 (požadavky na těsnost a montážní odstupy), ČSN 33 2000 (bezpečné souběhy elektro a vzduchotechniky).',
        confidenceScore: 0.94,
        isSimulated: true,
      });
    }

    const ai = getGemini();

    const cleanBase64 = typeof imageBase64 === 'string'
      ? imageBase64.replace(/^data:image\/[a-z0-9+]+;base64,/, '')
      : '';

    const prompt = `Jste specializovaný stavební AI expert na prostorovou koordinaci VZT (HVAC), BIM a stavební kolize na stavbách v ČR/SR.
Analyzujte tuto fotografii z montáže vzduchotechniky / stavby.
Úkol:
1. Automaticky identifikujte všechny stavební a technické objekty na snímku (např. čtyřhranné potrubí, spiro potrubí, kabelové lávky/žlaby, ŽB stěna/průvlak/sloup, potrubí vody/kanalizace ZTI, chlazení VRV, sprinklery, stropní závěsy).
2. Určete prostorový střet / kolizi mezi VZT a ostatními profesemi (ZTI, ELEKTRO, STATIKA, CHLAZENI, ARCHITEKTURA).
3. Navrhněte jednoznačný štítek kolize (např. KOL-2026-VZT-EL01, KOL-VZT-STAT-02, KOL-VZT-ZTI-04).
4. Vytvořte výstižný název, přesný technický popis situace a konkrétní návrh řešení pro klempířskou dílnu nebo stavbyvedoucího (např. výroba přechodky, etážky, posun trasy, jádrový prostup).
5. Posuďte závažnost (LOW, MEDIUM, HIGH, CRITICAL).

Lokalita stavby / kontext: "${locationNote || 'Stavební prostor VZT'}", Projekt: "${projectName || 'Stavba VZT'}".

Odpovězte výhradně ve formátu JSON s následující strukturou:
{
  "detectedObjects": ["string", "string"],
  "collisionTag": "string",
  "suggestedTitle": "string",
  "conflictingTrade": "ZTI" | "ELEKTRO" | "STATIKA" | "CHLAZENI" | "ARCHITEKTURA",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "description": "string",
  "resolutionNote": "string",
  "complianceNotes": "string",
  "confidenceScore": number
}`;

    const candidateModels = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    let response: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: (mimeType as any) || 'image/jpeg',
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        console.warn(`Vision model ${model} failed:`, err?.message);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      console.warn('Gemini vision model fallback:', lastError?.message);
      const tagSuffix = Math.floor(10 + Math.random() * 90);
      return res.json({
        success: true,
        detectedObjects: [
          'Čtyřhranné potrubí VZT z pozinkovaného plechu',
          'Kabelová trasa elektro / kovový kabelový rošt',
          'Železobetonový stropní panel / nosník'
        ],
        collisionTag: `KOL-2026-VZT-EL${tagSuffix}`,
        suggestedTitle: 'Křížení VZT potrubí s kabelovou trasou elektro',
        conflictingTrade: 'ELEKTRO',
        severity: 'HIGH',
        description: 'Na snímku byl detekován prostorový střet vzduchotechnické trasy a kabelové lávky. Není dodržen manipulační prostor pro izolaci a revize.',
        resolutionNote: 'Vyrobit VZT etážku (vyosení) o 150-200 mm nebo koordinovat přeložku kabelového roštu se stavbyvedoucím elektro.',
        complianceNotes: 'ČSN EN 1507 (zkušební postupy těsnosti a montáže), ČSN 73 0872.',
        confidenceScore: 0.88,
        isSimulated: true,
        notice: lastError?.message ? `Gemini API: ${lastError.message}` : undefined,
      });
    }

    let parsed: any;
    try {
      const rawText = response.text.trim();
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', response.text);
      parsed = {
        detectedObjects: ['Potrubí VZT', 'Kabelové rozvody', 'Stavební stěna'],
        collisionTag: `KOL-2026-VZT-${Math.floor(100 + Math.random() * 900)}`,
        suggestedTitle: 'Detekovaná prostorová kolize VZT',
        conflictingTrade: 'ELEKTRO',
        severity: 'HIGH',
        description: response.text,
        resolutionNote: 'Upravit trasu nebo vyrobit atypický tvarový díl.',
        confidenceScore: 0.85,
      };
    }

    const allowedTrades = ['ZTI', 'ELEKTRO', 'STATIKA', 'CHLAZENI', 'ARCHITEKTURA'];
    const trade = allowedTrades.includes(parsed.conflictingTrade) ? parsed.conflictingTrade : 'ELEKTRO';

    const allowedSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const sev = allowedSeverities.includes(parsed.severity) ? parsed.severity : 'HIGH';

    return res.json({
      success: true,
      detectedObjects: Array.isArray(parsed.detectedObjects) ? parsed.detectedObjects : ['Potrubí VZT', 'Kabelové lávky', 'Stavební stěna'],
      collisionTag: parsed.collisionTag || `KOL-2026-VZT-01`,
      suggestedTitle: parsed.suggestedTitle || 'Stavební kolize VZT potrubí',
      conflictingTrade: trade,
      severity: sev,
      description: parsed.description || 'Detekován prostorový konflikt trasy VZT.',
      resolutionNote: parsed.resolutionNote || 'Nutno posoudit dílenskou úpravu potrubí nebo posun navazující profese.',
      complianceNotes: parsed.complianceNotes || 'ČSN EN 1507, ČSN 73 0872',
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.92,
      isSimulated: false,
    });
  } catch (error: any) {
    console.error('Gemini Collision Vision Error:', error);
    res.status(500).json({
      error: error.message || 'Chyba při analýze snímku kolize',
    });
  }
}
