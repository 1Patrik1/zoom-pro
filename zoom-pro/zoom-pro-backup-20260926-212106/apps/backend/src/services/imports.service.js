import { importsRepo } from '../repositories/imports.repo.js';

export const importsService = {
  async listProfiles(companyId) {
    const result = await importsRepo.listProfiles(companyId);
    return result.rows;
  },
  async listJobs(companyId) {
    const result = await importsRepo.listJobs(companyId);
    return result.rows;
  },
  async createJob(companyId, startedBy, payload) {
    const result = await importsRepo.createJob({ ...payload, companyId, startedBy });
    return result.rows[0];
  }
};
