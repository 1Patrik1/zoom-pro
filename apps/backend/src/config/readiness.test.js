import { describe, expect, it, vi } from 'vitest';
import { checkDatabaseReadiness } from '../utils/readiness.js';

describe('checkDatabaseReadiness', () => {
  it('returns true when the database probe succeeds', async () => {
    const runQuery = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    await expect(checkDatabaseReadiness(runQuery)).resolves.toBe(true);
    expect(runQuery).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns false without exposing database details when the probe fails', async () => {
    const runQuery = vi.fn().mockRejectedValue(new Error('connection refused: secret host'));
    await expect(checkDatabaseReadiness(runQuery)).resolves.toBe(false);
  });
});
