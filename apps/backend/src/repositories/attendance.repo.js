import { query } from '../config/db.js';

export const attendanceRepo = {
  getProjectSnapshot(companyId, projectId) {
    return query(
      `SELECT id, name, lat, lng, radius, address
       FROM "Project"
       WHERE id = $1 AND "companyId" = $2`,
      [projectId, companyId]
    );
  },

  create({ userId, companyId, projectId, type, status, lat, lng, note, distanceFromProjectM, withinProjectRadius, geoStatus, projectRadiusSnapshot, projectAddressSnapshot }) {
    return query(
      `INSERT INTO "Attendance" (
        id, "userId", "companyId", "projectId", type, status, lat, lng, note,
        "distanceFromProjectM", "withinProjectRadius", "geoStatus", "projectRadiusSnapshot", "projectAddressSnapshot",
        "createdAt", "updatedAt"
      )
       VALUES (
        gen_random_uuid(), $1, $2, $3, $4::attendance_type_enum, $5::attendance_status_enum, $6, $7, $8,
        $9, $10, $11, $12, $13,
        NOW(), NOW()
      )
       RETURNING *`,
      [
        userId,
        companyId,
        projectId || null,
        type,
        status,
        lat ?? null,
        lng ?? null,
        note ?? null,
        distanceFromProjectM ?? null,
        withinProjectRadius ?? null,
        geoStatus,
        projectRadiusSnapshot ?? null,
        projectAddressSnapshot ?? null
      ]
    );
  }
};
