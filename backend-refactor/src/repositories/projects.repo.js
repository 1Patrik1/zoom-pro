import { query } from '../config/db.js';

export const projectsRepo = {
  create(companyId, name) {
    return query(
      'INSERT INTO "Project" (id, name, "companyId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING *',
      [name, companyId]
    );
  },
  assign(projectId, userId, companyId) {
    return query(
      'INSERT INTO "ProjectAssignment" (id, "projectId", "userId", "companyId", "assignedAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW()) ON CONFLICT ("projectId", "userId", "companyId") DO NOTHING RETURNING *',
      [projectId, userId, companyId]
    );
  },
  unassign(projectId, userId, companyId) {
    return query('DELETE FROM "ProjectAssignment" WHERE "projectId" = $1 AND "userId" = $2 AND "companyId" = $3', [projectId, userId, companyId]);
  },
  createChat(projectId, userId, companyId, text) {
    return query(
      'INSERT INTO "ProjectChat" (id, "projectId", "userId", "companyId", text, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING *',
      [projectId, userId, companyId, text]
    );
  }
};
