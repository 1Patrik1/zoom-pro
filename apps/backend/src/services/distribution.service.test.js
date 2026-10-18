import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}));

import { query, withTransaction } from '../config/db.js';
import { distributionService } from './distribution.service.js';

describe('distribution tenant isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scopes supplier price reads to the authenticated company', async () => {
    query.mockResolvedValue({ rows: [] });

    await distributionService.listPrices('company-a', 'catalog-item-a');

    expect(query).toHaveBeenCalledWith(expect.stringContaining('s."companyId" = $2'), ['catalog-item-a', 'company-a']);
    expect(query.mock.calls[0][0]).toContain('ci."companyId" = $2');
  });

  it('rejects adding a supplier price when supplier or catalog item is outside the company', async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(distributionService.upsertPrice('company-a', {
      supplierId: 'supplier-b',
      catalogItemId: 'catalog-item-b',
      price: 100
    })).rejects.toMatchObject({ status: 404 });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(['supplier-b', 'catalog-item-b', 'company-a']);
  });

  it('rejects RFQs referencing projects outside the company before starting a transaction', async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(distributionService.createRfq('company-a', { id: 'user-a' }, {
      projectId: 'project-b',
      lines: [],
      note: 'cross tenant attempt'
    })).rejects.toMatchObject({ status: 404 });

    expect(withTransaction).not.toHaveBeenCalled();
  });
});
