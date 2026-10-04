import { query } from '../config/db.js';
import { geminiService } from './gemini.service.js';

const REFERENCE_SIZES_MM = {
  A4_short: 210,
  A4_long: 297,
  tape30: 30,
  tape50: 50,
  banknote100: 140,   // CZ 100 Kč
  banknote200: 146,
  coin10: 24.5,       // 10 Kč
  coin20: 26,
  brick: 290,
  custom: null,
};

function safeJson(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

async function detect(user, payload) {
  const {
    projectId = null,
    imageDataUrl,           // 'data:image/jpeg;base64,....'
    mimeType = 'image/jpeg',
    referenceObject = 'A4_short',
    referenceSizeMm = null,
    hint = '',
  } = payload || {};

  if (!imageDataUrl) return { ok: false, error: 'Chybí obrázek.' };

  // Odseknout base64
  const base64 = imageDataUrl.includes('base64,') ? imageDataUrl.split('base64,')[1] : imageDataUrl;
  const refSize = referenceSizeMm || REFERENCE_SIZES_MM[referenceObject] || 210;

  const prompt = [
    'Jsi expert na VZT / vzduchotechniku. Na fotce je chybějící kus potrubí mezi dvěma stávajícími úseky.',
    `Referenční předmět: "${referenceObject}" o skutečné velikosti ${refSize} mm — použij ho jako měřítko.`,
    hint ? `Kontext: ${hint}` : '',
    '',
    'Změř a urč:',
    '1) Tvar potrubí (round/rect).',
    '2) Rozměry v mm: pro round diameterMm; pro rect widthMm a heightMm.',
    '3) Přesah osy mezi konci existujících úseků (offsetMm) — kolmá vzdálenost os.',
    '4) Podélná projekce mezi konci (runMm).',
    '5) Sklon osy chybějícího kusu (angleDeg, 0=vodorovně).',
    '6) Doporučený kus: "straight", "elbow15", "elbow30", "elbow45", "elbow60", "reducer", "offset_pair" (2× koleno + mezikus).',
    '7) Confidence 0–1.',
    '',
    'Odpověz POUZE JSON:',
    '{',
    '  "shape":"round|rect",',
    '  "diameterMm":number|null,',
    '  "widthMm":number|null,',
    '  "heightMm":number|null,',
    '  "offsetMm":number,',
    '  "runMm":number,',
    '  "angleDeg":number,',
    '  "suggestedPieceKind":"straight|elbow15|elbow30|elbow45|elbow60|reducer|offset_pair",',
    '  "reasoning":"stručně česky",',
    '  "confidence":0.0-1.0',
    '}',
  ].filter(Boolean).join('\n');

  const gem = await geminiService.callGemini(prompt, {
    images: [{ dataBase64: base64, mimeType }],
    model: 'gemini-1.5-flash',
  });

  if (!gem.ok) {
    return { ok: false, offline: gem.offline, error: gem.text || 'Gemini není dostupný.' };
  }

  const parsed = safeJson(gem.text) || {};
  const shape = parsed.shape === 'rect' ? 'rect' : (parsed.shape === 'round' ? 'round' : 'unknown');

  // Doporučené SKU z katalogu — hledáme nejbližší
  let suggestedSku = null;
  try {
    const size = shape === 'round' ? parsed.diameterMm : Math.max(parsed.widthMm || 0, parsed.heightMm || 0);
    if (size) {
      const result = await query(
        `SELECT sku FROM "CatalogItem" WHERE "companyId"=$1 AND shape=$2
         ORDER BY ABS(COALESCE("diameterMm", GREATEST("widthMm","heightMm")) - $3) ASC LIMIT 1`,
        [user.companyId, shape, size],
      );
      suggestedSku = result.rows[0]?.sku || null;
    }
  } catch { /* ignore */ }

  // Uložit
  const insertResult = await query(
    `INSERT INTO "DuctAutoDetect" ("companyId","projectId","createdBy","imageDataUrl","referenceObject","referenceSizeMm",
       "detectedShape","detectedWidthMm","detectedHeightMm","detectedDiameterMm","detectedOffsetMm","detectedAngleDeg","detectedRunMm",
       "suggestedPieceKind","suggestedSku",confidence,"aiRaw")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [
      user.companyId, projectId, user.id, imageDataUrl, referenceObject, refSize,
      shape,
      parsed.widthMm ?? null, parsed.heightMm ?? null, parsed.diameterMm ?? null,
      parsed.offsetMm ?? null, parsed.angleDeg ?? null, parsed.runMm ?? null,
      parsed.suggestedPieceKind ?? null, suggestedSku, parsed.confidence ?? null,
      parsed,
    ],
  );
  const row = insertResult.rows[0];

  return {
    ok: true,
    detection: {
      id: row.id,
      shape,
      diameterMm: parsed.diameterMm,
      widthMm: parsed.widthMm,
      heightMm: parsed.heightMm,
      offsetMm: parsed.offsetMm,
      runMm: parsed.runMm,
      angleDeg: parsed.angleDeg,
      suggestedPieceKind: parsed.suggestedPieceKind,
      suggestedSku,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    },
    aiRaw: parsed,
  };
}

async function history(user, projectId) {
  const params = [user.companyId];
  let where = `"companyId" = $1`;
  if (projectId) { params.push(projectId); where += ` AND "projectId" = $${params.length}`; }
  return query(
    `SELECT id, "projectId", "detectedShape","detectedDiameterMm","detectedWidthMm","detectedHeightMm",
     "detectedOffsetMm","detectedAngleDeg","suggestedPieceKind","suggestedSku",confidence,"createdAt"
     FROM "DuctAutoDetect" WHERE ${where} ORDER BY "createdAt" DESC LIMIT 100`,
    params,
  );
}

export const autoDetectService = { detect, history };
