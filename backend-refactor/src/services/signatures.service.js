import { signaturesRepo } from '../repositories/signatures.repo.js';

export const signaturesService = {
  async listProviders(companyId) {
    const result = await signaturesRepo.listProviders(companyId);
    return result.rows;
  },
  async createRequest(companyId, payload) {
    const result = await signaturesRepo.createRequest({ ...payload, companyId });
    return result.rows[0];
  }
};
