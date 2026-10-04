import { query } from '../config/db.js';

export const usersRepo = {
  updateRole(companyId, userId, role) {
    return query('UPDATE "User" SET role = $1::role_enum, "updatedAt" = NOW() WHERE id = $2 AND "companyId" = $3 RETURNING id, email, role, "isApproved"', [role, userId, companyId]);
  },
  approve(companyId, userId) {
    return query('UPDATE "User" SET "isApproved" = true, "updatedAt" = NOW() WHERE id = $1 AND "companyId" = $2 RETURNING id, email, role, "isApproved"', [userId, companyId]);
  },
  getByIdWithPassword(userId) {
    return query('SELECT id, email, password, "firstName", "lastName" FROM "User" WHERE id = $1', [userId]);
  },
  updatePassword(userId, passwordHash) {
    return query('UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, email', [passwordHash, userId]);
  },
  updateProfile(userId, { firstName, lastName }) {
    return query(
      'UPDATE "User" SET "firstName" = $1, "lastName" = $2, "updatedAt" = NOW() WHERE id = $3 RETURNING id, email, role, "firstName", "lastName"',
      [firstName || null, lastName || null, userId]
    );
  }
};
