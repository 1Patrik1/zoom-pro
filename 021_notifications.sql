-- 021: Persistent in-app notifications, scoped to their recipient.
BEGIN;

CREATE TABLE IF NOT EXISTS "Notification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID REFERENCES "Company"(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(1000) NOT NULL DEFAULT '',
  type VARCHAR(32) NOT NULL DEFAULT 'info',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_user_created
  ON "Notification" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notification_user_unread
  ON "Notification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_company_created
  ON "Notification" ("companyId", "createdAt" DESC);

COMMIT;
