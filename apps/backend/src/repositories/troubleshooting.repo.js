import { query } from '../config/db.js';

export const troubleshootingRepo = {
  listForProject(companyId, projectId) {
    return query(
      `SELECT pt.*, u.email as "authorEmail"
       FROM "ProjectTroubleshooting" pt
       JOIN "User" u ON pt."userId" = u.id
       WHERE pt."companyId" = $1 AND pt."projectId" = $2
       ORDER BY pt."createdAt" DESC
       LIMIT 100`,
      [companyId, projectId]
    );
  },
  create({ companyId, projectId, userId, title, description, imageUrl, category, severity, relatedMaterials, relatedAttendances }) {
    return query(
      `INSERT INTO "ProjectTroubleshooting" (
        id, "companyId", "projectId", "userId", title, description, "imageUrl", category, severity,
        "relatedMaterials", "relatedAttendances", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
        $9::jsonb, $10::jsonb, NOW(), NOW()
      )
      RETURNING *`,
      [
        companyId,
        projectId,
        userId,
        title,
        description,
        imageUrl || null,
        category || 'OTHER',
        severity || 'INFO',
        JSON.stringify(relatedMaterials || []),
        JSON.stringify(relatedAttendances || [])
      ]
    );
  },
  updateAnswer(companyId, id, answerText) {
    return query(
      `UPDATE "ProjectTroubleshooting"
       SET "answerText" = $3, "updatedAt" = NOW()
       WHERE id = $1 AND "companyId" = $2
       RETURNING *`,
      [id, companyId, answerText]
    );
  }
};
