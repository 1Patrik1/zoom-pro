import { query } from '../config/db.js';

export const usersRepo = {
  updateRole(companyId, userId, role) {
    return query('UPDATE "User" SET role = $1::role_enum, "updatedAt" = NOW() WHERE id = $2 AND "companyId" = $3 RETURNING id, email, role, "isApproved"', [role, userId, companyId]);
  },
  approve(companyId, userId) {
    return query('UPDATE "User" SET "isApproved" = true, "updatedAt" = NOW() WHERE id = $1 AND "companyId" = $2 RETURNING id, email, role, "isApproved"', [userId, companyId]);
  }
};
