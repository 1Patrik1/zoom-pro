import { query } from '../config/db.js';
import { syncRepo } from '../repositories/sync.repo.js';

// Delta-sync: mapování kolekce -> SQL s WHERE "updatedAt" > $since (bez limitů, ale jen změněné řádky)
const DELTA_QUERIES = {
  projects: 'SELECT * FROM "Project" WHERE "companyId" = $1 AND "updatedAt" > $2 ORDER BY "updatedAt" DESC',
  attendance: `SELECT a.*, u.email, u."firstName", u."lastName",
    COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) as "userName",
    p.name as "projectName"
    FROM "Attendance" a JOIN "User" u ON u.id = a."userId"
    LEFT JOIN "Project" p ON p.id = a."projectId"
    WHERE a."companyId" = $1 AND a."updatedAt" > $2 ORDER BY a."updatedAt" DESC LIMIT 500`,
  logs: `SELECT d.*, p.name as "projectName",
    COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) as "authorName"
    FROM "DailyLog" d LEFT JOIN "Project" p ON p.id = d."projectId"
    LEFT JOIN "User" u ON u.id = d."authorId"
    WHERE d."companyId" = $1 AND d."updatedAt" > $2 ORDER BY d."updatedAt" DESC LIMIT 500`,
  invoices: 'SELECT * FROM "Invoice" WHERE "companyId" = $1 AND "updatedAt" > $2 ORDER BY "updatedAt" DESC LIMIT 500',
  inventoryItems: 'SELECT * FROM "InventoryItem" WHERE "companyId" = $1 AND "updatedAt" > $2 ORDER BY "updatedAt" DESC LIMIT 1000',
  inventoryMovements: `SELECT m.*, i.name as "itemName", i.code as "itemCode", p.name as "projectName",
    COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) as "authorName"
    FROM "InventoryMovement" m JOIN "InventoryItem" i ON i.id = m."itemId"
    LEFT JOIN "Project" p ON p.id = m."projectId" LEFT JOIN "User" u ON u.id = m."createdBy"
    WHERE m."companyId" = $1 AND m."createdAt" > $2 ORDER BY m."createdAt" DESC LIMIT 500`,
  collisions: `SELECT ca.*, p.name as "projectName", u.email as "userEmail",
    COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) as "userName",
    i.name as "itemName" FROM "CollisionAlert" ca LEFT JOIN "Project" p ON p.id = ca."projectId"
    LEFT JOIN "User" u ON u.id = ca."userId" LEFT JOIN "InventoryItem" i ON i.id = ca."itemId"
    WHERE ca."companyId" = $1 AND ca."updatedAt" > $2 ORDER BY ca."updatedAt" DESC LIMIT 500`,
  troubleshooting: `SELECT pt.*, p.name as "projectName", u.email as "authorEmail",
    COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) as "authorName"
    FROM "ProjectTroubleshooting" pt JOIN "Project" p ON p.id = pt."projectId"
    JOIN "User" u ON u.id = pt."userId"
    WHERE pt."companyId" = $1 AND pt."updatedAt" > $2 ORDER BY pt."updatedAt" DESC LIMIT 200`,
  chats: `SELECT pc.*,
    COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) as "authorName",
    p.name as "projectName" FROM "ProjectChat" pc JOIN "User" u ON u.id = pc."userId"
    JOIN "Project" p ON p.id = pc."projectId"
    WHERE pc."companyId" = $1 AND pc."createdAt" > $2 ORDER BY pc."createdAt" DESC LIMIT 500`,
  projectGallery: `SELECT gi.*,
    COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', NULLIF(u."firstName", ''), NULLIF(u."lastName", ''))), ''), u.email) as "authorName",
    p.name as "projectName" FROM "ProjectGalleryItem" gi JOIN "User" u ON u.id = gi."userId"
    JOIN "Project" p ON p.id = gi."projectId"
    WHERE gi."companyId" = $1 AND gi."createdAt" > $2 ORDER BY gi."createdAt" DESC LIMIT 500`,
  users: 'SELECT id, email, role, "isApproved", "firstName", "lastName", phone, "employmentType", ico, dic, street, city, zip, "updatedAt" FROM "User" WHERE "companyId" = $1 AND "updatedAt" > $2',
};


export const syncService = {
  async getFullSync(user) {
    const cid = user.companyId;
    const [
      company,
      users,
      projects,
      assignments,
      chats,
      projectGallery,
      attendance,
      logs,
      invoices,
      inventoryItems,
      inventoryMovements,
      collisions,
      troubleshooting,
      components,
      consumables,
      allCompanies
    ] = await Promise.all([
      syncRepo.getCompany(cid),
      syncRepo.getUsers(cid),
      syncRepo.getProjects(cid),
      syncRepo.getAssignments(cid),
      syncRepo.getChats(cid),
      syncRepo.getProjectGallery(cid),
      syncRepo.getAttendance(cid),
      syncRepo.getLogs(cid),
      syncRepo.getInvoices(cid),
      syncRepo.getInventoryItems(cid),
      syncRepo.getInventoryMovements(cid),
      syncRepo.getCollisions(cid),
      syncRepo.getTroubleshooting(cid),
      syncRepo.getComponents(cid),
      syncRepo.getConsumables(cid),
      user.role === 'SUPERADMIN' ? syncRepo.getAllCompanies() : Promise.resolve({ rows: [] })
    ]);

    return {
      company: company.rows[0] || null,
      users: users.rows,
      projects: projects.rows,
      assignments: assignments.rows,
      chats: chats.rows,
      projectGallery: projectGallery.rows,
      attendance: attendance.rows,
      logs: logs.rows,
      invoices: invoices.rows,
      inventoryItems: inventoryItems.rows,
      inventoryMovements: inventoryMovements.rows,
      collisions: collisions.rows,
      troubleshooting: troubleshooting.rows,
      components: components.rows,
      consumables: consumables.rows[0] || null,
      allCompanies: allCompanies.rows
    };
  },

  // Delta-sync: vrátí jen kolekce s řádky změněnými od `since` + nový server timestamp.
  // Frontend tak může pollovat každých 5 s s minimální zátěží (menší payload, méně SQL).
  async getDeltaSync(user, since) {
    const cid = user.companyId;
    const changed = {};
    const touched = [];
    for (const [key, sql] of Object.entries(DELTA_QUERIES)) {
      try {
        const r = await query(sql, [cid, since]);
        if (r.rows.length) {
          changed[key] = r.rows;
          touched.push(key);
        }
      } catch { /* kolekce bez delta tabulky — přeskočit, full-sync ji pokryje */ }
    }
    // aktuální server čas pro synchronizaci hodin a další delta dotaz
    const nowR = await query('SELECT NOW() AS ts');
    return { delta: true, since: since, changed, touched, serverTime: nowR.rows[0]?.ts };
  }
};
