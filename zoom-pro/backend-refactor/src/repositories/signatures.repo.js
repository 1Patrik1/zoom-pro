import { query } from '../config/db.js';

export const signaturesRepo = {
  listProviders(companyId) {
    return query('SELECT * FROM "SignatureProvider" WHERE "companyId" = $1 ORDER BY "isDefault" DESC, name ASC', [companyId]);
  },
  createRequest(payload) {
    return query(
      `INSERT INTO "SignatureRequest" (id, "companyId", "documentId", "providerId", "signerId", "signerEmail", "signerName", "signatureLevel", status, "expiresAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::signature_level_enum, 'PENDING', $8, NOW(), NOW()) RETURNING *`,
      [payload.companyId, payload.documentId || null, payload.providerId, payload.signerId, payload.signerEmail || null, payload.signerName, payload.signatureLevel, payload.expiresAt || null]
    );
  }
};
