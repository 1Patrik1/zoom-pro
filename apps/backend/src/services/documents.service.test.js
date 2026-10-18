import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/documents.repo.js', () => ({
  documentsRepo: {
    list: vi.fn(),
    get: vi.fn(),
    validateCreateReferences: vi.fn(),
    create: vi.fn(),
    approve: vi.fn()
  }
}));

import { documentsRepo } from '../repositories/documents.repo.js';
import { documentsService } from './documents.service.js';

describe('document tenant reference validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects references that do not belong to the current company', async () => {
    documentsRepo.validateCreateReferences.mockResolvedValue({
      rows: [{ templateExists: true, projectExists: false, invoiceExists: true }]
    });

    await expect(documentsService.create('company-a', 'user-a', {
      title: 'Test document',
      documentType: 'SERVICE_REPORT',
      projectId: 'project-b'
    })).rejects.toMatchObject({ status: 404 });

    expect(documentsRepo.create).not.toHaveBeenCalled();
  });

  it('creates a document after validating all tenant references', async () => {
    documentsRepo.validateCreateReferences.mockResolvedValue({
      rows: [{ templateExists: true, projectExists: true, invoiceExists: true }]
    });
    documentsRepo.create.mockResolvedValue({ rows: [{ id: 'document-a', companyId: 'company-a', dataJson: {} }] });

    const result = await documentsService.create('company-a', 'user-a', {
      title: 'Test document',
      documentType: 'SERVICE_REPORT',
      projectId: 'project-a'
    });

    expect(result.id).toBe('document-a');
    expect(documentsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-a',
      authorId: 'user-a',
      projectId: 'project-a'
    }));
  });
});
