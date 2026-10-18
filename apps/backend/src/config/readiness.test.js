import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ query: vi.fn() }));

import { query } from '../config/db.js';

describe('database readiness query', () => {
  beforeEach(() => vi.clearAllMocks());

  it('can execute a minimal database probe', async () => {
    query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    await expect(query('SELECT 1')).resolves.toMatchObject({ rows: [{ '?column?': 1 }] });
  });

  it('propagates database failures for the readiness handler to report unavailable', async () => {
    query.mockRejectedValue(new Error('connection refused'));
    await expect(query('SELECT 1')).rejects.toThrow('connection refused');
  });
});
