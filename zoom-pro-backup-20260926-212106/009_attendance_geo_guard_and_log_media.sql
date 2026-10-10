ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "distanceFromProjectM" DOUBLE PRECISION;

ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "withinProjectRadius" BOOLEAN;

ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "geoStatus" TEXT NOT NULL DEFAULT 'NO_PROJECT';

ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "projectRadiusSnapshot" DOUBLE PRECISION;

ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "projectAddressSnapshot" TEXT;

CREATE INDEX IF NOT EXISTS "idx_Attendance_geoStatus_createdAt"
  ON "Attendance" ("geoStatus", "createdAt" DESC);
