import { query } from '../config/db.js';

export const documentsRepo = {
  list(companyId, filters = {}) {
    const clauses = ['"companyId" = $1'];
    const params = [companyId];
    if (filters.status) {
      params.push(filters.status);
      clauses.push(`status = $${params.length}::document_status_enum`);
    }
    if (filters.documentType) {
      params.push(filters.documentType);
      clauses.push(`"documentType" = $${params.length}::document_type_enum`);
    }
    return query(`SELECT * FROM "Document" WHERE ${clauses.join(' AND ')} ORDER BY "createdAt" DESC`, params);
  },
  get(companyId, id) {
    return query('SELECT * FROM "Document" WHERE "companyId" = $1 AND id = $2', [companyId, id]);
  },
  validateCreateReferences(companyId, { templateId, projectId, invoiceId }) {
    return query(
      `SELECT
         ($2::uuid IS NULL OR EXISTS(SELECT 1 FROM "DocumentTemplate" WHERE id=$2 AND "companyId"=$1)) AS "templateExists",
         ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM "Project" WHERE id=$3 AND "companyId"=$1)) AS "projectExists",
         ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM "Invoice" WHERE id=$4 AND "companyId"=$1)) AS "invoiceExists"`,
      [companyId, templateId || null, projectId || null, invoiceId || null]
    );
  },
  create(payload) {
    return query(
      `INSERT INTO "Document" (id, "companyId", "documentType", status, "templateId", "projectId", "invoiceId", "authorId", locale, title, "dataJson", note, attachments, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2::document_type_enum, $3::document_status_enum, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12::text[], NOW(), NOW()) RETURNING *`,
      [payload.companyId, payload.documentType, payload.status || 'DRAFT', payload.templateId || null, payload.projectId || null, payload.invoiceId || null, payload.authorId, payload.locale || 'cs', payload.title, JSON.stringify(payload.dataJson || {}), payload.note || null, payload.attachments || []]
    );
  },
  approve(companyId, id, approverId) {
    return query('UPDATE "Document" SET status = $3::document_status_enum, "approverId" = $4, "updatedAt" = NOW() WHERE "companyId" = $1 AND id = $2 RETURNING *', [companyId, id, 'APPROVED', approverId]);
  }
};
