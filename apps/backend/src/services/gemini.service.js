import { query } from '../config/db.js';
import { validateAiImages, validateAiPrompt } from '../utils/ai-input.js';
import { HttpError } from '../utils/http-error.js';

const ALLOWED_MODELS = new Set(['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.5-flash']);

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

async function getApiKey() {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) return envKey;
  const result = await query('SELECT value FROM "PlatformSetting" WHERE "key" = $1', ['geminiApiKey']);
  return result.rows[0]?.value?.value || null;
}

async function callGemini(prompt, { model = 'gemini-1.5-flash', images = [] } = {}) {
  const safePrompt = validateAiPrompt(prompt, { maxLength: 12000 });
  if (!ALLOWED_MODELS.has(model)) throw new HttpError(400, 'Vybraný AI model není povolen.');
  const safeImages = validateAiImages(images);
  const apiKey = await getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      offline: true,
      text: 'Gemini API klíč není nastaven. Superadmin ho nastaví v Platforma → Nastavení.',
    };
  }

  const parts = [{ text: safePrompt }];
  for (const img of safeImages) {
    if (img?.dataBase64 && img?.mimeType) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.dataBase64 } });
    }
  }

  const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, text: 'AI poskytovatel požadavek nedokázal zpracovat.' };
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || '';
    return { ok: true, text, raw: data };
  } catch (error) {
    return { ok: false, text: 'AI poskytovatel je dočasně nedostupný nebo vypršel časový limit.' };
  }
}

export const geminiService = {
  callGemini,
  async chat(user, { prompt, images, model }) {
    const context = [
      `Uživatel: ${user.email} (role ${user.role}, firma ${user.companyId}).`,
      'Odpovídej stručně česky, prakticky, jako AI asistent stavební/VZT firmy.',
      `Dotaz: ${prompt}`,
    ].join('\n');
    return callGemini(context, { images, model });
  },
  async troubleshoot(user, { situation, images }) {
    const prompt = [
      'Jsi expert na VZT/stavební montáže. Analyzuj situaci a navrhni řešení v 5 krocích.',
      `Situace: ${situation}`,
      'Formát: 1) diagnóza  2) rizika  3) postup opravy  4) nutné materiály  5) BOZP.',
    ].join('\n');
    return callGemini(prompt, { images });
  },
};
