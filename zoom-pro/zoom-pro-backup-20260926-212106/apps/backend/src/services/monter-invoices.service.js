import { query } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';

async function getUserRate(userId, companyId) {
  const result = await query(
    `SELECT "hourlyRate" FROM "UserPayrollRate"
     WHERE "userId" = $1 AND "companyId" = $2
       AND ("validTo" IS NULL OR "validTo" >= CURRENT_DATE)
     ORDER BY "validFrom" DESC LIMIT 1`,
    [userId, companyId]
  );
  return result.rows[0]?.hourlyRate ? Number(result.rows[0].hourlyRate) : null;
}

export const monterInvoicesService = {
  async createMonterInvoice(user, payload) {
    const hours = Number(payload.hoursWorked || 0);
    const rate = Number(payload.hourlyRate || (await getUserRate(user.id, user.companyId)) || 0);
    if (hours <= 0) throw new HttpError(400, 'Zadej odpracované hodiny.');
    if (rate <= 0) throw new HttpError(400, 'Nastav si hodinovou sazbu (Team → Sazba) nebo ji zadej.');
    const total = Math.round(hours * rate * 100) / 100;
    const result = await query(
      `INSERT INTO "Invoice"("companyId","projectId","monterUserId","invoiceKind",
                              "hoursWorked","hourlyRate","periodFrom","periodTo",
                              "totalAmount","currency","status","note")
       VALUES ($1,$2,$3,'MONTER_TIMESHEET',$4,$5,$6,$7,$8,$9,'DRAFT',$10)
       RETURNING *`,
      [
        user.companyId, payload.projectId || null, user.id,
        hours, rate, payload.periodFrom || null, payload.periodTo || null,
        total, payload.currency || 'CZK', payload.note || null,
      ]
    );
    return result.rows[0];
  },

  async submitForApproval(user, invoiceId) {
    const result = await query(
      `UPDATE "Invoice" SET status = 'SUBMITTED', "updatedAt" = NOW()
       WHERE id = $1 AND "monterUserId" = $2 AND "companyId" = $3
       RETURNING *`,
      [invoiceId, user.id, user.companyId]
    );
    if (!result.rows[0]) throw new HttpError(404, 'Faktura nenalezena.');
    return result.rows[0];
  },

  async approve(user, invoiceId) {
    if (!['VEDOUCI', 'ADMINISTRACE', 'REDITEL', 'SUPERADMIN'].includes(user.role)) {
      throw new HttpError(403, 'Schvalovat mohou jen vedoucí/účetní/ředitel.');
    }
    const result = await query(
      `UPDATE "Invoice" SET status = 'APPROVED', "approvedBy" = $1, "approvedAt" = NOW(),
                            "updatedAt" = NOW()
       WHERE id = $2 AND "companyId" = $3 AND "invoiceKind" = 'MONTER_TIMESHEET'
       RETURNING *`,
      [user.id, invoiceId, user.companyId]
    );
    if (!result.rows[0]) throw new HttpError(404, 'Faktura nenalezena.');
    return result.rows[0];
  },

  async listMyInvoices(user) {
    const result = await query(
      `SELECT * FROM "Invoice"
       WHERE "companyId" = $1 AND "monterUserId" = $2
       ORDER BY "createdAt" DESC`,
      [user.companyId, user.id]
    );
    return result.rows;
  },

  async listPending(user) {
    if (!['VEDOUCI', 'ADMINISTRACE', 'REDITEL', 'SUPERADMIN'].includes(user.role)) {
      throw new HttpError(403, 'Nemáš oprávnění.');
    }
    const result = await query(
      `SELECT i.*, u.name as "monterName" FROM "Invoice" i
       LEFT JOIN "User" u ON u.id = i."monterUserId"
       WHERE i."companyId" = $1 AND i."invoiceKind" = 'MONTER_TIMESHEET'
         AND i.status IN ('SUBMITTED','DRAFT')
       ORDER BY i."createdAt" DESC`,
      [user.companyId]
    );
    return result.rows;
  },

  async setRate(user, { userId, hourlyRate }) {
    if (!['VEDOUCI', 'ADMINISTRACE', 'REDITEL', 'SUPERADMIN'].includes(user.role)) {
      throw new HttpError(403, 'Sazbu nastavuje jen vedoucí/účetní/ředitel.');
    }
    const result = await query(
      `INSERT INTO "UserPayrollRate"("userId","companyId","hourlyRate")
       VALUES ($1,$2,$3) RETURNING *`,
      [userId, user.companyId, hourlyRate]
    );
    return result.rows[0];
  },
};
