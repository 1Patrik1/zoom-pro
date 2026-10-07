-- 015_seed_material_catalog.sql
-- Adds example material catalog entries for demo/import

CREATE TABLE IF NOT EXISTS "Material" (
  id TEXT PRIMARY KEY,
  "companyId" TEXT,
  code TEXT,
  name TEXT,
  unit TEXT,
  price NUMERIC,
  category TEXT,
  createdAt TIMESTAMP DEFAULT now()
);

INSERT INTO "Material" (id, "companyId", code, name, unit, price, category) VALUES
('mat-spiro-200-3m','00000000-0000-4000-8000-000000000001','SPIRO-200-3M','Spiro potrubí pozink d200 / 3m','ks',420,'Potrubí kruhové'),
('mat-spiro-250-3m','00000000-0000-4000-8000-000000000001','SPIRO-250-3M','Spiro potrubí pozink d250 / 3m','ks',510,'Potrubí kruhové'),
('mat-sr-m8-25','00000000-0000-4000-8000-000000000001','SR-M8-25','Šrouby montážní pozink M8x25','ks',1.8,'Spojovací materiál'),
('mat-tmel-vzt-310','00000000-0000-4000-8000-000000000001','TMEL-VZT-310','VZT tmel šedý akrylátový kartuše 310ml','ks',95,'Těsnění a tmely')
ON CONFLICT (id) DO NOTHING;

-- End of seed
