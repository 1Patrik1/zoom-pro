import { exportsRepo } from '../repositories/exports.repo.js';

export const exportsService = {
  async listProfiles(companyId) {
    const result = await exportsRepo.listProfiles(companyId);
    return result.rows;
  },
  async listJobs(companyId) {
    const result = await exportsRepo.listJobs(companyId);
    return result.rows;
  },
  async createJob(companyId, startedBy, payload) {
    const result = await exportsRepo.createJob({ ...payload, companyId, startedBy });
    return result.rows[0];
  }
};
