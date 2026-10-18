import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ query: vi.fn() }));

import { query } from '../config/db.js';
import { permissionsRepo } from './permissions.repo.js';

describe('effective permission query', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gives explicit per-user overrides precedence over role defaults', async () => {
    query.mockResolvedValue({ rows: [{ key: 'inventory.create_item', granted: false }] });

    await permissionsRepo.getEffectivePermissions('user-1', 'REDITEL');

    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual(['user-1', 'REDITEL']);
    expect(sql).toContain('SELECT key, granted, 1 AS priority FROM role_permissions');
    expect(sql).toContain('SELECT key, granted, 2 AS priority FROM user_overrides');
    expect(sql).toContain('WHEN BOOL_OR(priority = 2)');
    expect(sql).toContain('BOOL_AND(granted) FILTER (WHERE priority = 2)');
    expect(sql).toContain('BOOL_OR(granted) FILTER (WHERE priority = 1)');
  });
});
