-- Zoom Pro — 013 Distribuční platforma + AI AutoDetect
-- Katalog materiálu, dodavatelé, ceníky, RFQ, PO, AI měření

BEGIN;

-- 1) Katalog materiálu (master SKU)
CREATE TABLE IF NOT EXISTS "CatalogItem" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID REFERENCES "Company"(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,           -- 'duct_round','duct_rect','elbow','reducer','tee','damper','ahu','insulation','filter','fasteners','flex','other'
  shape TEXT,                       -- 'round' | 'rect'
  "diameterMm" DOUBLE PRECISION,
  "widthMm" DOUBLE PRECISION,
  "heightMm" DOUBLE PRECISION,
  "lengthMm" DOUBLE PRECISION,
  "angleDeg" DOUBLE PRECISION,
  "materialCode" TEXT,              -- 'ZN','ST','SS304','PVC','Alu','FLEX'
  "unit" TEXT DEFAULT 'ks',
  "weightKg" DOUBLE PRECISION,
  attributes JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("companyId", sku)
);
CREATE INDEX IF NOT EXISTS idx_catalog_company ON "CatalogItem"("companyId");
CREATE INDEX IF NOT EXISTS idx_catalog_category ON "CatalogItem"(category);

-- 2) Dodavatelé
CREATE TABLE IF NOT EXISTS "Supplier" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ico TEXT, dic TEXT,
  email TEXT, phone TEXT,
  "apiType" TEXT DEFAULT 'EMAIL',   -- 'API' | 'EDI' | 'ISDOC' | 'CSV' | 'EMAIL' | 'SCRAPE'
  "apiUrl" TEXT,
  "apiKeyEnc" TEXT,
  currency TEXT DEFAULT 'CZK',
  "paymentTermDays" INT DEFAULT 14,
  "discountPct" DOUBLE PRECISION DEFAULT 0,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_company ON "Supplier"("companyId");

-- 3) Ceníky (jeden SKU × více dodavatelů)
CREATE TABLE IF NOT EXISTS "SupplierPrice" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL REFERENCES "Supplier"(id) ON DELETE CASCADE,
  "catalogItemId" UUID NOT NULL REFERENCES "CatalogItem"(id) ON DELETE CASCADE,
  "supplierSku" TEXT,
  price DOUBLE PRECISION NOT NULL,
  currency TEXT DEFAULT 'CZK',
  moq DOUBLE PRECISION DEFAULT 1,
  "leadTimeDays" INT DEFAULT 3,
  "qtyAvailable" DOUBLE PRECISION,
  "validFrom" TIMESTAMPTZ DEFAULT NOW(),
  "validTo" TIMESTAMPTZ,
  priority INT DEFAULT 100,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_item ON "SupplierPrice"("catalogItemId");
CREATE INDEX IF NOT EXISTS idx_price_supplier ON "SupplierPrice"("supplierId");

CREATE TABLE IF NOT EXISTS "PriceHistory" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierPriceId" UUID NOT NULL REFERENCES "SupplierPrice"(id) ON DELETE CASCADE,
  price DOUBLE PRECISION NOT NULL,
  "snapshotAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4) RFQ (poptávka) + řádky + přijaté nabídky
CREATE TABLE IF NOT EXISTS "Rfq" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID REFERENCES "Project"(id) ON DELETE SET NULL,
  "createdBy" UUID REFERENCES "User"(id),
  status TEXT DEFAULT 'DRAFT',      -- DRAFT | SENT | ANSWERED | CLOSED
  deadline TIMESTAMPTZ,
  note TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "RfqLine" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rfqId" UUID NOT NULL REFERENCES "Rfq"(id) ON DELETE CASCADE,
  "catalogItemId" UUID NOT NULL REFERENCES "CatalogItem"(id),
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  note TEXT
);
CREATE TABLE IF NOT EXISTS "RfqQuote" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rfqId" UUID NOT NULL REFERENCES "Rfq"(id) ON DELETE CASCADE,
  "supplierId" UUID NOT NULL REFERENCES "Supplier"(id) ON DELETE CASCADE,
  "totalPrice" DOUBLE PRECISION,
  currency TEXT DEFAULT 'CZK',
  "leadTimeDays" INT,
  status TEXT DEFAULT 'RECEIVED',   -- RECEIVED | SELECTED | REJECTED
  "validTo" TIMESTAMPTZ,
  lines JSONB DEFAULT '[]'::jsonb,
  "receivedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5) Objednávky (PO) + řádky + příjemky
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID REFERENCES "Project"(id) ON DELETE SET NULL,
  "supplierId" UUID NOT NULL REFERENCES "Supplier"(id),
  "rfqQuoteId" UUID REFERENCES "RfqQuote"(id),
  "poNumber" TEXT,
  status TEXT DEFAULT 'DRAFT',      -- DRAFT | APPROVED | SENT | CONFIRMED | SHIPPED | RECEIVED | CANCELLED
  "totalAmount" DOUBLE PRECISION,
  currency TEXT DEFAULT 'CZK',
  "createdBy" UUID REFERENCES "User"(id),
  "approvedBy" UUID REFERENCES "User"(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "sentAt" TIMESTAMPTZ,
  "expectedAt" TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS "PurchaseOrderLine" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "poId" UUID NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
  "catalogItemId" UUID NOT NULL REFERENCES "CatalogItem"(id),
  "supplierSku" TEXT,
  qty DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'CZK'
);
CREATE TABLE IF NOT EXISTS "GoodsReceipt" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "poId" UUID NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
  "receivedBy" UUID REFERENCES "User"(id),
  "receivedAt" TIMESTAMPTZ DEFAULT NOW(),
  lines JSONB DEFAULT '[]'::jsonb,
  notes TEXT
);

-- 6) Přijaté faktury (AP — accounts payable, 3-way match)
CREATE TABLE IF NOT EXISTS "SupplierInvoice" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "supplierId" UUID NOT NULL REFERENCES "Supplier"(id),
  "poId" UUID REFERENCES "PurchaseOrder"(id) ON DELETE SET NULL,
  "invoiceNumber" TEXT,
  amount DOUBLE PRECISION,
  currency TEXT DEFAULT 'CZK',
  "vatAmount" DOUBLE PRECISION,
  "dueDate" TIMESTAMPTZ,
  status TEXT DEFAULT 'RECEIVED',   -- RECEIVED | MATCHED | DISPUTED | APPROVED | PAID
  "isdocXml" TEXT,
  "attachmentUrl" TEXT,
  "matchResult" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7) AI AutoDetect — měření z fotky / videa
CREATE TABLE IF NOT EXISTS "DuctAutoDetect" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  "projectId" UUID REFERENCES "Project"(id) ON DELETE SET NULL,
  "createdBy" UUID REFERENCES "User"(id),
  "imageDataUrl" TEXT,               -- vstupní foto (base64 data-URL)
  "referenceObject" TEXT,            -- 'A4','tape30','tape50','banknote100','coin10','custom'
  "referenceSizeMm" DOUBLE PRECISION,
  "detectedShape" TEXT,              -- 'round' | 'rect' | 'unknown'
  "detectedWidthMm" DOUBLE PRECISION,
  "detectedHeightMm" DOUBLE PRECISION,
  "detectedDiameterMm" DOUBLE PRECISION,
  "detectedOffsetMm" DOUBLE PRECISION,
  "detectedAngleDeg" DOUBLE PRECISION,
  "detectedRunMm" DOUBLE PRECISION,
  "suggestedPieceKind" TEXT,         -- 'straight','elbow15','elbow30','elbow45','elbow60','reducer','offset_pair'
  "suggestedSku" TEXT,
  confidence DOUBLE PRECISION,
  "aiRaw" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_autodetect_project ON "DuctAutoDetect"("projectId");

-- 8) Oprávnění (schéma: Permission.key + RolePermission.role/permissionId)
INSERT INTO "Permission" (id, key, "moduleKey", label, description) VALUES
  (gen_random_uuid(), 'catalog.read',      'distribution', 'Katalog: číst',         'Číst katalog materiálu'),
  (gen_random_uuid(), 'catalog.manage',    'distribution', 'Katalog: spravovat',    'Spravovat katalog'),
  (gen_random_uuid(), 'suppliers.read',    'distribution', 'Dodavatelé: číst',      'Číst dodavatele'),
  (gen_random_uuid(), 'suppliers.manage',  'distribution', 'Dodavatelé: spravovat', 'Spravovat dodavatele'),
  (gen_random_uuid(), 'prices.read',       'distribution', 'Ceníky: číst',          'Číst ceníky'),
  (gen_random_uuid(), 'prices.manage',     'distribution', 'Ceníky: spravovat',     'Spravovat ceníky'),
  (gen_random_uuid(), 'rfq.create',        'distribution', 'RFQ: vytvořit',         'Vytvořit poptávku'),
  (gen_random_uuid(), 'rfq.manage',        'distribution', 'RFQ: spravovat',        'Řídit poptávky'),
  (gen_random_uuid(), 'po.create',         'distribution', 'PO: vytvořit',          'Vytvořit objednávku'),
  (gen_random_uuid(), 'po.approve',        'distribution', 'PO: schválit',          'Schválit objednávku'),
  (gen_random_uuid(), 'po.receive',        'distribution', 'PO: naskladnit',        'Přijmout dodávku'),
  (gen_random_uuid(), 'ap.manage',         'distribution', 'Přijaté faktury',       'Přijaté faktury (AP)'),
  (gen_random_uuid(), 'autodetect.use',    'ai',           'AI AutoDetect: použít', 'Použít AI AutoDetect'),
  (gen_random_uuid(), 'autodetect.manage', 'ai',           'AI AutoDetect: správa', 'Spravovat AI AutoDetect')
ON CONFLICT (key) DO NOTHING;

-- Přiřazení rolím (RolePermission.role/permissionId, granted)
DO $$
DECLARE pkey TEXT;
        pid  UUID;
        role TEXT;
        role_enum_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') INTO role_enum_exists;
  IF NOT role_enum_exists THEN
    RAISE NOTICE 'role_enum not found, skipping RolePermission seeding';
    RETURN;
  END IF;
  FOR pkey IN SELECT unnest(ARRAY[
    'catalog.read','catalog.manage','suppliers.read','suppliers.manage',
    'prices.read','prices.manage','rfq.create','rfq.manage',
    'po.create','po.approve','po.receive','ap.manage',
    'autodetect.use','autodetect.manage'
  ]) LOOP
    SELECT id INTO pid FROM "Permission" WHERE key = pkey;
    IF pid IS NULL THEN CONTINUE; END IF;

    FOREACH role IN ARRAY ARRAY['SUPERADMIN','REDITEL'] LOOP
      INSERT INTO "RolePermission" (id, role, "permissionId", granted)
      VALUES (gen_random_uuid(), role::role_enum, pid, TRUE)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- ADMINISTRACE — nákup + AP
  FOR pkey IN SELECT unnest(ARRAY['catalog.read','suppliers.read','prices.read',
    'rfq.create','rfq.manage','po.create','po.receive','ap.manage','autodetect.use']) LOOP
    SELECT id INTO pid FROM "Permission" WHERE key = pkey;
    IF pid IS NULL THEN CONTINUE; END IF;
    INSERT INTO "RolePermission" (id, role, "permissionId", granted)
    VALUES (gen_random_uuid(), 'ADMINISTRACE'::role_enum, pid, TRUE) ON CONFLICT DO NOTHING;
  END LOOP;

  -- VEDOUCI — kalkulace, RFQ, AutoDetect
  FOR pkey IN SELECT unnest(ARRAY['catalog.read','suppliers.read','prices.read',
    'rfq.create','po.receive','autodetect.use']) LOOP
    SELECT id INTO pid FROM "Permission" WHERE key = pkey;
    IF pid IS NULL THEN CONTINUE; END IF;
    INSERT INTO "RolePermission" (id, role, "permissionId", granted)
    VALUES (gen_random_uuid(), 'VEDOUCI'::role_enum, pid, TRUE) ON CONFLICT DO NOTHING;
  END LOOP;

  -- MONTER — čtení katalogu, AutoDetect na stavbě
  FOR pkey IN SELECT unnest(ARRAY['catalog.read','autodetect.use']) LOOP
    SELECT id INTO pid FROM "Permission" WHERE key = pkey;
    IF pid IS NULL THEN CONTINUE; END IF;
    INSERT INTO "RolePermission" (id, role, "permissionId", granted)
    VALUES (gen_random_uuid(), 'MONTER'::role_enum, pid, TRUE) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

COMMIT;
