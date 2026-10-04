import { query } from '../config/db.js';

export const collisionsRepo = {
  list(companyId, { status = '', limit = 100 } = {}) {
    return query(
      `SELECT ca.*, p.name as "projectName", u.email as "userEmail", i.name as "itemName"
       FROM "CollisionAlert" ca
       LEFT JOIN "Project" p ON ca."projectId" = p.id
       LEFT JOIN "User" u ON ca."userId" = u.id
       LEFT JOIN "InventoryItem" i ON ca."itemId" = i.id
       WHERE ca."companyId" = $1
         AND ($2 = '' OR ca.status::text = $2)
       ORDER BY ca."createdAt" DESC
       LIMIT $3`,
      [companyId, status, limit]
    );
  },
  upsert({ id, companyId, kind, status = 'OPEN', severity = 'WARNING', projectId = null, userId = null, itemId = null, day = null, detail = {} }) {
    return query(
      `INSERT INTO "CollisionAlert" (
        id, "companyId", kind, status, severity, "projectId", "userId", "itemId", "day", "detailJson", "createdAt", "updatedAt"
      ) VALUES (
        COALESCE($1, gen_random_uuid()), $2, $3::collision_kind_enum, $4::collision_status_enum, $5, $6, $7, $8, $9, $10::jsonb, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, severity = EXCLUDED.severity,
        "detailJson" = EXCLUDED."detailJson", "updatedAt" = NOW()
      RETURNING *`,
      [id || null, companyId, kind, status, severity, projectId, userId, itemId, day, JSON.stringify(detail || {})]
    );
  },
  setStatus(companyId, id, status) {
    return query(
      `UPDATE "CollisionAlert"
       SET status = $3::collision_status_enum, "updatedAt" = NOW()
       WHERE id = $1 AND "companyId" = $2
       RETURNING *`,
      [id, companyId, status]
    );
  }
};
