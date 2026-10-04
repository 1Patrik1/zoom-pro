import { syncRepo } from '../repositories/sync.repo.js';

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
  }
};
