import { query } from '../config/db.js';

export const employeePermissionsRepo = {
  listEmployees(companyId) {
    return query(
      'SELECT id, email, role, "firstName", "lastName" FROM "User" WHERE "companyId" = $1 AND role <> \'SUPERADMIN\'::role_enum ORDER BY "lastName", "firstName", email',
      [companyId]
    );
  },
  listPermissionCatalog() {
    return query('SELECT key, "moduleKey", label, description FROM "Permission" ORDER BY "moduleKey", label');
  },
  listOverrides(companyId) {
    return query(
      'SELECT uo."userId", p.key, uo.granted FROM "UserPermissionOverride" uo JOIN "Permission" p ON p.id = uo."permissionId" JOIN "User" u ON u.id = uo."userId" WHERE u."companyId" = $1',
      [companyId]
    );
  },
  saveOverride({ userId, permissionKey, granted, reason, grantedBy }) {
    return query(
      'INSERT INTO "UserPermissionOverride" ("userId", "permissionId", granted, reason, "grantedBy", "createdAt") SELECT $1, p.id, $3, $4, $5, NOW() FROM "Permission" p WHERE p.key = $2 ON CONFLICT ("userId", "permissionId") DO UPDATE SET granted = EXCLUDED.granted, reason = EXCLUDED.reason, "grantedBy" = EXCLUDED."grantedBy", "createdAt" = NOW() RETURNING *',
      [userId, permissionKey, granted, reason || null, grantedBy]
    );
  },
  getLicense(companyId) {
    return query('SELECT "enabledModules", status, "validFrom", "validTo" FROM "TenantLicense" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [companyId]);
  },
  getCompanyUser(companyId, userId) {
    return query('SELECT id, role FROM "User" WHERE id = $1 AND "companyId" = $2', [userId, companyId]);
  }
};
