import { settingsRepo } from '../repositories/settings.repo.js';
import { HttpError } from '../utils/http-error.js';

export const settingsService = {
  async updateCompanyContact(user, { email, phone }) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() || null : null;
    const normalizedPhone = typeof phone === 'string' ? phone.trim() || null : null;
    const result = await settingsRepo.updateCompanyContact({ companyId: user.companyId, email: normalizedEmail, phone: normalizedPhone });
    if (!result.rows[0]) throw new HttpError(404, 'Firma nenalezena.');
    return result.rows[0];
  },
  async updateCompanyProfile(user, payload) {
    const result = await settingsRepo.updateCompanyProfile({
      companyId: user.companyId,
      name: payload.name.trim(),
      ico: payload.ico?.trim() || null,
      dic: payload.dic?.trim() || null,
      street: payload.street?.trim() || null,
      city: payload.city?.trim() || null,
      zip: payload.zip?.trim() || null,
      country: payload.country?.trim().toUpperCase() || 'CZ',
      email: payload.email?.trim().toLowerCase() || null,
      phone: payload.phone?.trim() || null
    });
    if (!result.rows[0]) throw new HttpError(404, 'Firma nenalezena.');
    return result.rows[0];
  },
  async updatePricing(user, payload) {
    const result = await settingsRepo.updatePricing({ companyId: user.companyId, cost: payload.cost, sell: payload.sell });
    return result.rows[0];
  },
  async getCompanySettings(companyId) {
    const result = await settingsRepo.getCompanySettings(companyId);
    return result.rows[0] || null;
  },
  async getModuleSettings(companyId, moduleKey) {
    const result = await settingsRepo.getModuleSettings(companyId, moduleKey);
    return result.rows[0] || null;
  },
  async upsertModuleSettings(companyId, moduleKey, settingsJson, updatedBy) {
    if (!settingsJson || typeof settingsJson !== 'object') throw new HttpError(400, 'settingsJson musí být objekt');
    const result = await settingsRepo.upsertModuleSettings(companyId, moduleKey, settingsJson, updatedBy);
    return result.rows[0];
  }
};
