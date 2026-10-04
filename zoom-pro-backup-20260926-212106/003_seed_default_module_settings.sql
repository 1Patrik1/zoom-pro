-- =============================================================================
-- PWA-VZT-SYSTEM
-- 003_seed_default_module_settings.sql
-- Default CompanySettings + ModuleSettings pro všechny existující firmy
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) CompanySettings: jedna řádka per firma, pokud ještě neexistuje
-- -----------------------------------------------------------------------------
INSERT INTO "CompanySettings" (
  id,
  "companyId",
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
  "invoiceStartNumber",
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
  "notificationEmail",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  c.id,
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
  1,
  'DEN',
  'DOC',
  'PP',
  'CN',
  ARRAY['reporty','dochazka','projekty','chat','denik','kalkulacka','faktury','sklad','team','nastaveni','documents','imports','exports']::TEXT[],
  'pdf',
  'INTERNAL_APPROVAL',
  3650,
  365,
  FALSE,
  NULL,
  NOW()
FROM "Company" c
WHERE NOT EXISTS (
  SELECT 1 FROM "CompanySettings" s WHERE s."companyId" = c.id
);

-- -----------------------------------------------------------------------------
-- 2) ModuleSettings: výchozí detailní konfigurace pro všechny firmy
-- -----------------------------------------------------------------------------
INSERT INTO "ModuleSettings" (id, "companyId", "moduleKey", "settingsJson", version, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  c.id,
  v.module_key,
  v.settings_json::jsonb,
  1,
  NOW(),
  NOW()
FROM "Company" c
CROSS JOIN (
  VALUES
    (
      'security',
      $$
      {
        "jwtExpiresInMinutes": 480,
        "refreshTokensEnabled": false,
        "maxLoginAttempts": 5,
        "lockoutDurationMinutes": 30,
        "twoFactorRequired": false,
        "passwordPolicy": {
          "minLength": 12,
          "requireUppercase": true,
          "requireLowercase": true,
          "requireNumber": true,
          "requireSpecial": false,
          "passwordExpiryDays": 180
        },
        "allowedIpRanges": [],
        "auditSensitiveActions": true,
        "require2faForSignatures": true,
        "requireElevatedPermissionForPersonalDataExport": true
      }
      $$
    ),
    (
      'attendance',
      $$
      {
        "enabledTypes": ["PRICHOD", "ODCHOD", "ABSENCE"],
        "enabledStatuses": ["PRACE", "NEMOC", "DOVOLENA"],
        "requireGps": true,
        "allowManualEdit": false,
        "allowBackfill": false,
        "maxBackfillDays": 3,
        "requireProjectOnCheckIn": false,
        "geofenceEnabled": true,
        "geofenceRadiusMeters": 100,
        "autoBreakEnabled": false,
        "autoBreakMinutes": 30,
        "nightShiftEnabled": false,
        "roundingMinutes": 0,
        "approvalRequiredForEdits": true,
        "payrollExportEnabled": true,
        "defaultPayrollExportFormat": "xlsx",
        "documents": {
          "monthlyStatementEnabled": true,
          "attendanceClosureEnabled": true,
          "employeeSignatureRequired": false,
          "managerSignatureRequired": true
        }
      }
      $$
    ),
    (
      'projects',
      $$
      {
        "codePattern": "PRJ-{YYYY}-{0001}",
        "requireClient": false,
        "requireAddress": false,
        "requireGeoLocation": false,
        "defaultRadiusMeters": 100,
        "allowProjectArchive": true,
        "mandatoryDocuments": [],
        "mandatoryDailyLog": false,
        "mandatoryPhotoDocumentation": false,
        "accessMode": "hybrid",
        "allowTeamAssignment": true,
        "allowMilestones": false,
        "folderTemplate": ["01-smlouvy", "02-nabidky", "03-denik", "04-fotky", "05-predani"]
      }
      $$
    ),
    (
      'chat',
      $$
      {
        "mode": "polling",
        "pollingIntervalSeconds": 5,
        "retentionDays": 365,
        "allowAttachments": false,
        "allowEdit": false,
        "allowDelete": false,
        "allowMentions": false,
        "readReceipts": false,
        "exportEnabled": true,
        "autoArchiveOnProjectClose": true
      }
      $$
    ),
    (
      'daily_log',
      $$
      {
        "requireProject": true,
        "requireWeather": true,
        "requireAttachments": false,
        "dailyClosureEnabled": false,
        "lockAfterClosure": true,
        "approvalWorkflowEnabled": false,
        "photoDocumentationEnabled": true,
        "geotaggingEnabled": false,
        "defaultTemplateText": "",
        "exportFormats": ["pdf", "docx"],
        "signatureRequired": false,
        "timestampRequired": false
      }
      $$
    ),
    (
      'vzt_calculator',
      $$
      {
        "enabledComponentTypes": ["Rovné", "Koleno"],
        "sheetMetalDensity": 7.85,
        "weightCoefficient": 0.9,
        "surfaceAreaReserveFactor": 1.15,
        "accessDoorRules": {
          "straightLengthThresholdMeters": 4,
          "elbowAngleThresholdDegrees": 45
        },
        "units": {
          "inputLength": "mm",
          "outputArea": "m2",
          "outputWeight": "kg"
        },
        "pricing": {
          "costPerSqMeter": 0,
          "sellPerSqMeter": 0,
          "marginPercent": 0,
          "defaultVatRate": 21
        },
        "consumables": {
          "autoUpdateSummary": true,
          "screwsPerComponent": 8,
          "tapePerimeterMultiplier": 1
        },
        "exports": ["pdf", "xlsx"]
      }
      $$
    ),
    (
      'invoices',
      $$
      {
        "numbering": {
          "pattern": "FA-{YYYY}-{0001}",
          "resetCycle": "yearly",
          "startNumber": 1,
          "padding": 4
        },
        "currency": "CZK",
        "defaultDueDays": 14,
        "defaultVatRate": 21,
        "bankAccounts": [],
        "qrPaymentEnabled": true,
        "isdocExportEnabled": false,
        "xmlAccountingExportEnabled": false,
        "reverseChargeEnabled": false,
        "roundingMode": "0.01",
        "footerText": "",
        "approvalRequiredBeforeIssue": false,
        "autoEmailSend": false,
        "paymentRemindersEnabled": false,
        "documents": {
          "invoiceTemplate": null,
          "proformaTemplate": null,
          "creditNoteTemplate": null,
          "signatureRequired": false,
          "sealRequired": false
        }
      }
      $$
    ),
    (
      'inventory',
      $$
      {
        "multiWarehouseEnabled": false,
        "allowNegativeStock": false,
        "trackLots": false,
        "trackSerialNumbers": false,
        "autoReservationForProjects": false,
        "autoIssueFromVztCalculator": false,
        "approvalRequiredForIssue": false,
        "inventoryAuditMode": "manual",
        "defaultUnits": ["ks", "m", "m2", "kg", "bal"],
        "documentTemplates": {
          "issueNote": null,
          "receiptNote": null,
          "inventoryProtocol": null
        }
      }
      $$
    ),
    (
      'team',
      $$
      {
        "registrationApprovalRequired": true,
        "allowSelfRegistration": true,
        "defaultRole": "MONTER",
        "allowRoleEditing": true,
        "organizationStructureEnabled": false,
        "projectRoleAssignmentsEnabled": true,
        "moduleVisibilityPerRoleEnabled": true,
        "signatureAuthorityPerRole": {},
        "importEnabled": true,
        "exportEnabled": true
      }
      $$
    ),
    (
      'pricing',
      $$
      {
        "costPerSqMeter": 0,
        "sellPerSqMeter": 0,
        "marginPercent": 0,
        "surchargePercent": 0,
        "discountPercent": 0,
        "versioningEnabled": true,
        "effectiveFromRequired": true,
        "regionalPricingEnabled": false,
        "customerSpecificPricingEnabled": false,
        "approvalRequiredForChanges": true
      }
      $$
    ),
    (
      'documents',
      $$
      {
        "numbering": {
          "invoice": "FA-{YYYY}-{0001}",
          "dailyLog": "DEN-{PROJECT}-{YYYYMM}-{0001}",
          "attendanceStatement": "DOC-{YYYYMM}-{EMPLOYEE}-{0001}",
          "handoverProtocol": "PP-{PROJECT}-{YYYY}-{0001}",
          "priceOffer": "CN-{YYYY}-{0001}"
        },
        "workflow": {
          "defaultStates": ["draft", "pending_review", "pending_approval", "approved", "pending_signature", "signed", "exported", "archived"],
          "allowRejection": true,
          "allowCancellation": true,
          "lockAfterSignature": true
        },
        "templates": [],
        "versioningEnabled": true,
        "storeHash": true,
        "allowAttachments": true,
        "archiveSignedArtifacts": true
      }
      $$
    ),
    (
      'imports',
      $$
      {
        "supportedFormats": ["csv", "xlsx", "json"],
        "defaultEncoding": "UTF-8",
        "defaultDelimiter": ";",
        "headerRowRequired": true,
        "allowDryRun": true,
        "allowValidationOnly": true,
        "duplicateStrategy": "skip",
        "rollbackOnFirstError": false,
        "storeSourceFiles": true,
        "generateImportReport": true,
        "profiles": []
      }
      $$
    ),
    (
      'exports',
      $$
      {
        "supportedFormats": ["pdf", "xlsx", "csv", "json"],
        "defaultFormat": "pdf",
        "includeMetadata": true,
        "includeAuditTrail": false,
        "allowAnonymization": true,
        "allowBranding": true,
        "allowWatermark": true,
        "allowPasswordProtection": true,
        "allowZipEncryption": true,
        "scheduledExportsEnabled": false,
        "profiles": []
      }
      $$
    ),
    (
      'signatures',
      $$
      {
        "enabled": false,
        "defaultLevel": "INTERNAL_APPROVAL",
        "require2faBeforeSigning": true,
        "archiveSignedArtifacts": true,
        "storeCertificateInfo": true,
        "storeTimestampToken": true,
        "allowInternalApproval": true,
        "allowSimple": true,
        "allowAdvanced": false,
        "allowQualified": false,
        "allowElectronicSeal": false,
        "providers": []
      }
      $$
    ),
    (
      'reports',
      $$
      {
        "enabledDashboards": ["profit", "attendance", "projects", "invoices"],
        "defaultPeriod": "month",
        "allowSavedFilters": true,
        "allowScheduledReports": false,
        "defaultExportFormat": "pdf",
        "managerSignatureRequired": false
      }
      $$
    )
) AS v(module_key, settings_json)
WHERE NOT EXISTS (
  SELECT 1
  FROM "ModuleSettings" ms
  WHERE ms."companyId" = c.id
    AND ms."moduleKey" = v.module_key
);

COMMIT;
