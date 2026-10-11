import { query } from '../config/db.js';

export const supportRepo = {
  listMessages(companyId) {
    return query(
      `SELECT sm.id, sm."companyId", sm."userId", sm.text, sm."createdAt",
              sm."requestType", sm."requestDetails", sm."handledAt", sm."handledBy",
              COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) AS "authorName",
              u.email AS "authorEmail", u.role AS "authorRole", c.name AS "companyName"
         FROM "SupportMessage" sm
         JOIN "User" u ON u.id = sm."userId"
         JOIN "Company" c ON c.id = sm."companyId"
        WHERE sm."companyId" = $1
        ORDER BY sm."createdAt" ASC
        LIMIT 1000`,
      [companyId]
    );
  },

  createMessage({ companyId, userId, text, requestType = null, requestDetails = {} }) {
    return query(
      `INSERT INTO "SupportMessage" ("companyId", "userId", text, "requestType", "requestDetails")
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, "companyId", "userId", text, "createdAt"`,
      [companyId, userId, text, requestType, JSON.stringify(requestDetails)]
    );
  },

  listOpenLicenseRequests() {
    return query(
      `SELECT sm.id, sm."companyId", sm."userId", sm.text, sm."createdAt", sm."requestDetails",
              COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) AS "authorName",
              u.email AS "authorEmail", c.name AS "companyName"
         FROM "SupportMessage" sm
         JOIN "User" u ON u.id = sm."userId"
         JOIN "Company" c ON c.id = sm."companyId"
        WHERE sm."requestType" = 'LICENSE_REQUEST' AND sm."handledAt" IS NULL
        ORDER BY sm."createdAt" ASC
        LIMIT 500`
    );
  },

  resolveLicenseRequest(requestId, userId) {
    return query(
      `UPDATE "SupportMessage" SET "handledAt" = NOW(), "handledBy" = $2
        WHERE id = $1 AND "requestType" = 'LICENSE_REQUEST' AND "handledAt" IS NULL
        RETURNING id, "companyId"`,
      [requestId, userId]
    );
  }
};
