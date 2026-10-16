import { describe, expect, it } from 'vitest';
import { isValidNotificationUserId, normalizeNotificationInput } from './notifications-validation.js';

describe('notification validation', () => {
  it('accepts a valid notification and trims user input', () => {
    expect(normalizeNotificationInput({ title: '  Úkol  ', body: '  Hotovo  ', type: 'success' })).toEqual({
      ok: true,
      value: { title: 'Úkol', body: 'Hotovo', type: 'success', data: {} }
    });
  });

  it('rejects an empty title and overlong title/body', () => {
    expect(normalizeNotificationInput({ title: '  ' }).ok).toBe(false);
    expect(normalizeNotificationInput({ title: 'x'.repeat(121) }).ok).toBe(false);
    expect(normalizeNotificationInput({ title: 'OK', body: 'x'.repeat(1001) }).ok).toBe(false);
  });

  it('rejects unknown types and non-object metadata', () => {
    expect(normalizeNotificationInput({ title: 'OK', type: 'execute' }).ok).toBe(false);
    expect(normalizeNotificationInput({ title: 'OK', data: ['not', 'an', 'object'] }).ok).toBe(false);
    expect(normalizeNotificationInput({ title: 'OK', data: { extra: 'x'.repeat(2001) } }).ok).toBe(false);
  });

  it('accepts UUID recipients and rejects malformed values', () => {
    expect(isValidNotificationUserId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    expect(isValidNotificationUserId('not-a-uuid')).toBe(false);
    expect(isValidNotificationUserId(null)).toBe(false);
  });
});
