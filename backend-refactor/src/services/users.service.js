import { usersRepo } from '../repositories/users.repo.js';
import { HttpError } from '../utils/http-error.js';

export const usersService = {
  async updateRole(user, payload) {
    if (!['SUPERADMIN', 'REDITEL'].includes(user.role)) throw new HttpError(403, 'Nemáte oprávnění měnit role');
    const result = await usersRepo.updateRole(user.companyId, payload.userId, payload.role);
    return result.rows[0] || { ok: true };
  },
  async approve(user, payload) {
    const result = await usersRepo.approve(user.companyId, payload.userId);
    return result.rows[0] || { ok: true };
  }
};
