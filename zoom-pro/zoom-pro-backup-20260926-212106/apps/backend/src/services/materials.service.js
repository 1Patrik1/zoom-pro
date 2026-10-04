import { materialsRepo } from '../repositories/materials.repo.js';
import { HttpError } from '../utils/http-error.js';

export const materialsService = {
  async search(user, q) {
    const res = await materialsRepo.search(user.companyId, q || '');
    return res.rows || [];
  },

  async list(user) {
    const res = await materialsRepo.list(user.companyId);
    return res.rows || [];
  },

  async create(user, payload) {
    const res = await materialsRepo.create(user.companyId, payload);
    return res.rows[0];
  },

  async seed(user, items) {
    // basic permission check: only superadmin or company admin
    if (!user || (user.role !== 'SUPERADMIN' && !user.isAdmin && user.role !== 'ADMINISTRACE')) {
      throw new HttpError(403, 'Pøístup odepøen');
    }
    return materialsRepo.seed(items || []);
  }
};
