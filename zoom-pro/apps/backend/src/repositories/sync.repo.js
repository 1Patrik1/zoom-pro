import { query } from '../config/db.js';

export const syncRepo = {
  getCompany(companyId) {
    return query('SELECT * FROM "Company" WHERE id = $1', [companyId]);
  },
  getUsers(companyId) {
    return query('SELECT id, email, role, "isApproved", "firstName", "lastName", "createdAt" FROM "User" WHERE "companyId" = $1 ORDER BY "createdAt" ASC', [companyId]);
  },
  getProjects(companyId) {
    return query('SELECT * FROM "Project" WHERE "companyId" = $1 ORDER BY "updatedAt" DESC, "createdAt" DESC', [companyId]);
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
      `SELECT pc.*, u.email as "authorName", p.name as "projectName"
       FROM "ProjectChat" pc
       JOIN "User" u ON pc."userId" = u.id
       JOIN "Project" p ON pc."projectId" = p.id
       WHERE pc."companyId" = $1
       ORDER BY pc."createdAt" ASC`,
      [companyId]
    );
  },
  getProjectGallery(companyId) {
    return query(
      `SELECT gi.*, u.email as "authorName", p.name as "projectName"
       FROM "ProjectGalleryItem" gi
       JOIN "User" u ON gi."userId" = u.id
       JOIN "Project" p ON gi."projectId" = p.id
       WHERE gi."companyId" = $1
       ORDER BY gi."createdAt" DESC`,
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
  getInventoryItems(companyId) {
    return query('SELECT * FROM "InventoryItem" WHERE "companyId" = $1 ORDER BY "updatedAt" DESC, "createdAt" DESC', [companyId]);
  },
  getInventoryMovements(companyId) {
    return query(
      `SELECT m.*, i.name as "itemName", i.code as "itemCode", p.name as "projectName", u.email as "authorName"
       FROM "InventoryMovement" m
       JOIN "InventoryItem" i ON m."itemId" = i.id
       LEFT JOIN "Project" p ON m."projectId" = p.id
       LEFT JOIN "User" u ON m."createdBy" = u.id
       WHERE m."companyId" = $1
       ORDER BY m."createdAt" DESC
       LIMIT 200`,
      [companyId]
    );
  },
  getComponents(companyId) {
    return query('SELECT * FROM "VztComponent" WHERE "companyId" = $1 ORDER BY "createdAt" DESC', [companyId]);
  },
  getConsumables(companyId) {
    return query('SELECT * FROM "ConsumablesSummary" WHERE "companyId" = $1', [companyId]);
  },
  getCollisions(companyId) {
    return query(
      `SELECT ca.*, p.name as "projectName", u.email as "userEmail", i.name as "itemName"
       FROM "CollisionAlert" ca
       LEFT JOIN "Project" p ON ca."projectId" = p.id
       LEFT JOIN "User" u ON ca."userId" = u.id
       LEFT JOIN "InventoryItem" i ON ca."itemId" = i.id
       WHERE ca."companyId" = $1
       ORDER BY ca."createdAt" DESC
       LIMIT 200`,
      [companyId]
    );
  },
  getTroubleshooting(companyId) {
    return query(
      `SELECT pt.*, u.email as "authorEmail", p.name as "projectName"
       FROM "ProjectTroubleshooting" pt
       JOIN "User" u ON pt."userId" = u.id
       JOIN "Project" p ON pt."projectId" = p.id
       WHERE pt."companyId" = $1
       ORDER BY pt."createdAt" DESC
       LIMIT 200`,
      [companyId]
    );
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
