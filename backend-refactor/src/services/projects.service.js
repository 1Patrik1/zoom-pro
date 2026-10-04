import { projectsRepo } from '../repositories/projects.repo.js';
import { HttpError } from '../utils/http-error.js';

export const projectsService = {
  async create(user, payload) {
    if (!['SUPERADMIN', 'REDITEL', 'VEDOUCI'].includes(user.role)) throw new HttpError(403, 'Nemáte oprávnění zakládat projekty');
    const result = await projectsRepo.create(user.companyId, payload.name);
    return result.rows[0];
  },
  async assign(user, payload) {
    if (!['SUPERADMIN', 'REDITEL', 'VEDOUCI'].includes(user.role)) throw new HttpError(403, 'Nemáte oprávnění přiřazovat tým');
    if (payload.assign) {
      const result = await projectsRepo.assign(payload.projectId, payload.userId, user.companyId);
      return result.rows[0] || { ok: true };
    }
    await projectsRepo.unassign(payload.projectId, payload.userId, user.companyId);
    return { ok: true };
  },
  async createChat(user, payload) {
    const result = await projectsRepo.createChat(payload.projectId, user.id, user.companyId, payload.text);
    return result.rows[0];
  }
};
