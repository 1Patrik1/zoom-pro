import { settingsRepo } from '../repositories/settings.repo.js';
import { HttpError } from '../utils/http-error.js';

export const settingsService = {
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
