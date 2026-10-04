-- Zoom Pro — licensing & SUPERADMIN pricing configuration
BEGIN;

CREATE TABLE IF NOT EXISTS "LicensePlan" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  "basePricePerUserMonth" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "flatPricePerMonth" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "maxUsers" INTEGER,
  "includedModules" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "moduleAddons" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "periodDiscounts" JSONB NOT NULL DEFAULT '{"1":0,"3":0.05,"6":0.10,"12":0.20}'::jsonb,
  "isPublic" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "TenantLicense" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "planCode" TEXT NOT NULL,
  "maxUsers" INTEGER NOT NULL DEFAULT 10,
  "enabledModules" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "billingPeriod" INTEGER NOT NULL DEFAULT 1,
  "priceMonthly" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "priceTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CZK',
  "validFrom" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "validTo" TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  "invoiceId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenantlicense_company ON "TenantLicense"("companyId");

CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "PlatformSetting"("key", value, description) VALUES
 ('branding', '{"name":"Zoom Pro","primaryColor":"#2563eb","logoUrl":null}'::jsonb, 'Globální branding'),
 ('geminiApiKey', '{"value":""}'::jsonb, 'API klíč pro Gemini (SUPERADMIN pouze)'),
 ('supportContact', '{"email":"support@zoom-pro.app","phone":""}'::jsonb, 'Kontakt na podporu')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "LicensePlan"(code, name, description, "basePricePerUserMonth", "flatPricePerMonth", "maxUsers", "includedModules", "moduleAddons", "sortOrder") VALUES
 ('START',      'Start',      'Malé firmy 5–20 lidí, projekty + docházka + deník + VZT základ.',
   150, 0, 20,
   '["projects","attendance","dailyLog","vzt","team","reports"]'::jsonb,
   '{"invoices":500,"inventory":500,"documents":500}'::jsonb, 10),
 ('STANDARD',   'Standard',   'Firmy 20–50 lidí, START + faktury + sklad + exporty.',
   180, 0, 50,
   '["projects","attendance","dailyLog","vzt","team","reports","invoices","inventory","exports"]'::jsonb,
   '{"documents":800,"signatures":800,"imports":600}'::jsonb, 20),
 ('PRO',        'Pro',        'Firmy 50–100 lidí, plná dokumentace, importy/exporty, VZT Pro.',
   220, 0, 100,
   '["projects","attendance","dailyLog","vzt","team","reports","invoices","inventory","exports","imports","documents","print","collisions"]'::jsonb,
   '{"signatures":1200,"assistant":1500}'::jsonb, 30),
 ('ENTERPRISE', 'Enterprise', 'Střední/velké firmy, vše zapnuté, prior. podpora, custom.',
   250, 5000, 500,
   '["projects","attendance","dailyLog","vzt","team","reports","invoices","inventory","exports","imports","documents","print","collisions","signatures","assistant","troubleshooting"]'::jsonb,
   '{}'::jsonb, 40)
ON CONFLICT (code) DO NOTHING;

INSERT INTO "Permission"(id, key, "moduleKey", label, description, "createdAt") VALUES
 (gen_random_uuid(), 'saas.manage_plans',    'saas',    'Spravovat licenční tarify', NULL, NOW()),
 (gen_random_uuid(), 'saas.manage_platform', 'saas',    'Spravovat platformu Zoom Pro', NULL, NOW()),
 (gen_random_uuid(), 'licensing.read',       'licensing','Zobrazit licenci firmy', NULL, NOW()),
 (gen_random_uuid(), 'licensing.manage',     'licensing','Změnit licenční balíček firmy', NULL, NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission"(id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'SUPERADMIN'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('saas.manage_plans','saas.manage_platform','licensing.read','licensing.manage')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp WHERE rp.role = 'SUPERADMIN'::role_enum AND rp."permissionId" = p.id
  );

INSERT INTO "RolePermission"(id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'REDITEL'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('licensing.read','licensing.manage')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp WHERE rp.role = 'REDITEL'::role_enum AND rp."permissionId" = p.id
  );

COMMIT;
