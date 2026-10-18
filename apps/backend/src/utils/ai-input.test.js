import { describe, expect, it } from 'vitest';
import { parseImageDataUrl, validateAiImages, validateAiPrompt, MAX_AI_IMAGE_BYTES } from './ai-input.js';

describe('AI request validation', () => {
  it('accepts a bounded prompt and valid image data', () => {
    expect(validateAiPrompt('Zkontroluj rozměry', { maxLength: 100 })).toBe('Zkontroluj rozměry');
    expect(parseImageDataUrl('data:image/png;base64,YWJj')).toEqual({
      mimeType: 'image/png',
      dataBase64: 'YWJj'
    });
    expect(validateAiImages([{ mimeType: 'image/jpeg', dataBase64: 'YWJj' }])).toHaveLength(1);
  });

  it('rejects empty and oversized prompts', () => {
    expect(() => validateAiPrompt(' ')).toThrow(/alespoň 2/);
    expect(() => validateAiPrompt('a'.repeat(101), { maxLength: 100 })).toThrow(/maximální délku/);
  });

  it('rejects unsupported image types, invalid base64 and mismatched MIME', () => {
    expect(() => parseImageDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toThrow(/JPEG, PNG nebo WebP/);
    expect(() => parseImageDataUrl('data:image/png;base64,YWJj', 'image/jpeg')).toThrow(/neodpovídá MIME/);
    expect(() => validateAiImages([{ mimeType: 'image/svg+xml', dataBase64: 'PHN2Zz4=' }])).toThrow(/Nepodporovaný/);
    expect(() => validateAiImages([{ mimeType: 'image/jpeg', dataBase64: 'not base64!' }])).toThrow(/base64/);
  });

  it('rejects images above the 3 MB decoded limit', () => {
    const tooLarge = Buffer.alloc(MAX_AI_IMAGE_BYTES + 1).toString('base64');
    expect(() => validateAiImages([{ mimeType: 'image/jpeg', dataBase64: tooLarge }])).toThrow(/3 MB/);
  });
});
