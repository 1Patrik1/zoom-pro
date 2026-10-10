import { query } from '../config/db.js';

export const importsRepo = {
  listProfiles(companyId) {
    return query('SELECT * FROM "ImportProfile" WHERE "companyId" = $1 ORDER BY name ASC', [companyId]);
  },
  listJobs(companyId) {
    return query('SELECT * FROM "ImportJob" WHERE "companyId" = $1 ORDER BY "startedAt" DESC', [companyId]);
  },
  createJob(payload) {
    return query(
      `INSERT INTO "ImportJob" (id, "companyId", "moduleKey", status, "sourceFileName", "sourceFileUrl", "isDryRun", "startedBy", "startedAt")
       VALUES (gen_random_uuid(), $1, $2, 'PENDING', $3, $4, $5, $6, NOW()) RETURNING *`,
      [payload.companyId, payload.moduleKey, payload.sourceFileName, payload.sourceFileUrl, payload.isDryRun || false, payload.startedBy]
    );
  }
};
