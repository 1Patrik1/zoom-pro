import { query } from '../config/db.js';

export const exportsRepo = {
  listProfiles(companyId) {
    return query('SELECT * FROM "ExportProfile" WHERE "companyId" = $1 ORDER BY name ASC', [companyId]);
  },
  listJobs(companyId) {
    return query('SELECT * FROM "ExportJob" WHERE "companyId" = $1 ORDER BY "startedAt" DESC', [companyId]);
  },
  createJob(payload) {
    return query(
      `INSERT INTO "ExportJob" (id, "companyId", "moduleKey", status, format, filters, "startedBy", "startedAt")
       VALUES (gen_random_uuid(), $1, $2, 'PENDING', $3::export_format_enum, $4::jsonb, $5, NOW()) RETURNING *`,
      [payload.companyId, payload.moduleKey, payload.format, JSON.stringify(payload.filters || {}), payload.startedBy]
    );
  }
};
