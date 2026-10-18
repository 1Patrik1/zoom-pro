import bcrypt from 'bcryptjs';
import { usersRepo } from '../repositories/users.repo.js';
import { HttpError } from '../utils/http-error.js';

export const usersService = {
  async updateRole(user, payload) {
    if (!['SUPERADMIN', 'REDITEL'].includes(user.role)) throw new HttpError(403, 'Nemáte oprávnění měnit role');
    // SUPERADMIN is a platform-wide privilege and must never be assignable through company team management.
    if (payload.role === 'SUPERADMIN') throw new HttpError(403, 'Roli SUPERADMIN nelze přidělit přes správu členů firmy.');
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
  async updateProfile(user, { email, phone, firstName, lastName, employmentType, ico, dic, street, city, zip }) {
    const nextEmail = String(email || user.email).trim().toLowerCase();
    if (!nextEmail || !nextEmail.includes('@')) throw new HttpError(400, 'Zadejte platný e-mail.');
    const duplicate = await usersRepo.emailInUse(nextEmail, user.id);
    if (duplicate.length) throw new HttpError(409, 'Tento e-mail už používá jiný účet.');
    try {
      const result = await usersRepo.updateProfile(user.id, {
      email: nextEmail,
      phone: phone?.trim() || null,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      employmentType: employmentType === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
      ico: employmentType === 'EXTERNAL' ? ico?.trim() || null : null,
      dic: employmentType === 'EXTERNAL' ? dic?.trim() || null : null,
      street: employmentType === 'EXTERNAL' ? street?.trim() || null : null,
      city: employmentType === 'EXTERNAL' ? city?.trim() || null : null,
      zip: employmentType === 'EXTERNAL' ? zip?.trim() || null : null,
      });
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'Tento e-mail už používá jiný účet.');
      throw error;
    }
  }
};
