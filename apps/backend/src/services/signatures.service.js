import { signaturesRepo } from '../repositories/signatures.repo.js';
import { HttpError } from '../utils/http-error.js';

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
    const signerId = payload.signerId || requesterUserId;
    const references = await signaturesRepo.validateRequestReferences(companyId, {
      providerId: payload.providerId,
      documentId: payload.documentId || null,
      signerId: signerId || null
    });
    const valid = references.rows[0];
    if (!valid?.providerExists || !valid?.documentExists || !valid?.signerExists) {
      throw new HttpError(404, 'Poskytovatel, dokument nebo podepisující nebyl nalezen ve vaší firmě.');
    }
    const result = await signaturesRepo.createRequest({
      ...payload,
      companyId,
      signerId
    });
    return result.rows[0];
  }
};
