import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
}));

import { logger } from '../utils/logger.js';
import { errorHandler } from './error-handler.js';

function responseMock() {
  const res = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  return res;
}

describe('errorHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not disclose internal details for 500 errors', () => {
    const res = responseMock();
    const error = new Error('password database connection failed');
    error.status = 500;
    error.details = { connectionString: 'secret-value' };

    errorHandler(error, {}, res, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ error: 'Interní chyba serveru' });
    expect(JSON.stringify(res.payload)).not.toContain('secret-value');
    expect(logger.error).toHaveBeenCalledWith('Request failed', expect.objectContaining({
      status: 500,
      message: 'password database connection failed',
      details: { connectionString: 'secret-value' }
    }));
  });

  it('preserves safe client errors and validation details', () => {
    const res = responseMock();
    const error = Object.assign(new Error('Validation error'), {
      status: 400,
      details: [{ field: 'email', message: 'email je povinný' }]
    });

    errorHandler(error, {}, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      error: 'Validation error',
      details: [{ field: 'email', message: 'email je povinný' }]
    });
  });

  it('falls back to a valid 500 response for an invalid status', () => {
    const res = responseMock();
    errorHandler(Object.assign(new Error('bad'), { status: 700 }), {}, res, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ error: 'Interní chyba serveru' });
  });
});
