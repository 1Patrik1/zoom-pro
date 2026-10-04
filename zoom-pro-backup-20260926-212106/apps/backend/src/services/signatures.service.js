import { signaturesRepo } from '../repositories/signatures.repo.js';

export const signaturesService = {
  async listProviders(companyId) {
    const result = await signaturesRepo.listProviders(companyId);
    return result.rows;
  },
  async listRequests(companyId) {
    const result = await signaturesRepo.listRequests(companyId);
    return result.rows;
  },
  async createRequest(companyId, requesterUserId, payload) {
    const result = await signaturesRepo.createRequest({
      ...payload,
      companyId,
      signerId: payload.signerId || requesterUserId
    });
    return result.rows[0];
  }
};
