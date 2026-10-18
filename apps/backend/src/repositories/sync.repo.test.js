import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ query: vi.fn() }));

import { query } from '../config/db.js';
import { syncRepo } from './sync.repo.js';

describe('tenant-scoped sync joins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('joins attendance user and project by the attendance tenant', async () => {
    query.mockResolvedValue({ rows: [] });
    await syncRepo.getAttendance('company-a');
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('u."companyId" = a."companyId"');
    expect(sql).toContain('p."companyId" = a."companyId"');
  });

  it('joins inventory movement metadata by the movement tenant', async () => {
    query.mockResolvedValue({ rows: [] });
    await syncRepo.getInventoryMovements('company-a');
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('i."companyId" = m."companyId"');
    expect(sql).toContain('p."companyId" = m."companyId"');
    expect(sql).toContain('u."companyId" = m."companyId"');
  });
});
