ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "gpsMode" TEXT NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "locationNote" TEXT;

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "locationUpdatedAt" TIMESTAMPTZ;

ALTER TABLE "ProjectChat"
  ADD COLUMN IF NOT EXISTS "attachmentType" TEXT;

ALTER TABLE "ProjectChat"
  ADD COLUMN IF NOT EXISTS "galleryCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ProjectGalleryItem" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "sourceChatId" UUID REFERENCES "ProjectChat"(id) ON DELETE SET NULL,
  "imageUrl" TEXT NOT NULL,
  caption TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ProjectGalleryItem_projectId_createdAt"
  ON "ProjectGalleryItem" ("projectId", "createdAt" DESC);

UPDATE "Project"
SET "gpsMode" = COALESCE("gpsMode", 'MANUAL')
WHERE "gpsMode" IS NULL;
