import { query } from '../config/db.js';

export const signaturesRepo = {
  listProviders(companyId) {
    return query('SELECT * FROM "SignatureProvider" WHERE "companyId" = $1 ORDER BY "isDefault" DESC, name ASC', [companyId]);
  },
  listRequests(companyId) {
    return query(
      `SELECT sr.*, sp.name AS "providerName", d.title AS "documentTitle", u.email AS "signerUserEmail"
       FROM "SignatureRequest" sr
       JOIN "SignatureProvider" sp ON sp.id = sr."providerId" AND sp."companyId" = sr."companyId"
       LEFT JOIN "Document" d ON d.id = sr."documentId" AND d."companyId" = sr."companyId"
       LEFT JOIN "User" u ON u.id = sr."signerId" AND u."companyId" = sr."companyId"
       WHERE sr."companyId" = $1
       ORDER BY sr."createdAt" DESC`,
      [companyId]
    );
  },
  validateRequestReferences(companyId, { providerId, documentId, signerId }) {
    return query(
      `SELECT
         EXISTS(SELECT 1 FROM "SignatureProvider" WHERE id=$2 AND "companyId"=$1) AS "providerExists",
         ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM "Document" WHERE id=$3 AND "companyId"=$1)) AS "documentExists",
         ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM "User" WHERE id=$4 AND "companyId"=$1)) AS "signerExists"`,
      [companyId, providerId, documentId || null, signerId || null]
    );
  },
  createRequest(payload) {
    return query(
      `INSERT INTO "SignatureRequest" (id, "companyId", "documentId", "providerId", "signerId", "signerEmail", "signerName", "signatureLevel", status, "expiresAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::signature_level_enum, 'PENDING', $8, NOW(), NOW()) RETURNING *`,
      [payload.companyId, payload.documentId || null, payload.providerId, payload.signerId, payload.signerEmail || null, payload.signerName, payload.signatureLevel, payload.expiresAt || null]
    );
  }
};
