import { query } from '../config/db.js';

export const settingsRepo = {
  updatePricing({ companyId, cost, sell }) {
    return query(
      `UPDATE "Company"
       SET "costPerSqMeter" = $1, "sellPerSqMeter" = $2, "updatedAt" = NOW()
       WHERE id = $3 RETURNING *`,
      [cost, sell, companyId]
    );
  },
  getCompanySettings(companyId) {
    return query('SELECT * FROM "CompanySettings" WHERE "companyId" = $1', [companyId]);
  },
  getModuleSettings(companyId, moduleKey) {
    return query('SELECT * FROM "ModuleSettings" WHERE "companyId" = $1 AND "moduleKey" = $2', [companyId, moduleKey]);
  },
  upsertModuleSettings(companyId, moduleKey, settingsJson, updatedBy = null) {
    return query(
      `INSERT INTO "ModuleSettings" (id, "companyId", "moduleKey", "settingsJson", version, "updatedBy", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3::jsonb, 1, $4, NOW(), NOW())
       ON CONFLICT ("companyId", "moduleKey")
       DO UPDATE SET
         "settingsJson" = EXCLUDED."settingsJson",
         version = "ModuleSettings".version + 1,
         "updatedBy" = EXCLUDED."updatedBy",
         "updatedAt" = NOW()
       RETURNING *`,
      [companyId, moduleKey, JSON.stringify(settingsJson), updatedBy]
    );
  }
};
