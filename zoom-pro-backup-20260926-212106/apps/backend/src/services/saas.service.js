import { saasRepo } from '../repositories/saas.repo.js';
import { HttpError } from '../utils/http-error.js';

export const saasService = {
  async toggle(user, payload) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Jen SUPERADMIN může měnit licence');
    const result = await saasRepo.toggleCompany(payload.companyId);
    return result.rows[0];
  }
};
