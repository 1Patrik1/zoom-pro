import { query } from '../config/db.js';

export const settingsRepo = {
  updateCompanyContact({ companyId, email, phone }) {
    return query(
      'UPDATE "Company" SET email = $1, phone = $2, "updatedAt" = NOW() WHERE id = $3 RETURNING id, name, email, phone',
      [email, phone, companyId]
    );
  },
  updateCompanyProfile({ companyId, name, ico, dic, street, city, zip, country, email, phone }) {
    return query(
      `UPDATE "Company"
       SET name = $1, ico = $2, dic = $3, street = $4, city = $5, zip = $6,
           country = $7, email = $8, phone = $9, "updatedAt" = NOW()
       WHERE id = $10
       RETURNING id, name, ico, dic, street, city, zip, country, email, phone, "updatedAt"`,
      [name, ico, dic, street, city, zip, country, email, phone, companyId]
    );
  },
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
