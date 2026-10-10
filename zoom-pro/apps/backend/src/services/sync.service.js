import { query } from '../config/db.js';
import { syncRepo } from '../repositories/sync.repo.js';

// Delta-sync: mapování kolekce -> SQL s WHERE "updatedAt" > $since (bez limitů, ale jen změněné řádky)
const DELTA_QUERIES = {
  projects: 'SELECT * FROM "Project" WHERE "companyId" = $1 AND "updatedAt" > $2 ORDER BY "updatedAt" DESC',
  attendance: `SELECT a.* FROM "Attendance" a WHERE a."companyId" = $1 AND a."updatedAt" > $2 ORDER BY a."updatedAt" DESC LIMIT 500`,
  logs: `SELECT d.* FROM "DailyLog" d WHERE d."companyId" = $1 AND d."updatedAt" > $2 ORDER BY d."updatedAt" DESC LIMIT 500`,
  invoices: 'SELECT * FROM "Invoice" WHERE "companyId" = $1 AND "updatedAt" > $2 ORDER BY "updatedAt" DESC LIMIT 500',
  inventoryItems: 'SELECT * FROM "InventoryItem" WHERE "companyId" = $1 AND "updatedAt" > $2 ORDER BY "updatedAt" DESC LIMIT 1000',
  inventoryMovements: `SELECT m.* FROM "InventoryMovement" m WHERE m."companyId" = $1 AND m."createdAt" > $2 ORDER BY m."createdAt" DESC LIMIT 500`,
  collisions: `SELECT ca.* FROM "CollisionAlert" ca WHERE ca."companyId" = $1 AND ca."updatedAt" > $2 ORDER BY ca."updatedAt" DESC LIMIT 500`,
  troubleshooting: `SELECT trb.* FROM "Troubleshooting" trb WHERE trb."companyId" = $1 AND trb."updatedAt" > $2 ORDER BY trb."updatedAt" DESC LIMIT 500`,
  chats: `SELECT pc.* FROM "ProjectChat" pc WHERE pc."companyId" = $1 AND pc."createdAt" > $2 ORDER BY pc."createdAt" DESC LIMIT 500`,
  users: 'SELECT id, email, role, "isApproved", "firstName", "lastName", "updatedAt" FROM "User" WHERE "companyId" = $1 AND "updatedAt" > $2',
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
