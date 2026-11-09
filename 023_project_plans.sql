-- =============================================================================
-- PWA-VZT-SYSTEM
-- 023_project_plans.sql
-- Modul PLAN VIEWER: výkresy/plány projektu (obrázky, PDF, DXF, DWG) + markery
-- Čistě aditivní migrace, bez destruktivních operací.
-- =============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE plan_format_enum AS ENUM ('IMAGE', 'PDF', 'DXF', 'DWG');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_discipline_enum AS ENUM ('VZT', 'ELEKTRO', 'VODA', 'TOPENI', 'STAVEBNI', 'SITUACE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_status_enum AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ProjectPlan" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  discipline plan_discipline_enum NOT NULL DEFAULT 'OTHER',
  format plan_format_enum NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "fileSizeBytes" BIGINT,
  version INTEGER NOT NULL DEFAULT 1,
  "parentPlanId" UUID REFERENCES "ProjectPlan"(id) ON DELETE SET NULL,
  status plan_status_enum NOT NULL DEFAULT 'ACTIVE',
  "uploadedBy" UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  note TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ProjectPlan_project_status"
  ON "ProjectPlan" ("projectId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_ProjectPlan_company"
  ON "ProjectPlan" ("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_ProjectPlan_parent"
  ON "ProjectPlan" ("parentPlanId");

CREATE TABLE IF NOT EXISTS "ProjectPlanMarker" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "planId" UUID NOT NULL REFERENCES "ProjectPlan"(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "authorId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "positionX" DOUBLE PRECISION NOT NULL,
  "positionY" DOUBLE PRECISION NOT NULL,
  "pageNumber" INTEGER NOT NULL DEFAULT 1,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ProjectPlanMarker_positionX_check" CHECK ("positionX" >= 0 AND "positionX" <= 1),
  CONSTRAINT "ProjectPlanMarker_positionY_check" CHECK ("positionY" >= 0 AND "positionY" <= 1)
);

CREATE INDEX IF NOT EXISTS "idx_ProjectPlanMarker_plan"
  ON "ProjectPlanMarker" ("planId", "createdAt");

INSERT INTO "Permission" (id, key, "moduleKey", label, description, "createdAt")
VALUES
  (gen_random_uuid(), 'plans.read', 'plans', 'Číst výkresy', 'Prohlížet výkresy a plány projektu'),
  (gen_random_uuid(), 'plans.manage', 'plans', 'Spravovat výkresy', 'Nahrávat, verzovat a archivovat výkresy'),
  (gen_random_uuid(), 'plans.annotate', 'plans', 'Komentovat výkresy', 'Přidávat a mazat značky/komentáře do výkresu')
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'SUPERADMIN'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('plans.read', 'plans.manage', 'plans.annotate')
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'REDITEL'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('plans.read', 'plans.manage', 'plans.annotate')
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'VEDOUCI'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('plans.read', 'plans.manage', 'plans.annotate')
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'ADMINISTRACE'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('plans.read', 'plans.manage')
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'MONTER'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('plans.read', 'plans.annotate')
ON CONFLICT (role, "permissionId") DO NOTHING;

COMMIT;
