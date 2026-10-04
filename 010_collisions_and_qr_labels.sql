-- =============================================================================
-- PWA-VZT-SYSTEM
-- 010_collisions_and_qr_labels.sql
-- Kolizní engine, AI troubleshooting v projektu, QR štítky, PDF export
-- Schema odpovídá skutečné struktuře DB (Permission: id, key, "moduleKey", label, description, "createdAt"
--                                    RolePermission: id, role, "permissionId", granted)
-- =============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE collision_kind_enum AS ENUM (
    'PERSON_OVERLAP_DAY',
    'MATERIAL_RACE',
    'BUDGET_OVERRUN',
    'SCHEDULE_OVERLAP',
    'SKILL_MISMATCH'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE collision_status_enum AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CollisionAlert" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  kind collision_kind_enum NOT NULL,
  status collision_status_enum NOT NULL DEFAULT 'OPEN',
  severity TEXT NOT NULL DEFAULT 'WARNING',
  "projectId" UUID REFERENCES "Project"(id) ON DELETE CASCADE,
  "userId" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "itemId" UUID REFERENCES "InventoryItem"(id) ON DELETE SET NULL,
  "day" DATE,
  "detailJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_CollisionAlert_companyId_status"
  ON "CollisionAlert" ("companyId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_CollisionAlert_project"
  ON "CollisionAlert" ("projectId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "ProjectTroubleshooting" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "imageUrl" TEXT,
  category TEXT NOT NULL DEFAULT 'OTHER',
  severity TEXT NOT NULL DEFAULT 'INFO',
  "answerText" TEXT,
  "relatedMaterials" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "relatedAttendances" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ProjectTroubleshooting_project"
  ON "ProjectTroubleshooting" ("projectId", "createdAt" DESC);

INSERT INTO "Permission" (id, key, "moduleKey", label, description, "createdAt")
VALUES
  (gen_random_uuid(), 'collisions.read', 'collisions', 'Číst kolize', 'Vidět kolize v systému', NOW()),
  (gen_random_uuid(), 'collisions.manage', 'collisions', 'Spravovat kolize', 'Aktualizovat stav kolizí', NOW()),
  (gen_random_uuid(), 'projects.troubleshoot', 'projects', 'AI troubleshooting projektu', 'AI troubleshooting v projektu', NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'SUPERADMIN'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('collisions.read', 'collisions.manage', 'projects.troubleshoot')
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'REDITEL'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('collisions.read', 'collisions.manage', 'projects.troubleshoot')
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'VEDOUCI'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('collisions.read', 'collisions.manage', 'projects.troubleshoot')
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'ADMINISTRACE'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('collisions.read', 'collisions.manage')
ON CONFLICT (role, "permissionId") DO NOTHING;

INSERT INTO "RolePermission" (id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'MONTER'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('collisions.read', 'projects.troubleshoot')
ON CONFLICT (role, "permissionId") DO NOTHING;

COMMIT;
