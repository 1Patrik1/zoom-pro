import { query } from '../config/db.js';

export const permissionsRepo = {
  getEffectivePermissions(userId, role) {
    return query(
      `WITH role_permissions AS (
         SELECT p.key, rp.granted
         FROM "RolePermission" rp
         JOIN "Permission" p ON p.id = rp."permissionId"
         WHERE rp.role = $2::role_enum
       ),
       user_overrides AS (
         SELECT p.key, uo.granted
         FROM "UserPermissionOverride" uo
         JOIN "Permission" p ON p.id = uo."permissionId"
         WHERE uo."userId" = $1
       ),
       resolved AS (
         SELECT key, granted FROM role_permissions
         UNION ALL
         SELECT key, granted FROM user_overrides
       )
       SELECT key, BOOL_OR(granted) AS granted
       FROM resolved
       GROUP BY key`,
      [userId, role]
    );
  }
};
