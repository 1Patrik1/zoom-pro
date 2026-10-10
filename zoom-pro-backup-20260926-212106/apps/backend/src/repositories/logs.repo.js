import { query } from '../config/db.js';

export const logsRepo = {
  create({ companyId, projectId, authorId, date, weather, content, attachments = [] }) {
    return query(
      `INSERT INTO "DailyLog" (
        id, "companyId", "projectId", "authorId", "logDate", weather, content, attachments, "isLocked", "createdAt", "updatedAt"
      )
       VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::text[], false, NOW(), NOW()
      )
       RETURNING *`,
      [companyId, projectId || null, authorId, date, weather, content, attachments]
    );
  }
};
