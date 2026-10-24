import { employeePermissionsRepo } from '../repositories/employee-permissions.repo.js';
import { HttpError } from '../utils/http-error.js';

const MODULE_LICENSE_KEYS = {
  daily_log: 'dailyLog',
  vzt_calculator: 'vzt',
  chat: 'projects',
  settings: 'team',
  licensing: 'licensing'
};
const LOCKED_PERMISSION_KEYS = new Set([
  'team.manage_permissions',
  'team.edit_roles',
  'team.approve',
  'settings.manage_company',
  'settings.manage_pricing',
  'licensing.manage',
  'licensing.read'
]);

function isDirector(user) {
  if (user.role !== 'REDITEL') throw new HttpError(403, 'Oprávnění zaměstnanců může spravovat pouze ředitel firmy.');
}

function enabledModules(license) {
  if (!license || license.status !== 'active') return new Set();
  const now = Date.now();
  if (license.validFrom && new Date(license.validFrom).getTime() > now) return new Set();
  if (license.validTo && new Date(license.validTo).getTime() < now) return new Set();
  const values = Array.isArray(license.enabledModules)
    ? license.enabledModules
    : JSON.parse(license.enabledModules || '[]');
  return new Set(values);
}

function licenseAllows(permission, modules) {
  const moduleKey = MODULE_LICENSE_KEYS[permission.moduleKey] || permission.moduleKey;
  return modules.has(moduleKey) && !LOCKED_PERMISSION_KEYS.has(permission.key)
    && !permission.key.startsWith('saas.')
    && !permission.key.startsWith('licensing.');
}

export const employeePermissionsService = {
  async getManagementData(user) {
    isDirector(user);
    const [employeeRows, catalogRows, overrideRows, licenseRows] = await Promise.all([
      employeePermissionsRepo.listEmployees(user.companyId),
      employeePermissionsRepo.listPermissionCatalog(),
      employeePermissionsRepo.listOverrides(user.companyId),
      employeePermissionsRepo.getLicense(user.companyId)
    ]);
    const modules = enabledModules(licenseRows.rows[0]);
    return {
      employees: employeeRows.rows.filter((employee) => employee.role !== 'REDITEL'),
      permissions: catalogRows.rows.filter((permission) => licenseAllows(permission, modules)),
      overrides: overrideRows.rows,
      enabledModules: [...modules]
    };
  },

  async saveForEmployee(user, { userId, overrides }) {
    isDirector(user);
    const [targetRows, catalogRows, licenseRows] = await Promise.all([
      employeePermissionsRepo.getCompanyUser(user.companyId, userId),
      employeePermissionsRepo.listPermissionCatalog(),
      employeePermissionsRepo.getLicense(user.companyId)
    ]);
    const target = targetRows.rows[0];
    if (!target) throw new HttpError(404, 'Zaměstnanec nebyl nalezen ve vaší firmě.');
    if (['REDITEL', 'SUPERADMIN'].includes(target.role)) throw new HttpError(403, 'Přístup ředitele nelze měnit přes oprávnění zaměstnanců.');
    const modules = enabledModules(licenseRows.rows[0]);
    const allowed = new Set(catalogRows.rows.filter((permission) => licenseAllows(permission, modules)).map((permission) => permission.key));
    for (const override of overrides) {
      if (!allowed.has(override.key)) throw new HttpError(403, `Oprávnění ${override.key} není dostupné v aktivní licenci.`);
      await employeePermissionsRepo.saveOverride({
        userId,
        permissionKey: override.key,
        granted: override.granted,
        reason: 'Nastavení ředitelem firmy',
        grantedBy: user.id
      });
    }
    return { ok: true };
  }
};
