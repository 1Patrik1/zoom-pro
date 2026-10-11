import { query } from '../config/db.js';

export const saasRepo = {
  toggleCompany(companyId) {
    return query('UPDATE "Company" SET "isActive" = NOT "isActive", "updatedAt" = NOW() WHERE id = $1 RETURNING *', [companyId]);
  },

  listCompanies() {
    return query(
      `SELECT c.*,
              (SELECT email FROM "User" WHERE "companyId" = c.id ORDER BY "createdAt" ASC LIMIT 1) AS "ownerEmail",
              (SELECT COUNT(*)::int FROM "User" WHERE "companyId" = c.id) AS "userCount",
              (SELECT COUNT(*)::int FROM "User" WHERE "companyId" = c.id AND "isApproved" = TRUE) AS "activeUserCount",
              license.id AS "licenseId", license."planCode" AS "licensePlanCode",
              plan.name AS "licensePlanName", license."enabledModules" AS "licenseModules",
              license."validFrom" AS "licenseValidFrom", license."validTo" AS "licenseValidTo",
              license.status AS "licenseStatus", license."billingPeriod" AS "licenseBillingPeriod",
              license."priceMonthly" AS "licensePriceMonthly", license."priceTotal" AS "licensePriceTotal",
              license.currency AS "licenseCurrency", license."maxUsers" AS "licenseMaxUsers"
         FROM "Company" c
         LEFT JOIN LATERAL (
           SELECT * FROM "TenantLicense" tl
            WHERE tl."companyId" = c.id
            ORDER BY tl."createdAt" DESC LIMIT 1
         ) license ON TRUE
         LEFT JOIN "LicensePlan" plan ON plan.code = license."planCode"
        ORDER BY c."createdAt" DESC
        LIMIT 500`
    );
  },

  setCompanyActive(companyId, active) {
    return query(
      'UPDATE "Company" SET "isActive" = $2, "updatedAt" = NOW() WHERE id = $1 RETURNING *',
      [companyId, !!active]
    );
  }
};
