import crypto from 'crypto';
import { documentsRepo } from '../repositories/documents.repo.js';
import { HttpError } from '../utils/http-error.js';

export const documentsService = {
  async list(companyId, filters) {
    const result = await documentsRepo.list(companyId, filters);
    return result.rows;
  },
  async get(companyId, id) {
    const result = await documentsRepo.get(companyId, id);
    if (!result.rows.length) throw new HttpError(404, 'Dokument nenalezen');
    return result.rows[0];
  },
  async create(companyId, authorId, payload) {
    const references = await documentsRepo.validateCreateReferences(companyId, {
      templateId: payload.templateId || null,
      projectId: payload.projectId || null,
      invoiceId: payload.invoiceId || null
    });
    const valid = references.rows[0];
    if (!valid?.templateExists || !valid?.projectExists || !valid?.invoiceExists) {
      throw new HttpError(404, 'Šablona, projekt nebo faktura nebyly nalezeny ve vaší firmě.');
    }
    const result = await documentsRepo.create({ ...payload, companyId, authorId });
    const doc = result.rows[0];
    return {
      ...doc,
      hashPreview: crypto.createHash('sha256').update(JSON.stringify(doc.dataJson || {})).digest('hex')
    };
  },
  async approve(companyId, id, approverId) {
    const result = await documentsRepo.approve(companyId, id, approverId);
    if (!result.rows.length) throw new HttpError(404, 'Dokument nenalezen');
    return result.rows[0];
  }
};
