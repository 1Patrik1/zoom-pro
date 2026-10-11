-- Žádosti firem o změnu licence a jejich vyřízení superadminem
BEGIN;

ALTER TABLE "SupportMessage"
  ADD COLUMN IF NOT EXISTS "requestType" TEXT,
  ADD COLUMN IF NOT EXISTS "requestDetails" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "handledAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "handledBy" UUID REFERENCES "User"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_message_open_requests
  ON "SupportMessage"("requestType", "handledAt", "createdAt")
  WHERE "requestType" IS NOT NULL;

COMMIT;
