import { query } from '../config/db.js';

export const projectsRepo = {
  create(companyId, payload) {
    return query(
      `INSERT INTO "Project" (
        id, name, "companyId", "createdAt", "updatedAt", lat, lng, radius, address, code,
        "clientName", status, "plannedStart", "plannedEnd", budget, "gpsMode", "locationNote", "locationUpdatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, NOW(), NOW(), $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *`,
      [
        payload.name,
        companyId,
        payload.lat,
        payload.lng,
        payload.radius,
        payload.address,
        payload.code,
        payload.clientName,
        payload.status,
        payload.plannedStart,
        payload.plannedEnd,
        payload.budget,
        payload.gpsMode,
        payload.locationNote,
        payload.locationUpdatedAt
      ]
    );
  },

  update(projectId, companyId, payload) {
    return query(
      `UPDATE "Project"
       SET name = $3,
           lat = $4,
           lng = $5,
           radius = $6,
           address = $7,
           code = $8,
           "clientName" = $9,
           status = $10,
           "plannedStart" = $11,
           "plannedEnd" = $12,
           budget = $13,
           "gpsMode" = $14,
           "locationNote" = $15,
           "locationUpdatedAt" = COALESCE($16, "locationUpdatedAt"),
           "updatedAt" = NOW()
       WHERE id = $1 AND "companyId" = $2
       RETURNING *`,
      [
        projectId,
        companyId,
        payload.name,
        payload.lat,
        payload.lng,
        payload.radius,
        payload.address,
        payload.code,
        payload.clientName,
        payload.status,
        payload.plannedStart,
        payload.plannedEnd,
        payload.budget,
        payload.gpsMode,
        payload.locationNote,
        payload.locationUpdatedAt
      ]
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

  createChat(projectId, userId, companyId, text, attachmentUrl, galleryCount, attachmentType) {
    return query(
      `INSERT INTO "ProjectChat" (
        id, "projectId", "userId", "companyId", text, "attachmentUrl", "galleryCount", "attachmentType", "createdAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
      ) RETURNING *`,
      [projectId, userId, companyId, text, attachmentUrl, galleryCount, attachmentType]
    );
  },

  addGalleryItems(projectId, userId, companyId, sourceChatId, attachments, caption) {
    return query(
      `INSERT INTO "ProjectGalleryItem" (
        id, "projectId", "userId", "companyId", "sourceChatId", "imageUrl", caption, "createdAt"
      )
      SELECT gen_random_uuid(), $1, $2, $3, $4, image_url, $6, NOW()
      FROM UNNEST($5::text[]) AS image_url`,
      [projectId, userId, companyId, sourceChatId, attachments, caption]
    );
  }
};
