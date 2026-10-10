import { query } from '../config/db.js';

export const saasRepo = {
  toggleCompany(companyId) {
    return query('UPDATE "Company" SET "isActive" = NOT "isActive", "updatedAt" = NOW() WHERE id = $1 RETURNING *', [companyId]);
  }
};
