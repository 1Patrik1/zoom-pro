import { query } from '../config/db.js';

export const syncRepo = {
  getCompany(companyId) {
    return query('SELECT * FROM "Company" WHERE id = $1', [companyId]);
  },
  getUsers(companyId) {
    return query('SELECT id, email, role, "isApproved", "createdAt" FROM "User" WHERE "companyId" = $1 ORDER BY "createdAt" ASC', [companyId]);
  },
  getProjects(companyId) {
    return query('SELECT * FROM "Project" WHERE "companyId" = $1 ORDER BY "createdAt" DESC', [companyId]);
  },
  getAssignments(companyId) {
    return query(
      `SELECT pa.*
       FROM "ProjectAssignment" pa
       JOIN "Project" p ON pa."projectId" = p.id
       WHERE p."companyId" = $1`,
      [companyId]
    );
  },
  getChats(companyId) {
    return query(
      `SELECT pc.*, u.email as "authorName"
       FROM "ProjectChat" pc
       JOIN "User" u ON pc."userId" = u.id
       WHERE pc."companyId" = $1
       ORDER BY pc."createdAt" ASC`,
      [companyId]
    );
  },
  getAttendance(companyId) {
    return query(
      `SELECT a.*, u.email, p.name as "projectName"
       FROM "Attendance" a
       JOIN "User" u ON a."userId" = u.id
       LEFT JOIN "Project" p ON a."projectId" = p.id
       WHERE a."companyId" = $1
       ORDER BY a."createdAt" DESC
       LIMIT 100`,
      [companyId]
    );
  },
  getLogs(companyId) {
    return query(
      `SELECT d.*, p.name as "projectName", u.email as "authorName"
       FROM "DailyLog" d
       LEFT JOIN "Project" p ON d."projectId" = p.id
       LEFT JOIN "User" u ON d."authorId" = u.id
       WHERE d."companyId" = $1
       ORDER BY d."createdAt" DESC`,
      [companyId]
    );
  },
  getInvoices(companyId) {
    return query('SELECT * FROM "Invoice" WHERE "companyId" = $1 ORDER BY "createdAt" DESC', [companyId]);
  },
  getComponents(companyId) {
    return query('SELECT * FROM "VztComponent" WHERE "companyId" = $1 ORDER BY "createdAt" DESC', [companyId]);
  },
  getConsumables(companyId) {
    return query('SELECT * FROM "ConsumablesSummary" WHERE "companyId" = $1', [companyId]);
  },
  getAllCompanies() {
    return query(
      `SELECT c.*, (
          SELECT email FROM "User" u
          WHERE u."companyId" = c.id
          ORDER BY u."createdAt" ASC
          LIMIT 1
       ) as owner
       FROM "Company" c
       ORDER BY c."createdAt" DESC`
    );
  }
};
