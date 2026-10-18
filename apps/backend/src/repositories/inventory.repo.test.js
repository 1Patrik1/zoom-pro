import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}));

import { withTransaction } from '../config/db.js';
import { inventoryRepo } from './inventory.repo.js';

describe('inventory movement tenant ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a project from another company before inserting a movement', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'item-a', companyId: 'company-a', quantity: 10, name: 'Item A' }] })
      .mockResolvedValueOnce({ rows: [] });
    withTransaction.mockImplementation(async (callback) => callback({ query: clientQuery }));

    await expect(inventoryRepo.createMovement({
      companyId: 'company-a',
      itemId: 'item-a',
      projectId: 'project-b',
      type: 'ISSUE',
      quantity: 1,
      createdBy: 'user-a'
    })).rejects.toMatchObject({ status: 404 });

    expect(clientQuery).toHaveBeenCalledTimes(2);
    expect(clientQuery.mock.calls[1][1]).toEqual(['project-b', 'company-a']);
  });
});
