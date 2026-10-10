import { query } from '../config/db.js';

export const attendanceRepo = {
  create({ userId, companyId, projectId, type, status, lat, lng }) {
    return query(
      `INSERT INTO "Attendance" (id, "userId", "companyId", "projectId", type, status, lat, lng, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::attendance_type_enum, $5::attendance_status_enum, $6, $7, NOW(), NOW())
       RETURNING *`,
      [userId, companyId, projectId || null, type, status, lat ?? null, lng ?? null]
    );
  }
};
