import { query } from '../config/db.js';

export const saasRepo = {
  toggleCompany(companyId) {
    return query('UPDATE "Company" SET "isActive" = NOT "isActive", "updatedAt" = NOW() WHERE id = $1 RETURNING *', [companyId]);
  },

  listCompanies() {
    return query(
      `SELECT c.*,
              (SELECT email FROM "User" WHERE "companyId" = c.id ORDER BY "createdAt" ASC LIMIT 1) AS "ownerEmail",
              (SELECT COUNT(*)::int FROM "User" WHERE "companyId" = c.id) AS "userCount"
         FROM "Company" c
        ORDER BY c."createdAt" DESC
        LIMIT 500`
    );
  },

  setCompanyActive(companyId, active) {
    return query(
      'UPDATE "Company" SET "isActive" = $2, "updatedAt" = NOW() WHERE id = $1 RETURNING *',
      [companyId, !!active]
    );
  }
};
