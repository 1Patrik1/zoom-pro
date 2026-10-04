import { describe, it, expect } from 'vitest';
import { HttpError } from './http-error.js';

describe('HttpError', () => {
  it('by měl správně nastavit status code a zprávu', () => {
    const err = new HttpError(404, 'Nenalezeno');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Nenalezeno');
  });

  it('by měl fungovat v rámci standardního Error prototypu', () => {
    const err = new HttpError(500, 'Server error');
    expect(err).toBeInstanceOf(Error);
  });
});
