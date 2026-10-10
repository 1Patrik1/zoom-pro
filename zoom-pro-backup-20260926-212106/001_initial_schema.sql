-- =============================================================================
-- PWA-VZT-SYSTEM
-- 001_initial_schema.sql
-- Kompletní PostgreSQL DDL migrace pro sjednocený ERP/PWA model
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
    'INVOICE',
    'PROFORMA_INVOICE',
    'CREDIT_NOTE',
    'ATTENDANCE_STATEMENT',
    'ATTENDANCE_CLOSURE',
    'DAILY_LOG_ENTRY',
    'DAILY_LOG_REPORT',
    'PROJECT_ASSIGNMENT',
    'PROJECT_HANDOVER_PROTOCOL',
    'CHANGE_PROTOCOL',
    'INVENTORY_ISSUE_NOTE',
    'INVENTORY_RECEIPT_NOTE',
    'INVENTORY_AUDIT_PROTOCOL',
    'VZT_CALCULATION_SHEET',
    'VZT_PRODUCTION_SHEET',
    'PRICE_OFFER',
    'SERVICE_REPORT',
    'LICENSE_AGREEMENT',
    'USER_APPROVAL',
    'SIGNATURE_AUTHORIZATION',
    'PAYMENT_REMINDER',
    'PAYMENT_CONFIRMATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_status_enum AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'PENDING_APPROVAL',
    'APPROVED',
    'PENDING_SIGNATURE',
    'SIGNED',
    'EXPORTED',
    'ARCHIVED',
    'REJECTED',
    'CANCELLED',
    'SUPERSEDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE signature_level_enum AS ENUM (
    'INTERNAL_APPROVAL',
    'SIMPLE',
    'ADVANCED',
    'QUALIFIED',
    'ELECTRONIC_SEAL',
    'TIMESTAMP_ONLY'
  );
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
-- HELPER TRIGGER FOR updatedAt
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS "Company" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  ico TEXT,
  dic TEXT,
  street TEXT,
  city TEXT,
  zip TEXT,
  country TEXT DEFAULT 'CZ',
  phone TEXT,
  email TEXT,
  web TEXT,

  "logoUrl" TEXT,
  "stampUrl" TEXT,
  "signatorName" TEXT,
  "signatorRole" TEXT,

  "bankAccount" TEXT,
  "bankIban" TEXT,
  "bankSwift" TEXT,
  "bankName" TEXT,

  "costPerSqMeter" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sellPerSqMeter" DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role role_enum NOT NULL DEFAULT 'MONTER',
  "isApproved" BOOLEAN NOT NULL DEFAULT FALSE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  "firstName" TEXT,
  "lastName" TEXT,
  phone TEXT,
  "avatarUrl" TEXT,
  "employeeId" TEXT,
  "twoFactorSecret" TEXT,
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "License" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "validFrom" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "validUntil" TIMESTAMPTZ NOT NULL,
  tier TEXT NOT NULL,
  "maxUsers" INTEGER NOT NULL DEFAULT 10,
  "maxProjects" INTEGER NOT NULL DEFAULT 20,
  "storageQuotaMb" INTEGER NOT NULL DEFAULT 1024,
  "enabledModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "signaturesEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "exportsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "importsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "apiEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- OPERATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS "Project" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  address TEXT,
  code TEXT,
  "clientName" TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  "plannedStart" TIMESTAMPTZ,
  "plannedEnd" TIMESTAMPTZ,
  budget DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS "ProjectAssignment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT,
  UNIQUE ("projectId", "userId", "companyId")
);

CREATE TABLE IF NOT EXISTS "Attendance" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID REFERENCES "Project"(id) ON DELETE SET NULL,
  type attendance_type_enum NOT NULL,
  status attendance_status_enum NOT NULL DEFAULT 'PRACE',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  note TEXT,
  "editedBy" UUID,
  "editReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DailyLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID REFERENCES "Project"(id) ON DELETE SET NULL,
  "authorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "logDate" TIMESTAMPTZ NOT NULL,
  weather TEXT,
  content TEXT NOT NULL,
  attachments TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isLocked" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS "VztComponent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  width2 DOUBLE PRECISION,
  height2 DOUBLE PRECISION,
  length DOUBLE PRECISION NOT NULL,
  angle DOUBLE PRECISION,
  "offset" DOUBLE PRECISION,
  "surfaceArea" DOUBLE PRECISION NOT NULL,
  weight DOUBLE PRECISION NOT NULL,
  "requiresAccessDoor" BOOLEAN NOT NULL DEFAULT FALSE,
  "projectId" UUID,
  note TEXT,
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
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("companyId", "invoiceNumber")
);

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

CREATE TABLE IF NOT EXISTS "Task" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  "isDone" BOOLEAN NOT NULL DEFAULT FALSE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID,
  "dueDate" TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SETTINGS
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

  "enabledModules" TEXT[] NOT NULL DEFAULT ARRAY['dochazka','projekty','denik','kalkulacka','faktury','sklad','team','nastaveni']::TEXT[],
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

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

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

-- =============================================================================
-- DOCUMENTS
-- =============================================================================

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
  "templateBody" TEXT NOT NULL,
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

ALTER TABLE "Document"
  ADD CONSTRAINT document_current_version_fk
  FOREIGN KEY ("currentVersionId") REFERENCES "DocumentVersion"(id) ON DELETE SET NULL;

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

-- =============================================================================
-- IMPORT / EXPORT
-- =============================================================================

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

-- =============================================================================
-- SIGNATURES
-- =============================================================================

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

-- =============================================================================
-- AUDIT
-- =============================================================================

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

-- =============================================================================
-- POST-CREATION FOREIGN KEYS FOR CYCLIC REFERENCES
-- =============================================================================

ALTER TABLE "DocumentSignature"
  ADD CONSTRAINT document_signature_request_fk
  FOREIGN KEY ("signatureRequestId") REFERENCES "SignatureRequest"(id) ON DELETE SET NULL;

ALTER TABLE "ExportJob"
  ADD CONSTRAINT export_job_signature_request_fk
  FOREIGN KEY ("signatureRequestId") REFERENCES "SignatureRequest"(id) ON DELETE SET NULL;

ALTER TABLE "SignatureRequest"
  ADD CONSTRAINT signature_request_export_job_fk
  FOREIGN KEY ("exportJobId") REFERENCES "ExportJob"(id) ON DELETE SET NULL;

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
CREATE INDEX IF NOT EXISTS idx_permission_module_key ON "Permission"("moduleKey");
CREATE INDEX IF NOT EXISTS idx_document_company_status ON "Document"("companyId", status);
CREATE INDEX IF NOT EXISTS idx_document_type_number ON "Document"("documentType", "documentNumber");
CREATE INDEX IF NOT EXISTS idx_document_export_document ON "DocumentExport"("documentId");
CREATE INDEX IF NOT EXISTS idx_import_job_company_status ON "ImportJob"("companyId", status);
CREATE INDEX IF NOT EXISTS idx_export_job_company_status ON "ExportJob"("companyId", status);
CREATE INDEX IF NOT EXISTS idx_signature_request_status ON "SignatureRequest"(status);
CREATE INDEX IF NOT EXISTS idx_audit_company_created ON "AuditLog"("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON "AuditLog"("entityType", "entityId");

-- =============================================================================
-- UPDATED AT TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trg_company_updated_at ON "Company";
CREATE TRIGGER trg_company_updated_at BEFORE UPDATE ON "Company"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_updated_at ON "User";
CREATE TRIGGER trg_user_updated_at BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_license_updated_at ON "License";
CREATE TRIGGER trg_license_updated_at BEFORE UPDATE ON "License"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_project_updated_at ON "Project";
CREATE TRIGGER trg_project_updated_at BEFORE UPDATE ON "Project"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON "Attendance";
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON "Attendance"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_dailylog_updated_at ON "DailyLog";
CREATE TRIGGER trg_dailylog_updated_at BEFORE UPDATE ON "DailyLog"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_consumables_updated_at ON "ConsumablesSummary";
CREATE TRIGGER trg_consumables_updated_at BEFORE UPDATE ON "ConsumablesSummary"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoice_updated_at ON "Invoice";
CREATE TRIGGER trg_invoice_updated_at BEFORE UPDATE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_item_updated_at ON "InventoryItem";
CREATE TRIGGER trg_inventory_item_updated_at BEFORE UPDATE ON "InventoryItem"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_task_updated_at ON "Task";
CREATE TRIGGER trg_task_updated_at BEFORE UPDATE ON "Task"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON "CompanySettings";
CREATE TRIGGER trg_company_settings_updated_at BEFORE UPDATE ON "CompanySettings"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_module_settings_updated_at ON "ModuleSettings";
CREATE TRIGGER trg_module_settings_updated_at BEFORE UPDATE ON "ModuleSettings"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_approval_flow_updated_at ON "ApprovalFlow";
CREATE TRIGGER trg_approval_flow_updated_at BEFORE UPDATE ON "ApprovalFlow"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_document_template_updated_at ON "DocumentTemplate";
CREATE TRIGGER trg_document_template_updated_at BEFORE UPDATE ON "DocumentTemplate"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_document_updated_at ON "Document";
CREATE TRIGGER trg_document_updated_at BEFORE UPDATE ON "Document"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_import_profile_updated_at ON "ImportProfile";
CREATE TRIGGER trg_import_profile_updated_at BEFORE UPDATE ON "ImportProfile"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_export_profile_updated_at ON "ExportProfile";
CREATE TRIGGER trg_export_profile_updated_at BEFORE UPDATE ON "ExportProfile"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_signature_provider_updated_at ON "SignatureProvider";
CREATE TRIGGER trg_signature_provider_updated_at BEFORE UPDATE ON "SignatureProvider"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_signature_request_updated_at ON "SignatureRequest";
CREATE TRIGGER trg_signature_request_updated_at BEFORE UPDATE ON "SignatureRequest"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
