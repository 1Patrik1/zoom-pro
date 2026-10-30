import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../config/db.js', () => ({ query }));

import { signaturesRepo } from './signatures.repo.js';

describe('signaturesRepo.listProviders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selects only client-safe provider fields', async () => {
    const rows = [{
      id: 'provider-1',
      name: 'Qualified signature',
      supportedLevels: ['SIMPLE'],
      isActive: true,
      isDefault: true
    }];
    query.mockResolvedValue({ rows });

    const result = await signaturesRepo.listProviders('company-1');

    expect(result.rows).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/SELECT\s+id,\s*name,\s*"supportedLevels",\s*"isActive",\s*"isDefault"/i);
    expect(sql).not.toMatch(/SELECT\s+\*/i);
    expect(sql).not.toMatch(/"apiKey"|"webhookSecret"|"certPath"/i);
    expect(params).toEqual(['company-1']);
  });
});
