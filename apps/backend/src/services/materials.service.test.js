import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/materials.repo.js', () => ({
  materialsRepo: {
    search: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    seed: vi.fn()
  }
}));

import { materialsRepo } from '../repositories/materials.repo.js';
import { materialsService } from './materials.service.js';

describe('material seed tenant isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the authenticated company ID and ignores tenant IDs supplied in items', async () => {
    materialsRepo.seed.mockResolvedValue([{ id: 'material-1', companyId: 'company-a' }]);
    const user = { id: 'admin-a', companyId: 'company-a', role: 'ADMINISTRACE' };
    const items = [{ companyId: 'company-b', code: 'SKU-1', name: 'Duct' }];

    await materialsService.seed(user, items);

    expect(materialsRepo.seed).toHaveBeenCalledWith('company-a', items);
  });

  it('rejects seeding by a regular member', async () => {
    await expect(materialsService.seed(
      { id: 'member-a', companyId: 'company-a', role: 'MONTER' },
      [{ companyId: 'company-b', code: 'SKU-1', name: 'Duct' }]
    )).rejects.toMatchObject({ status: 403 });

    expect(materialsRepo.seed).not.toHaveBeenCalled();
  });
});
