BEGIN;

-- ============================================================================
-- PLATFORM OWNER / SUPERADMIN
-- Plain login for first launch:
--   email: owner@platform.local
--   password: PlatformOwner2026!
-- ============================================================================

INSERT INTO "Company" (
  id,
  name,
  "isActive",
  email,
  phone,
  web,
  city,
  country,
  "costPerSqMeter",
  "sellPerSqMeter",
  "createdAt",
  "updatedAt"
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Platform Owner HQ',
  TRUE,
  'owner@platform.local',
  '+420000000000',
  'https://platform.local',
  'Praha',
  'CZ',
  0,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "isActive" = EXCLUDED."isActive",
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  web = EXCLUDED.web,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  "updatedAt" = NOW();

INSERT INTO "User" (
  id,
  email,
  password,
  role,
  "isApproved",
  "companyId",
  "firstName",
  "lastName",
  phone,
  "employeeId",
  "twoFactorEnabled",
  "createdAt",
  "updatedAt"
)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'owner@platform.local',
  '$2a$12$gGSBNLlFm0fZEM5L8UXZV.nPrMyBeMEPbHu.8bn1qT3COfuXWtvCK',
  'SUPERADMIN',
  TRUE,
  '00000000-0000-4000-8000-000000000001',
  'Platform',
  'Owner',
  '+420000000000',
  'PLATFORM-OWNER-001',
  FALSE,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "isApproved" = EXCLUDED."isApproved",
  "companyId" = EXCLUDED."companyId",
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  phone = EXCLUDED.phone,
  "employeeId" = EXCLUDED."employeeId",
  "updatedAt" = NOW();

INSERT INTO "License" (
  id,
  "companyId",
  "validFrom",
  "validUntil",
  tier,
  "maxUsers",
  "maxProjects",
  "storageQuotaMb",
  "enabledModules",
  "signaturesEnabled",
  "exportsEnabled",
  "importsEnabled",
  "apiEnabled",
  "whiteLabelEnabled",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  NOW(),
  NOW() + INTERVAL '10 years',
  'PLATFORM_OWNER',
  999,
  999,
  102400,
  ARRAY['dochazka','projekty','denik','kalkulacka','faktury','sklad','team','nastaveni','documents','imports','exports','signatures','reports']::TEXT[],
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "validUntil" = EXCLUDED."validUntil",
  tier = EXCLUDED.tier,
  "maxUsers" = EXCLUDED."maxUsers",
  "maxProjects" = EXCLUDED."maxProjects",
  "storageQuotaMb" = EXCLUDED."storageQuotaMb",
  "enabledModules" = EXCLUDED."enabledModules",
  "signaturesEnabled" = EXCLUDED."signaturesEnabled",
  "exportsEnabled" = EXCLUDED."exportsEnabled",
  "importsEnabled" = EXCLUDED."importsEnabled",
  "apiEnabled" = EXCLUDED."apiEnabled",
  "whiteLabelEnabled" = EXCLUDED."whiteLabelEnabled",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

INSERT INTO "ConsumablesSummary" (
  id,
  "companyId",
  "totalScrews",
  "totalTapeMeters",
  "totalRivets",
  "totalSealant",
  "updatedAt"
)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000001',
  0,
  0,
  0,
  0,
  NOW()
)
ON CONFLICT ("companyId") DO UPDATE SET
  "updatedAt" = NOW();

INSERT INTO "CompanySettings" (
  id,
  "companyId",
  "updatedAt",
  locale,
  timezone,
  currency,
  "dateFormat",
  "timeFormat",
  "firstDayOfWeek",
  "decimalSeparator",
  "thousandsSeparator",
  "distanceUnit",
  "weightUnit",
  "areaUnit",
  "invoicePrefix",
  "invoicePadding",
  "invoiceResetCycle",
  "dailyLogPrefix",
  "attendanceExportPrefix",
  "handoverProtocolPrefix",
  "priceOfferPrefix",
  "enabledModules",
  "defaultExportFormat",
  "defaultSignatureLevel",
  "retentionPolicyDays",
  "autoArchiveAfterDays",
  "emailNotificationsEnabled",
  "notificationEmail"
)
VALUES (
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000001',
  NOW(),
  'cs-CZ',
  'Europe/Prague',
  'CZK',
  'DD.MM.YYYY',
  'HH:mm',
  1,
  ',',
  ' ',
  'm',
  'kg',
  'm2',
  'FA',
  4,
  'YEARLY',
  'DEN',
  'DOC',
  'PP',
  'CN',
  ARRAY['dochazka','projekty','denik','kalkulacka','faktury','sklad','team','nastaveni','documents','imports','exports','signatures','reports']::TEXT[],
  'pdf',
  'INTERNAL_APPROVAL',
  3650,
  365,
  FALSE,
  'owner@platform.local'
)
ON CONFLICT ("companyId") DO UPDATE SET
  "updatedAt" = NOW(),
  locale = EXCLUDED.locale,
  timezone = EXCLUDED.timezone,
  currency = EXCLUDED.currency,
  "enabledModules" = EXCLUDED."enabledModules",
  "defaultExportFormat" = EXCLUDED."defaultExportFormat",
  "defaultSignatureLevel" = EXCLUDED."defaultSignatureLevel",
  "notificationEmail" = EXCLUDED."notificationEmail";

INSERT INTO "ModuleSettings" (id, "companyId", "moduleKey", "settingsJson", version, "updatedBy", "updatedAt", "createdAt")
VALUES
  (
    '00000000-0000-4000-8000-000000000014',
    '00000000-0000-4000-8000-000000000001',
    'security',
    '{"jwtExpiresInMinutes":480,"refreshTokensEnabled":false,"maxLoginAttempts":5,"lockoutDurationMinutes":30,"passwordPolicy":{"minLength":12,"requireUppercase":true,"requireLowercase":true,"requireNumber":true,"requireSpecial":false},"require2faForSignatures":false}'::jsonb,
    1,
    '00000000-0000-4000-8000-000000000010',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000015',
    '00000000-0000-4000-8000-000000000001',
    'documents',
    '{"approvalEnabled":true,"defaultStatus":"DRAFT","hashPreviewEnabled":true,"allowedLocales":["cs","de","en"],"allowedTypes":["INVOICE","PRICE_OFFER","SERVICE_REPORT","PROJECT_HANDOVER_PROTOCOL"]}'::jsonb,
    1,
    '00000000-0000-4000-8000-000000000010',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000016',
    '00000000-0000-4000-8000-000000000001',
    'imports',
    '{"allowRemoteUrl":true,"allowedFormats":["CSV","XLSX","JSON"],"maxFileSizeMb":50,"defaultDryRun":true}'::jsonb,
    1,
    '00000000-0000-4000-8000-000000000010',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000017',
    '00000000-0000-4000-8000-000000000001',
    'exports',
    '{"allowedFormats":["PDF","DOCX","XLSX"],"brandingEnabled":true,"watermarkEnabled":false,"auditTrailEnabled":true}'::jsonb,
    1,
    '00000000-0000-4000-8000-000000000010',
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000018',
    '00000000-0000-4000-8000-000000000001',
    'signatures',
    '{"enabled":true,"defaultProviderKey":"internal-demo","defaultLevel":"INTERNAL_APPROVAL","expiryDays":7}'::jsonb,
    1,
    '00000000-0000-4000-8000-000000000010',
    NOW(),
    NOW()
  )
ON CONFLICT ("companyId", "moduleKey") DO UPDATE SET
  "settingsJson" = EXCLUDED."settingsJson",
  version = "ModuleSettings".version + 1,
  "updatedBy" = EXCLUDED."updatedBy",
  "updatedAt" = NOW();

COMMIT;
