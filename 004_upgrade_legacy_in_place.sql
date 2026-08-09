-- =============================================================================
-- PWA-VZT-SYSTEM
-- 004_upgrade_legacy_in_place.sql
-- In-place migrace ze stávajícího legacy/raw-pg stavu do sjednoceného modelu
--
-- Cíl:
-- 1) bezpečně doplnit chybějící sloupce do existujících tabulek
-- 2) normalizovat role a vybrané legacy hodnoty
-- 3) vytvořit nové tabulky, které legacy backend dosud neměl
-- 4) backfillnout CompanySettings / ModuleSettings / ConsumablesSummary
--
-- Poznámky:
-- - Skript je idempotentní — používá IF EXISTS / IF NOT EXISTS kde je to možné.
-- - Je určen pro databázi, kde už existují legacy tabulky typu Company/User/Project/
--   Attendance/DailyLog/Invoice/VztComponent apod. podle současného server.js.
-- - Pokud je databáze prázdná, použij nejdřív 001_initial_schema.sql a potom 002/003.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE role_enum AS ENUM ('SUPERADMIN','REDITEL','ADMINISTRACE','VEDOUCI','MONTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_type_enum AS ENUM ('PRICHOD','ODCHOD','ABSENCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status_enum AS ENUM ('PRACE','NEMOC','DOVOLENA','SKOLENI','CESTA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status_enum AS ENUM ('DRAFT','ISSUED','ZAPLACENO','OVERDUE','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type_enum AS ENUM (
    'INVOICE','PROFORMA_INVOICE','CREDIT_NOTE','ATTENDANCE_STATEMENT','ATTENDANCE_CLOSURE',
    'DAILY_LOG_ENTRY','DAILY_LOG_REPORT','PROJECT_ASSIGNMENT','PROJECT_HANDOVER_PROTOCOL',
    'CHANGE_PROTOCOL','INVENTORY_ISSUE_NOTE','INVENTORY_RECEIPT_NOTE','INVENTORY_AUDIT_PROTOCOL',
    'VZT_CALCULATION_SHEET','VZT_PRODUCTION_SHEET','PRICE_OFFER','SERVICE_REPORT',
    'LICENSE_AGREEMENT','USER_APPROVAL','SIGNATURE_AUTHORIZATION','PAYMENT_REMINDER','PAYMENT_CONFIRMATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_status_enum AS ENUM (
    'DRAFT','PENDING_REVIEW','PENDING_APPROVAL','APPROVED','PENDING_SIGNATURE','SIGNED',
    'EXPORTED','ARCHIVED','REJECTED','CANCELLED','SUPERSEDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE signature_level_enum AS ENUM ('INTERNAL_APPROVAL','SIMPLE','ADVANCED','QUALIFIED','ELECTRONIC_SEAL','TIMESTAMP_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE signature_request_status_enum AS ENUM ('PENDING','SENT','VIEWED','SIGNED','REJECTED','EXPIRED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE export_format_enum AS ENUM ('PDF','DOCX','XLSX','CSV','JSON','XML','ISDOC','ZIP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_format_enum AS ENUM ('CSV','XLSX','JSON','XML','ZIP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_job_status_enum AS ENUM ('PENDING','PARSING','VALIDATING','PREVIEWING','RUNNING','COMPLETED','PARTIAL','FAILED','ROLLED_BACK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE export_job_status_enum AS ENUM ('PENDING','RUNNING','COMPLETED','SIGNING','SIGNED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_movement_type_enum AS ENUM ('RECEIPT','ISSUE','TRANSFER','ADJUSTMENT','WRITE_OFF','RETURN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_step_type_enum AS ENUM ('REVIEW','APPROVE','SIGN','NOTIFY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- HELPER
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMPANY — doplnění chybějících sloupců
-- =============================================================================

ALTER TABLE IF EXISTS "Company"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ico TEXT,
  ADD COLUMN IF NOT EXISTS dic TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'CZ',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS web TEXT,
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "stampUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "signatorName" TEXT,
  ADD COLUMN IF NOT EXISTS "signatorRole" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccount" TEXT,
  ADD COLUMN IF NOT EXISTS "bankIban" TEXT,
  ADD COLUMN IF NOT EXISTS "bankSwift" TEXT,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT,
  ADD COLUMN IF NOT EXISTS "costPerSqMeter" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sellPerSqMeter" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- =============================================================================
-- USER — doplnění sloupců + normalizace rolí
-- =============================================================================

ALTER TABLE IF EXISTS "User"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
  ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

-- Převod starých rolí z původního Prisma světa do nového business modelu.
UPDATE "User" SET role = 'SUPERADMIN'    WHERE role::text = 'PLATFORM_OWNER';
UPDATE "User" SET role = 'REDITEL'       WHERE role::text = 'COMPANY_ADMIN';
UPDATE "User" SET role = 'VEDOUCI'       WHERE role::text = 'MANAGER';
UPDATE "User" SET role = 'MONTER'        WHERE role::text = 'EMPLOYEE';

-- Pokud je role pořád text / jiný enum, zkus převést na role_enum.
DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type
    INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'User'
    AND column_name = 'role'
    AND table_schema = 'public';

  IF current_type <> 'USER-DEFINED' THEN
    BEGIN
      ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;
      ALTER TABLE "User" ALTER COLUMN role TYPE role_enum USING role::text::role_enum;
      ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'MONTER'::role_enum;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Převod sloupce User.role na role_enum se nepodařil automaticky: %', SQLERRM;
    END;
  ELSE
    BEGIN
      ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;
      ALTER TABLE "User" ALTER COLUMN role TYPE role_enum USING role::text::role_enum;
      ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'MONTER'::role_enum;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'User.role už je user-defined typ, ale převod na role_enum vyžaduje ruční zásah: %', SQLERRM;
    END;
  END IF;
END $$;

-- =============================================================================
-- PROJECT
-- =============================================================================

ALTER TABLE IF EXISTS "Project"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS "clientName" TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "plannedStart" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "plannedEnd" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS budget DOUBLE PRECISION;

-- =============================================================================
-- PROJECT ASSIGNMENT / CHAT / DAILY LOG / CONSUMABLES / INVOICE — create if missing
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ProjectAssignment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT,
  UNIQUE ("projectId", "userId", "companyId")
);

CREATE TABLE IF NOT EXISTS "ProjectChat" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ConsumablesSummary" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL UNIQUE REFERENCES "Company"(id) ON DELETE CASCADE,
  "totalScrews" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalTapeMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalRivets" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalSealant" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Invoice" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "invoiceNumber" TEXT NOT NULL,
  "clientName" TEXT,
  "clientIco" TEXT,
  "clientDic" TEXT,
  "clientAddress" TEXT,
  amount DOUBLE PRECISION NOT NULL,
  "amountVat" DOUBLE PRECISION,
  "amountTotal" DOUBLE PRECISION,
  currency TEXT NOT NULL DEFAULT 'CZK',
  "vatRate" DOUBLE PRECISION DEFAULT 21.0,
  status invoice_status_enum NOT NULL DEFAULT 'ISSUED',
  "dueDate" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  "issuedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "projectId" UUID,
  "variableSymbol" TEXT,
  "constantSymbol" TEXT,
  note TEXT,
  "qrPaymentData" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DailyLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID REFERENCES "Project"(id) ON DELETE SET NULL,
  "authorId" UUID REFERENCES "User"(id) ON DELETE RESTRICT,
  "logDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weather TEXT,
  content TEXT NOT NULL DEFAULT '',
  attachments TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isLocked" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pokud legacy DailyLog ještě používá authorName, udělej backfill do authorId.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'DailyLog' AND column_name = 'authorName' AND table_schema = 'public'
  ) THEN
    UPDATE "DailyLog" d
    SET "authorId" = u.id
    FROM "User" u
    WHERE d."authorId" IS NULL
      AND d."authorName" = u.id::text;
  END IF;
END $$;

-- =============================================================================
-- ATTENDANCE — převod staré struktury na novou
-- =============================================================================

ALTER TABLE IF EXISTS "Attendance"
  ADD COLUMN IF NOT EXISTS "companyId" UUID,
  ADD COLUMN IF NOT EXISTS type attendance_type_enum,
  ADD COLUMN IF NOT EXISTS status attendance_status_enum,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS "editedBy" UUID,
  ADD COLUMN IF NOT EXISTS "editReason" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- companyId backfill podle uživatele
UPDATE "Attendance" a
SET "companyId" = u."companyId"
FROM "User" u
WHERE a."companyId" IS NULL
  AND a."userId" = u.id;

-- Legacy gpsLat/gpsLng -> lat/lng
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='Attendance' AND column_name='gpsLat' AND table_schema='public'
  ) THEN
    UPDATE "Attendance" SET lat = COALESCE(lat, "gpsLat") WHERE lat IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='Attendance' AND column_name='gpsLng' AND table_schema='public'
  ) THEN
    UPDATE "Attendance" SET lng = COALESCE(lng, "gpsLng") WHERE lng IS NULL;
  END IF;
END $$;

-- Legacy checkIn -> createdAt, type/status default map.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='Attendance' AND column_name='checkIn' AND table_schema='public'
  ) THEN
    UPDATE "Attendance"
    SET "createdAt" = COALESCE("createdAt", "checkIn")
    WHERE "createdAt" IS NULL;
  END IF;
END $$;

UPDATE "Attendance" SET type = COALESCE(type, 'PRICHOD'::attendance_type_enum) WHERE type IS NULL;
UPDATE "Attendance" SET status = COALESCE(status, 'PRACE'::attendance_status_enum) WHERE status IS NULL;
UPDATE "Attendance" SET "createdAt" = COALESCE("createdAt", NOW()) WHERE "createdAt" IS NULL;

ALTER TABLE IF EXISTS "Attendance"
  ALTER COLUMN "companyId" SET NOT NULL,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN "createdAt" SET NOT NULL;

-- =============================================================================
-- VZT COMPONENT — doplnění chybějících sloupců
-- =============================================================================

ALTER TABLE IF EXISTS "VztComponent"
  ADD COLUMN IF NOT EXISTS "companyId" UUID,
  ADD COLUMN IF NOT EXISTS angle DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "requiresAccessDoor" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "projectId" UUID,
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Backfill companyId z projektů není obecně jistý. Pokud chybí a existuje projectId, doplň podle projektu.
UPDATE "VztComponent" vc
SET "companyId" = p."companyId"
FROM "Project" p
WHERE vc."companyId" IS NULL
  AND vc."projectId" = p.id;

-- =============================================================================
-- INVENTORY / MOVEMENTS / TASKS — create if missing
-- =============================================================================

CREATE TABLE IF NOT EXISTS "InventoryItem" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  "minQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  location TEXT,
  "supplierId" TEXT,
  "purchasePrice" DOUBLE PRECISION,
  "sellPrice" DOUBLE PRECISION,
  category TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "itemId" UUID NOT NULL REFERENCES "InventoryItem"(id) ON DELETE CASCADE,
  type inventory_movement_type_enum NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  "quantityBefore" DOUBLE PRECISION NOT NULL,
  "quantityAfter" DOUBLE PRECISION NOT NULL,
  "projectId" UUID,
  note TEXT,
  "documentRef" TEXT,
  "createdBy" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS "Task"
  ADD COLUMN IF NOT EXISTS "projectId" UUID,
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- =============================================================================
-- SETTINGS / PERMISSIONS / DOCUMENTS / IMPORT / EXPORT / SIGNATURES / AUDIT
-- =============================================================================

CREATE TABLE IF NOT EXISTS "CompanySettings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL UNIQUE REFERENCES "Company"(id) ON DELETE CASCADE,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locale TEXT NOT NULL DEFAULT 'cs-CZ',
  timezone TEXT NOT NULL DEFAULT 'Europe/Prague',
  currency TEXT NOT NULL DEFAULT 'CZK',
  "dateFormat" TEXT NOT NULL DEFAULT 'DD.MM.YYYY',
  "timeFormat" TEXT NOT NULL DEFAULT 'HH:mm',
  "firstDayOfWeek" INTEGER NOT NULL DEFAULT 1,
  "decimalSeparator" TEXT NOT NULL DEFAULT ',',
  "thousandsSeparator" TEXT NOT NULL DEFAULT ' ',
  "distanceUnit" TEXT NOT NULL DEFAULT 'm',
  "weightUnit" TEXT NOT NULL DEFAULT 'kg',
  "areaUnit" TEXT NOT NULL DEFAULT 'm2',
  "invoicePrefix" TEXT NOT NULL DEFAULT 'FA',
  "invoiceSuffix" TEXT,
  "invoicePadding" INTEGER NOT NULL DEFAULT 4,
  "invoiceResetCycle" TEXT NOT NULL DEFAULT 'YEARLY',
  "invoiceStartNumber" INTEGER NOT NULL DEFAULT 1,
  "dailyLogPrefix" TEXT NOT NULL DEFAULT 'DEN',
  "attendanceExportPrefix" TEXT NOT NULL DEFAULT 'DOC',
  "handoverProtocolPrefix" TEXT NOT NULL DEFAULT 'PP',
  "priceOfferPrefix" TEXT NOT NULL DEFAULT 'CN',
  "enabledModules" TEXT[] NOT NULL DEFAULT ARRAY['dochazka','projekty','denik','kalkulacka','faktury','sklad','team','nastaveni','documents','imports','exports']::TEXT[],
  "defaultExportFormat" TEXT NOT NULL DEFAULT 'pdf',
  "defaultSignatureLevel" TEXT NOT NULL DEFAULT 'INTERNAL_APPROVAL',
  "retentionPolicyDays" INTEGER NOT NULL DEFAULT 3650,
  "autoArchiveAfterDays" INTEGER NOT NULL DEFAULT 365,
  "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "notificationEmail" TEXT
);

CREATE TABLE IF NOT EXISTS "ModuleSettings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "moduleKey" TEXT NOT NULL,
  "settingsJson" JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  "updatedBy" UUID,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("companyId", "moduleKey")
);

CREATE TABLE IF NOT EXISTS "Permission" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  "moduleKey" TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "RolePermission" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role role_enum NOT NULL,
  "permissionId" UUID NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (role, "permissionId")
);

CREATE TABLE IF NOT EXISTS "UserPermissionOverride" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "permissionId" UUID NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL,
  reason TEXT,
  "grantedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "permissionId")
);

CREATE TABLE IF NOT EXISTS "ApprovalFlow" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "documentType" document_type_enum NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "autoApprove" BOOLEAN NOT NULL DEFAULT FALSE,
  "autoApproveCondition" JSONB,
  "slaDays" INTEGER,
  "escalateAfterDays" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DocumentTemplate" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "documentType" document_type_enum NOT NULL,
  locale TEXT NOT NULL DEFAULT 'cs',
  format export_format_enum NOT NULL DEFAULT 'PDF',
  "templateBody" TEXT NOT NULL DEFAULT '',
  placeholders JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "signatureRules" JSONB,
  "approvalFlowId" UUID REFERENCES "ApprovalFlow"(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Document" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "documentType" document_type_enum NOT NULL,
  "documentNumber" TEXT,
  status document_status_enum NOT NULL DEFAULT 'DRAFT',
  "templateId" UUID REFERENCES "DocumentTemplate"(id) ON DELETE SET NULL,
  "projectId" UUID REFERENCES "Project"(id) ON DELETE SET NULL,
  "invoiceId" UUID REFERENCES "Invoice"(id) ON DELETE SET NULL,
  "authorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "approverId" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  locale TEXT NOT NULL DEFAULT 'cs',
  title TEXT NOT NULL,
  "dataJson" JSONB,
  note TEXT,
  attachments TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "hashBefore" TEXT,
  "hashAfter" TEXT,
  "currentVersionId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DocumentVersion" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  "contentUrl" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "generatedBy" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  note TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("documentId", version)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'Document'
      AND constraint_name = 'document_current_version_fk'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "Document"
      ADD CONSTRAINT document_current_version_fk
      FOREIGN KEY ("currentVersionId") REFERENCES "DocumentVersion"(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DocumentSignature" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
  "signatureRequestId" UUID,
  "signerId" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "signerName" TEXT NOT NULL,
  "signerRole" TEXT,
  "signatureLevel" signature_level_enum NOT NULL,
  provider TEXT,
  "signedAt" TIMESTAMPTZ,
  ip TEXT,
  "deviceInfo" TEXT,
  "certificateRef" TEXT,
  "hashBefore" TEXT,
  "hashAfter" TEXT,
  "signedFileUrl" TEXT,
  "providerResponse" JSONB,
  "isRevoked" BOOLEAN NOT NULL DEFAULT FALSE,
  "revokedAt" TIMESTAMPTZ,
  "revokeReason" TEXT,
  "auditEventId" UUID
);

CREATE TABLE IF NOT EXISTS "DocumentExport" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
  format export_format_enum NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileHash" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "exportedBy" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  signed BOOLEAN NOT NULL DEFAULT FALSE,
  encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  watermarked BOOLEAN NOT NULL DEFAULT FALSE,
  "exportedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ApprovalFlowStep" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "flowId" UUID NOT NULL REFERENCES "ApprovalFlow"(id) ON DELETE CASCADE,
  "stepOrder" INTEGER NOT NULL,
  "stepType" approval_step_type_enum NOT NULL,
  label TEXT NOT NULL,
  "requiredRole" role_enum,
  "requiredUserId" UUID,
  "isOptional" BOOLEAN NOT NULL DEFAULT FALSE,
  "daysToComplete" INTEGER,
  UNIQUE ("flowId", "stepOrder")
);

CREATE TABLE IF NOT EXISTS "ApprovalDecision" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "flowId" UUID NOT NULL REFERENCES "ApprovalFlow"(id) ON DELETE CASCADE,
  "documentId" UUID NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "stepOrder" INTEGER NOT NULL,
  decision TEXT NOT NULL,
  comment TEXT,
  "decidedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ImportProfile" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  format import_format_enum NOT NULL DEFAULT 'CSV',
  encoding TEXT NOT NULL DEFAULT 'UTF-8',
  delimiter TEXT NOT NULL DEFAULT ';',
  "hasHeaderRow" BOOLEAN NOT NULL DEFAULT TRUE,
  "startRow" INTEGER NOT NULL DEFAULT 1,
  "dateFormat" TEXT NOT NULL DEFAULT 'DD.MM.YYYY',
  "decimalSeparator" TEXT NOT NULL DEFAULT ',',
  "trimWhitespace" BOOLEAN NOT NULL DEFAULT TRUE,
  "normalizeDiacritics" BOOLEAN NOT NULL DEFAULT FALSE,
  "duplicateStrategy" TEXT NOT NULL DEFAULT 'SKIP',
  "rollbackOnError" BOOLEAN NOT NULL DEFAULT FALSE,
  "fieldMapping" JSONB NOT NULL,
  "validationRules" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ImportJob" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "profileId" UUID REFERENCES "ImportProfile"(id) ON DELETE SET NULL,
  "moduleKey" TEXT NOT NULL,
  status import_job_status_enum NOT NULL DEFAULT 'PENDING',
  "sourceFileName" TEXT NOT NULL,
  "sourceFileUrl" TEXT NOT NULL,
  "sourceFileHash" TEXT,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "successRows" INTEGER NOT NULL DEFAULT 0,
  "warningRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "updatedRows" INTEGER NOT NULL DEFAULT 0,
  "isDryRun" BOOLEAN NOT NULL DEFAULT FALSE,
  "startedBy" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ,
  "rollbackAt" TIMESTAMPTZ,
  "errorLog" JSONB,
  "auditReason" TEXT
);

CREATE TABLE IF NOT EXISTS "ImportJobRow" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" UUID NOT NULL REFERENCES "ImportJob"(id) ON DELETE CASCADE,
  "rowNumber" INTEGER NOT NULL,
  "rawData" JSONB NOT NULL,
  "parsedData" JSONB,
  status TEXT NOT NULL,
  messages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "importedRecordId" UUID
);

CREATE TABLE IF NOT EXISTS "ExportProfile" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  format export_format_enum NOT NULL DEFAULT 'PDF',
  "includeMetadata" BOOLEAN NOT NULL DEFAULT TRUE,
  "includeAudit" BOOLEAN NOT NULL DEFAULT FALSE,
  anonymize BOOLEAN NOT NULL DEFAULT FALSE,
  signed BOOLEAN NOT NULL DEFAULT FALSE,
  "signatureLevel" signature_level_enum NOT NULL DEFAULT 'INTERNAL_APPROVAL',
  watermark BOOLEAN NOT NULL DEFAULT FALSE,
  "watermarkText" TEXT,
  "passwordProtect" BOOLEAN NOT NULL DEFAULT FALSE,
  "encryptZip" BOOLEAN NOT NULL DEFAULT FALSE,
  compress BOOLEAN NOT NULL DEFAULT FALSE,
  "includeBranding" BOOLEAN NOT NULL DEFAULT TRUE,
  "includeAttachments" BOOLEAN NOT NULL DEFAULT FALSE,
  "filterPreset" JSONB,
  "columnPreset" JSONB,
  "sortOrder" JSONB,
  "timezoneNormalize" BOOLEAN NOT NULL DEFAULT TRUE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ExportJob" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "profileId" UUID REFERENCES "ExportProfile"(id) ON DELETE SET NULL,
  "moduleKey" TEXT NOT NULL,
  status export_job_status_enum NOT NULL DEFAULT 'PENDING',
  format export_format_enum NOT NULL,
  filters JSONB,
  "outputFileName" TEXT,
  "outputFileUrl" TEXT,
  "outputFileHash" TEXT,
  "outputSizeBytes" INTEGER,
  "recordCount" INTEGER,
  "startedBy" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ,
  "signatureRequestId" UUID,
  "errorMessage" TEXT
);

CREATE TABLE IF NOT EXISTS "SignatureProvider" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "apiUrl" TEXT,
  "authMethod" TEXT,
  "apiKey" TEXT,
  "callbackUrl" TEXT,
  "webhookSecret" TEXT,
  "supportedLevels" signature_level_enum[] NOT NULL DEFAULT ARRAY['INTERNAL_APPROVAL'::signature_level_enum],
  "certPath" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SignatureRequest" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "documentId" UUID REFERENCES "Document"(id) ON DELETE SET NULL,
  "exportJobId" UUID,
  "providerId" UUID NOT NULL REFERENCES "SignatureProvider"(id) ON DELETE RESTRICT,
  "signerId" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "signerEmail" TEXT,
  "signerName" TEXT NOT NULL,
  "signatureLevel" signature_level_enum NOT NULL,
  status signature_request_status_enum NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMPTZ,
  "signingUrl" TEXT,
  "providerRequestId" TEXT,
  "providerResponse" JSONB,
  "signedAt" TIMESTAMPTZ,
  "ipAddress" TEXT,
  "deviceInfo" TEXT,
  "reminderSentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SignatureArtifact" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL REFERENCES "SignatureRequest"(id) ON DELETE CASCADE,
  "originalFileUrl" TEXT NOT NULL,
  "originalFileHash" TEXT NOT NULL,
  "signedFileUrl" TEXT NOT NULL,
  "signedFileHash" TEXT NOT NULL,
  "timestampToken" TEXT,
  "certificateInfo" JSONB,
  "validationReport" JSONB,
  "archivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID REFERENCES "Company"(id) ON DELETE SET NULL,
  "userId" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  "moduleKey" TEXT,
  "entityType" TEXT,
  "entityId" UUID,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "deviceInfo" TEXT,
  "operationHash" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'DocumentSignature'
      AND constraint_name = 'document_signature_request_fk'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "DocumentSignature"
      ADD CONSTRAINT document_signature_request_fk
      FOREIGN KEY ("signatureRequestId") REFERENCES "SignatureRequest"(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ExportJob'
      AND constraint_name = 'export_job_signature_request_fk'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "ExportJob"
      ADD CONSTRAINT export_job_signature_request_fk
      FOREIGN KEY ("signatureRequestId") REFERENCES "SignatureRequest"(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'SignatureRequest'
      AND constraint_name = 'signature_request_export_job_fk'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE "SignatureRequest"
      ADD CONSTRAINT signature_request_export_job_fk
      FOREIGN KEY ("exportJobId") REFERENCES "ExportJob"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- DATA BACKFILL
-- =============================================================================

-- Consumables summary musí existovat pro každou firmu.
INSERT INTO "ConsumablesSummary" (id, "companyId", "totalScrews", "totalTapeMeters", "totalRivets", "totalSealant", "updatedAt")
SELECT gen_random_uuid(), c.id, 0, 0, 0, 0, NOW()
FROM "Company" c
WHERE NOT EXISTS (
  SELECT 1 FROM "ConsumablesSummary" s WHERE s."companyId" = c.id
);

-- CompanySettings pokud chybí.
INSERT INTO "CompanySettings" (
  id, "companyId", locale, timezone, currency, "dateFormat", "timeFormat", "firstDayOfWeek",
  "decimalSeparator", "thousandsSeparator", "distanceUnit", "weightUnit", "areaUnit",
  "invoicePrefix", "invoicePadding", "invoiceResetCycle", "invoiceStartNumber",
  "dailyLogPrefix", "attendanceExportPrefix", "handoverProtocolPrefix", "priceOfferPrefix",
  "enabledModules", "defaultExportFormat", "defaultSignatureLevel", "retentionPolicyDays",
  "autoArchiveAfterDays", "emailNotificationsEnabled", "updatedAt"
)
SELECT
  gen_random_uuid(), c.id, 'cs-CZ', 'Europe/Prague', 'CZK', 'DD.MM.YYYY', 'HH:mm', 1,
  ',', ' ', 'm', 'kg', 'm2',
  'FA', 4, 'YEARLY', 1,
  'DEN', 'DOC', 'PP', 'CN',
  ARRAY['reporty','dochazka','projekty','chat','denik','kalkulacka','faktury','sklad','team','nastaveni','documents','imports','exports']::TEXT[],
  'pdf', 'INTERNAL_APPROVAL', 3650, 365, FALSE, NOW()
FROM "Company" c
WHERE NOT EXISTS (
  SELECT 1 FROM "CompanySettings" s WHERE s."companyId" = c.id
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_company ON "User"("companyId");
CREATE INDEX IF NOT EXISTS idx_project_company ON "Project"("companyId");
CREATE INDEX IF NOT EXISTS idx_attendance_company_created ON "Attendance"("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_user_created ON "Attendance"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_dailylog_company_created ON "DailyLog"("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_projectchat_project_created ON "ProjectChat"("projectId", "createdAt" ASC);
CREATE INDEX IF NOT EXISTS idx_invoice_company_status ON "Invoice"("companyId", status);
CREATE INDEX IF NOT EXISTS idx_vzt_company_created ON "VztComponent"("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_module_settings_company_key ON "ModuleSettings"("companyId", "moduleKey");
CREATE INDEX IF NOT EXISTS idx_document_company_status ON "Document"("companyId", status);
CREATE INDEX IF NOT EXISTS idx_import_job_company_status ON "ImportJob"("companyId", status);
CREATE INDEX IF NOT EXISTS idx_export_job_company_status ON "ExportJob"("companyId", status);
CREATE INDEX IF NOT EXISTS idx_signature_request_status ON "SignatureRequest"(status);
CREATE INDEX IF NOT EXISTS idx_audit_company_created ON "AuditLog"("companyId", "createdAt" DESC);

-- =============================================================================
-- updatedAt triggers
-- =============================================================================

DROP TRIGGER IF EXISTS trg_company_updated_at ON "Company";
CREATE TRIGGER trg_company_updated_at BEFORE UPDATE ON "Company" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_updated_at ON "User";
CREATE TRIGGER trg_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_project_updated_at ON "Project";
CREATE TRIGGER trg_project_updated_at BEFORE UPDATE ON "Project" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON "Attendance";
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON "Attendance" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_dailylog_updated_at ON "DailyLog";
CREATE TRIGGER trg_dailylog_updated_at BEFORE UPDATE ON "DailyLog" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoice_updated_at ON "Invoice";
CREATE TRIGGER trg_invoice_updated_at BEFORE UPDATE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON "CompanySettings";
CREATE TRIGGER trg_company_settings_updated_at BEFORE UPDATE ON "CompanySettings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_module_settings_updated_at ON "ModuleSettings";
CREATE TRIGGER trg_module_settings_updated_at BEFORE UPDATE ON "ModuleSettings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_document_template_updated_at ON "DocumentTemplate";
CREATE TRIGGER trg_document_template_updated_at BEFORE UPDATE ON "DocumentTemplate" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_document_updated_at ON "Document";
CREATE TRIGGER trg_document_updated_at BEFORE UPDATE ON "Document" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_import_profile_updated_at ON "ImportProfile";
CREATE TRIGGER trg_import_profile_updated_at BEFORE UPDATE ON "ImportProfile" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_export_profile_updated_at ON "ExportProfile";
CREATE TRIGGER trg_export_profile_updated_at BEFORE UPDATE ON "ExportProfile" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_signature_provider_updated_at ON "SignatureProvider";
CREATE TRIGGER trg_signature_provider_updated_at BEFORE UPDATE ON "SignatureProvider" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_signature_request_updated_at ON "SignatureRequest";
CREATE TRIGGER trg_signature_request_updated_at BEFORE UPDATE ON "SignatureRequest" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
