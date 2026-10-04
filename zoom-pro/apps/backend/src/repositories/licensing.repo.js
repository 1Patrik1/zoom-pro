import { query } from '../config/db.js';

export const licensingRepo = {
  listPlans() {
    return query('SELECT * FROM "LicensePlan" ORDER BY "sortOrder" ASC, code ASC');
  },
  getPlanByCode(code) {
    return query('SELECT * FROM "LicensePlan" WHERE code = $1', [code]);
  },
  upsertPlan(payload) {
    return query(
      `INSERT INTO "LicensePlan"(code, name, description, "basePricePerUserMonth", "flatPricePerMonth",
                                  "maxUsers", "includedModules", "moduleAddons", "periodDiscounts",
                                  "isPublic", "sortOrder")
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         "basePricePerUserMonth" = EXCLUDED."basePricePerUserMonth",
         "flatPricePerMonth" = EXCLUDED."flatPricePerMonth",
         "maxUsers" = EXCLUDED."maxUsers",
         "includedModules" = EXCLUDED."includedModules",
         "moduleAddons" = EXCLUDED."moduleAddons",
         "periodDiscounts" = EXCLUDED."periodDiscounts",
         "isPublic" = EXCLUDED."isPublic",
         "sortOrder" = EXCLUDED."sortOrder",
         "updatedAt" = NOW()
       RETURNING *`,
      [
        payload.code, payload.name, payload.description || null,
        payload.basePricePerUserMonth || 0, payload.flatPricePerMonth || 0,
        payload.maxUsers || null,
        JSON.stringify(payload.includedModules || []),
        JSON.stringify(payload.moduleAddons || {}),
        JSON.stringify(payload.periodDiscounts || { 1: 0, 3: 0.05, 6: 0.10, 12: 0.20 }),
        payload.isPublic ?? true,
        payload.sortOrder || 0,
      ]
    );
  },
  deletePlan(code) {
    return query('DELETE FROM "LicensePlan" WHERE code = $1', [code]);
  },
  getTenantLicense(companyId) {
    return query('SELECT * FROM "TenantLicense" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [companyId]);
  },
  saveTenantLicense(payload) {
    return query(
      `INSERT INTO "TenantLicense"("companyId","planCode","maxUsers","enabledModules",
                                    "billingPeriod","priceMonthly","priceTotal",currency,
                                    "validFrom","validTo",status,"invoiceId")
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        payload.companyId, payload.planCode, payload.maxUsers,
        JSON.stringify(payload.enabledModules || []),
        payload.billingPeriod, payload.priceMonthly, payload.priceTotal,
        payload.currency || 'CZK', payload.validFrom, payload.validTo,
        payload.status || 'active', payload.invoiceId || null,
      ]
    );
  },
  listPlatformSettings() {
    return query('SELECT * FROM "PlatformSetting" ORDER BY "key"');
  },
  setPlatformSetting(key, value) {
    return query(
      `INSERT INTO "PlatformSetting"("key", value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT ("key") DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
       RETURNING *`,
      [key, JSON.stringify(value)]
    );
  },
  countActiveUsers(companyId) {
    return query('SELECT COUNT(*)::int AS count FROM "User" WHERE "companyId" = $1 AND "isApproved" = TRUE', [companyId]);
  },
};
