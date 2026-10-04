import { query, withTransaction } from '../config/db.js';

export const authRepo = {
  findByEmail(email) {
    return query(
      `SELECT u.*, c."isActive" as "compActive"
       FROM "User" u
       JOIN "Company" c ON u."companyId" = c.id
       WHERE u.email = $1`,
      [email]
    );
  },
  findById(id) {
    return query('SELECT * FROM "User" WHERE id = $1', [id]);
  },
  findCompanyById(id) {
    return query('SELECT * FROM "Company" WHERE id = $1', [id]);
  },
  async createCompanyAndOwner({ companyName, email, passwordHash }) {
    return withTransaction(async (client) => {
      const company = await client.query(
        'INSERT INTO "Company" (id, name, "isActive") VALUES (gen_random_uuid(), $1, false) RETURNING *',
        [companyName]
      );
      const user = await client.query(
        `INSERT INTO "User" (id, email, password, role, "isApproved", "companyId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'REDITEL', true, $3, NOW(), NOW()) RETURNING *`,
        [email, passwordHash, company.rows[0].id]
      );
      await client.query(
        'INSERT INTO "ConsumablesSummary" (id, "companyId", "updatedAt") VALUES (gen_random_uuid(), $1, NOW()) ON CONFLICT ("companyId") DO NOTHING',
        [company.rows[0].id]
      );
      return { company: company.rows[0], user: user.rows[0] };
    });
  },
  createJoinUser({ email, passwordHash, companyId }) {
    return query(
      `INSERT INTO "User" (id, email, password, role, "isApproved", "companyId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'MONTER', false, $3, NOW(), NOW()) RETURNING *`,
      [email, passwordHash, companyId]
    );
  }
};
