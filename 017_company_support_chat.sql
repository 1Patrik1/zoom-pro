-- Zprávy podpory mezi firmami a správcem platformy
BEGIN;

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_message_company_created
  ON "SupportMessage"("companyId", "createdAt");

COMMIT;
