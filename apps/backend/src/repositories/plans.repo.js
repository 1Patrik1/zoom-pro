import { query } from '../config/db.js';

export const plansRepo = {
  list(companyId, { projectId = '', discipline = '', status = '' } = {}) {
    const clauses = ['"companyId" = $1'];
    const params = [companyId];
    if (projectId) {
      params.push(projectId);
      clauses.push(`"projectId" = $${params.length}`);
    }
    if (discipline) {
      params.push(discipline);
      clauses.push(`discipline = $${params.length}::plan_discipline_enum`);
    }
    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}::plan_status_enum`);
    } else {
      clauses.push(`status = 'ACTIVE'`);
    }
    return query(
      `SELECT * FROM "ProjectPlan" WHERE ${clauses.join(' AND ')} ORDER BY "createdAt" DESC`,
      params
    );
  },

  get(companyId, id) {
    return query('SELECT * FROM "ProjectPlan" WHERE "companyId" = $1 AND id = $2', [companyId, id]);
  },

  validateProjectReference(companyId, projectId) {
    return query('SELECT 1 FROM "Project" WHERE id = $1 AND "companyId" = $2', [projectId, companyId]);
  },

  create(payload) {
    return query(
      `INSERT INTO "ProjectPlan"
         (id, "companyId", "projectId", title, discipline, format, "fileUrl", "fileName", "fileSizeBytes", version, "parentPlanId", status, "uploadedBy", note, "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4::plan_discipline_enum, $5::plan_format_enum, $6, $7, $8, $9, $10, 'ACTIVE'::plan_status_enum, $11, $12, NOW(), NOW())
       RETURNING *`,
      [
        payload.companyId,
        payload.projectId,
        payload.title,
        payload.discipline || 'OTHER',
        payload.format,
        payload.fileUrl,
        payload.fileName || null,
        payload.fileSizeBytes || null,
        payload.version || 1,
        payload.parentPlanId || null,
        payload.uploadedBy,
        payload.note || null
      ]
    );
  },

  archive(companyId, id) {
    return query(
      `UPDATE "ProjectPlan" SET status = 'ARCHIVED'::plan_status_enum, "updatedAt" = NOW()
       WHERE "companyId" = $1 AND id = $2 RETURNING *`,
      [companyId, id]
    );
  },

  listMarkers(companyId, planId) {
    return query(
      'SELECT * FROM "ProjectPlanMarker" WHERE "companyId" = $1 AND "planId" = $2 ORDER BY "createdAt" ASC',
      [companyId, planId]
    );
  },

  createMarker(payload) {
    return query(
      `INSERT INTO "ProjectPlanMarker"
         (id, "planId", "companyId", "authorId", "positionX", "positionY", "pageNumber", text, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [payload.planId, payload.companyId, payload.authorId, payload.positionX, payload.positionY, payload.pageNumber || 1, payload.text]
    );
  },

  deleteMarker(companyId, markerId) {
    return query(
      'DELETE FROM "ProjectPlanMarker" WHERE "companyId" = $1 AND id = $2 RETURNING id',
      [companyId, markerId]
    );
  }
};
