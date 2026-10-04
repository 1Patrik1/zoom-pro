import { query } from '../config/db.js';

export const invoicesRepo = {
  create({ companyId, invoiceNumber, amount }) {
    return query(
      `INSERT INTO "Invoice" (id, "companyId", "invoiceNumber", amount, status, "issuedAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'ISSUED', NOW(), NOW(), NOW()) RETURNING *`,
      [companyId, invoiceNumber, amount]
    );
  },
  markPaid({ companyId, id }) {
    return query(
      `UPDATE "Invoice"
       SET status = 'ZAPLACENO', "paidAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "companyId" = $2
       RETURNING *`,
      [id, companyId]
    );
  }
};
