import { HttpError } from './http-error.js';

export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_AI_IMAGE_BYTES = 3 * 1024 * 1024;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function decodedBase64Bytes(value) {
  if (typeof value !== 'string' || !value.length || value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) {
    throw new HttpError(400, 'Obrázek nemá platné base64 kódování.');
  }
  return Buffer.from(value, 'base64').byteLength;
}

export function validateAiPrompt(prompt, { field = 'prompt', maxLength = 4000 } = {}) {
  if (typeof prompt !== 'string' || prompt.trim().length < 2) {
    throw new HttpError(400, `${field} musí obsahovat alespoň 2 znaky.`);
  }
  if (prompt.length > maxLength) {
    throw new HttpError(400, `${field} překračuje maximální délku ${maxLength} znaků.`);
  }
  return prompt.trim();
}

export function validateAiImages(images) {
  if (images === undefined || images === null) return [];
  if (!Array.isArray(images) || images.length > 2) {
    throw new HttpError(400, 'Lze přiložit nejvýše 2 obrázky.');
  }
  return images.map((image) => {
    if (!image || typeof image !== 'object' || !ALLOWED_IMAGE_MIME_TYPES.has(image.mimeType)) {
      throw new HttpError(400, 'Nepodporovaný typ obrázku.');
    }
    const dataBase64 = image.dataBase64;
    const bytes = decodedBase64Bytes(dataBase64);
    if (bytes < 1 || bytes > MAX_AI_IMAGE_BYTES) {
      throw new HttpError(413, 'Obrázek překračuje limit 3 MB.');
    }
    return { dataBase64, mimeType: image.mimeType };
  });
}

export function parseImageDataUrl(dataUrl, suppliedMimeType) {
  if (typeof dataUrl !== 'string') throw new HttpError(400, 'Chybí platný obrázek.');
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new HttpError(400, 'Obrázek musí být JPEG, PNG nebo WebP ve formátu base64 data URI.');
  const [, mimeType, dataBase64] = match;
  if (suppliedMimeType !== undefined && suppliedMimeType !== mimeType) {
    throw new HttpError(400, 'Typ obrázku neodpovídá MIME typu v data URI.');
  }
  const bytes = decodedBase64Bytes(dataBase64);
  if (bytes < 1 || bytes > MAX_AI_IMAGE_BYTES) throw new HttpError(413, 'Obrázek překračuje limit 3 MB.');
  return { mimeType, dataBase64 };
}
