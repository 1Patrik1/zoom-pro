-- Zoom Pro — faktury pro Montéry (self-invoicing / výkazy práce)
BEGIN;

-- Rozšíření faktur o vlastnictví Montérem a typ "výkaz práce"
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "monterUserId" UUID REFERENCES "User"(id) ON DELETE SET NULL;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "invoiceKind" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "hoursWorked" NUMERIC(10,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "hourlyRate"  NUMERIC(12,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "periodFrom"  DATE;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "periodTo"    DATE;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "approvedBy"  UUID REFERENCES "User"(id) ON DELETE SET NULL;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "approvedAt"  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoice_monter ON "Invoice"("monterUserId");
CREATE INDEX IF NOT EXISTS idx_invoice_kind   ON "Invoice"("invoiceKind");

-- Sazba na uživatele (může přebít firemní default)
CREATE TABLE IF NOT EXISTS "UserPayrollRate" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "hourlyRate" NUMERIC(12,2) NOT NULL,
  "validFrom"  DATE NOT NULL DEFAULT CURRENT_DATE,
  "validTo"    DATE,
  currency TEXT NOT NULL DEFAULT 'CZK',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_userrate_user ON "UserPayrollRate"("userId");

-- Oprávnění pro Montéry
INSERT INTO "Permission"(id, key, "moduleKey", label, description, "createdAt") VALUES
 (gen_random_uuid(), 'invoices.self_create', 'invoices', 'Montér: vytvořit vlastní výkaz/fakturu', NULL, NOW()),
 (gen_random_uuid(), 'invoices.self_read',   'invoices', 'Montér: vidět vlastní faktury', NULL, NOW()),
 (gen_random_uuid(), 'invoices.self_submit', 'invoices', 'Montér: odeslat výkaz ke schválení', NULL, NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO "RolePermission"(id, role, "permissionId", granted)
SELECT gen_random_uuid(), 'MONTER'::role_enum, p.id, TRUE
FROM "Permission" p
WHERE p.key IN ('invoices.self_create','invoices.self_read','invoices.self_submit')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp WHERE rp.role = 'MONTER'::role_enum AND rp."permissionId" = p.id
  );

INSERT INTO "RolePermission"(id, role, "permissionId", granted)
SELECT gen_random_uuid(), r::role_enum, p.id, TRUE
FROM "Permission" p, unnest(ARRAY['VEDOUCI','ADMINISTRACE','REDITEL','SUPERADMIN']) AS r
WHERE p.key IN ('invoices.self_create','invoices.self_read','invoices.self_submit')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp WHERE rp.role = r::role_enum AND rp."permissionId" = p.id
  );

COMMIT;
