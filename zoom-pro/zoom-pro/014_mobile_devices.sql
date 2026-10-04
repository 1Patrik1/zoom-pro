-- 014 Registrace mobilních zařízení pro push notifikace
BEGIN;

CREATE TABLE IF NOT EXISTS "DeviceRegistration" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID REFERENCES "Company"(id) ON DELETE CASCADE,
  "pushToken" TEXT UNIQUE NOT NULL,
  platform TEXT DEFAULT 'android',    -- 'android','ios','web'
  model TEXT,
  osVersion TEXT,
  "appVersion" TEXT,
  "lastSeen" TIMESTAMPTZ DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_device_user ON "DeviceRegistration"("userId");
CREATE INDEX IF NOT EXISTS idx_device_company ON "DeviceRegistration"("companyId");

COMMIT;
