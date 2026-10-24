ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "shiftStart" TEXT NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS "shiftEnd" TEXT NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS "breakMinutes" INTEGER NOT NULL DEFAULT 60;

UPDATE "Project"
SET "breakMinutes" = CASE
  WHEN MOD(
    (SPLIT_PART("shiftEnd", ':', 1)::INTEGER * 60 + SPLIT_PART("shiftEnd", ':', 2)::INTEGER)
    - (SPLIT_PART("shiftStart", ':', 1)::INTEGER * 60 + SPLIT_PART("shiftStart", ':', 2)::INTEGER)
    + 1440, 1440
  ) >= 480 THEN 60
  ELSE 30
END;
