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
  emailInUse(email, userId) {
    return query('SELECT id FROM "User" WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1', [email, userId]);
  },
  updatePassword(userId, passwordHash) {
    return query('UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, email', [passwordHash, userId]);
  },
  updateProfile(userId, { email, phone, firstName, lastName, employmentType, ico, dic, street, city, zip }) {
    return query(
      'UPDATE "User" SET email = $1, phone = $2, "firstName" = $3, "lastName" = $4, "employmentType" = $5, ico = $6, dic = $7, street = $8, city = $9, zip = $10, "updatedAt" = NOW() WHERE id = $11 RETURNING id, email, role, phone, "firstName", "lastName", "employmentType", ico, dic, street, city, zip',
      [email, phone || null, firstName || null, lastName || null, employmentType || 'INTERNAL', ico || null, dic || null, street || null, city || null, zip || null, userId]
    );
  }
};
