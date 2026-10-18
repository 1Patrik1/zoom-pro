import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/signatures.repo.js', () => ({
  signaturesRepo: {
    listProviders: vi.fn(),
    listRequests: vi.fn(),
    validateRequestReferences: vi.fn(),
    createRequest: vi.fn()
  }
}));

import { signaturesRepo } from '../repositories/signatures.repo.js';
import { signaturesService } from './signatures.service.js';

describe('signature request tenant isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a provider, document or signer from another company', async () => {
    signaturesRepo.validateRequestReferences.mockResolvedValue({
      rows: [{ providerExists: true, documentExists: false, signerExists: true }]
    });

    await expect(signaturesService.createRequest('company-a', 'user-a', {
      providerId: 'provider-a',
      documentId: 'document-b',
      signerId: 'user-a',
      signerName: 'A'
    })).rejects.toMatchObject({ status: 404 });

    expect(signaturesRepo.createRequest).not.toHaveBeenCalled();
  });

  it('creates a request after all references are validated for the company', async () => {
    signaturesRepo.validateRequestReferences.mockResolvedValue({
      rows: [{ providerExists: true, documentExists: true, signerExists: true }]
    });
    const request = { id: 'request-a', companyId: 'company-a' };
    signaturesRepo.createRequest.mockResolvedValue({ rows: [request] });

    await expect(signaturesService.createRequest('company-a', 'user-a', {
      providerId: 'provider-a',
      documentId: 'document-a',
      signerId: 'user-a',
      signerName: 'A',
      signatureLevel: 'SIMPLE'
    })).resolves.toEqual(request);

    expect(signaturesRepo.createRequest).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-a',
      signerId: 'user-a'
    }));
  });
});
