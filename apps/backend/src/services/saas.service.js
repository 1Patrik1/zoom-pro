import { saasRepo } from '../repositories/saas.repo.js';
import { HttpError } from '../utils/http-error.js';

export const saasService = {
  async toggle(user, payload) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Jen SUPERADMIN může měnit licence');
    const result = await saasRepo.toggleCompany(payload.companyId);
    return result.rows[0];
  },

  async listCompanies(user) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Jen SUPERADMIN může spravovat firmy.');
    return saasRepo.listCompanies();
  },

  async setCompanyActive(user, payload) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Jen SUPERADMIN může schvalovat firmy.');
    if (!payload?.companyId) throw new HttpError(400, 'Chybí companyId.');
    const rows = await saasRepo.setCompanyActive(payload.companyId, payload.active !== false);
    if (!rows.rows.length) throw new HttpError(404, 'Firma nenalezena.');
    return rows.rows[0];
  }
};
