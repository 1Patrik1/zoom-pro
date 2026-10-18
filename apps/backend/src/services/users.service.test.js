import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/users.repo.js', () => ({
  usersRepo: {
    updateRole: vi.fn(),
    approve: vi.fn(),
    getByIdWithPassword: vi.fn(),
    emailInUse: vi.fn(),
    updatePassword: vi.fn(),
    updateProfile: vi.fn()
  }
}));

import { usersRepo } from '../repositories/users.repo.js';
import { usersService } from './users.service.js';
import { validators } from '../validators/request-validators.js';

describe('team role assignment security', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects assigning SUPERADMIN even when the actor is a company director', async () => {
    await expect(usersService.updateRole(
      { id: 'director-id', companyId: 'company-a', role: 'REDITEL' },
      { userId: 'member-id', role: 'SUPERADMIN' }
    )).rejects.toMatchObject({ status: 403 });

    expect(usersRepo.updateRole).not.toHaveBeenCalled();
  });

  it('rejects SUPERADMIN at request validation before reaching the service', () => {
    expect(validators.userRole({ userId: 'member-id-123', role: 'SUPERADMIN' })).toContain(
      'role musí být jedna z hodnot: REDITEL, ADMINISTRACE, VEDOUCI, MONTER'
    );
  });

  it('continues to allow an authorized director to assign a regular company role', async () => {
    const expected = { id: 'member-id', role: 'VEDOUCI' };
    usersRepo.updateRole.mockResolvedValue({ rows: [expected] });

    await expect(usersService.updateRole(
      { id: 'director-id', companyId: 'company-a', role: 'REDITEL' },
      { userId: 'member-id', role: 'VEDOUCI' }
    )).resolves.toEqual(expected);

    expect(usersRepo.updateRole).toHaveBeenCalledWith('company-a', 'member-id', 'VEDOUCI');
  });
});
