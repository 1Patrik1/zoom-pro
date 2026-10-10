import bcrypt from 'bcryptjs';
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
  },

  // Každý uživatel si může změnit vlastní heslo (ověříme staré heslo)
  async changePassword(user, { currentPassword, newPassword }) {
    const { rows } = await usersRepo.getByIdWithPassword(user.id);
    const row = rows[0];
    if (!row) throw new HttpError(404, 'Uživatel nenalezen');
    const ok = await bcrypt.compare(String(currentPassword || ''), row.password || '');
    if (!ok) throw new HttpError(400, 'Aktuální heslo nesedí.');
    const hash = await bcrypt.hash(String(newPassword), 10);
    await usersRepo.updatePassword(user.id, hash);
    return { ok: true };
  },

  // Každý uživatel si může doplnit jméno a příjmení
  async updateProfile(user, { firstName, lastName }) {
    const result = await usersRepo.updateProfile(user.id, {
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
    });
    return result.rows[0];
  }
};
