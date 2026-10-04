#!/usr/bin/env node
// Zoom Pro — seed distribučního modulu: katalog + dodavatelé + ceníky
import 'dotenv/config';
import { Client } from 'pg';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL is required'); process.exit(1); }
const c = new Client({ connectionString: dbUrl });
await c.connect();

const [{ id: companyId }] = (await c.query(`SELECT id FROM "Company" ORDER BY "createdAt" LIMIT 1`)).rows;
if (!companyId) { console.error('Žádná Company v DB — nejdřív spusť seed platform.'); process.exit(1); }

// 1) Katalog — pár základních SKU
const catalog = [
  { sku: 'DUCT-R-100-1000',  name: 'Potrubí kruhové Ø100×1000',  category: 'duct_round', shape: 'round', diameterMm: 100, lengthMm: 1000, materialCode: 'ZN', unit: 'ks', weightKg: 1.4 },
  { sku: 'DUCT-R-125-1000',  name: 'Potrubí kruhové Ø125×1000',  category: 'duct_round', shape: 'round', diameterMm: 125, lengthMm: 1000, materialCode: 'ZN', unit: 'ks', weightKg: 1.7 },
  { sku: 'DUCT-R-160-1000',  name: 'Potrubí kruhové Ø160×1000',  category: 'duct_round', shape: 'round', diameterMm: 160, lengthMm: 1000, materialCode: 'ZN', unit: 'ks', weightKg: 2.2 },
  { sku: 'DUCT-R-200-1000',  name: 'Potrubí kruhové Ø200×1000',  category: 'duct_round', shape: 'round', diameterMm: 200, lengthMm: 1000, materialCode: 'ZN', unit: 'ks', weightKg: 2.8 },
  { sku: 'DUCT-R-250-1000',  name: 'Potrubí kruhové Ø250×1000',  category: 'duct_round', shape: 'round', diameterMm: 250, lengthMm: 1000, materialCode: 'ZN', unit: 'ks', weightKg: 3.5 },
  { sku: 'ELB-R-160-45',     name: 'Koleno kruhové Ø160/45°',    category: 'elbow',      shape: 'round', diameterMm: 160, angleDeg: 45, materialCode: 'ZN', unit: 'ks', weightKg: 0.9 },
  { sku: 'ELB-R-200-45',     name: 'Koleno kruhové Ø200/45°',    category: 'elbow',      shape: 'round', diameterMm: 200, angleDeg: 45, materialCode: 'ZN', unit: 'ks', weightKg: 1.2 },
  { sku: 'ELB-R-200-90',     name: 'Koleno kruhové Ø200/90°',    category: 'elbow',      shape: 'round', diameterMm: 200, angleDeg: 90, materialCode: 'ZN', unit: 'ks', weightKg: 1.7 },
  { sku: 'RED-R-250-200',    name: 'Redukce kruhová Ø250→Ø200',  category: 'reducer',    shape: 'round', diameterMm: 250, materialCode: 'ZN', unit: 'ks', weightKg: 1.1 },
  { sku: 'TEE-R-200-100',    name: 'T-kus Ø200/Ø100',            category: 'tee',        shape: 'round', diameterMm: 200, materialCode: 'ZN', unit: 'ks', weightKg: 1.8 },
  { sku: 'DAMP-R-200',       name: 'Klapka Ø200 uzavírací',      category: 'damper',     shape: 'round', diameterMm: 200, materialCode: 'ZN', unit: 'ks', weightKg: 2.1 },
  { sku: 'FLEX-R-160-10M',   name: 'Flexi hadice Ø160 × 10 m',   category: 'flex',       shape: 'round', diameterMm: 160, lengthMm: 10000, materialCode: 'Alu', unit: 'ks', weightKg: 3.2 },
  { sku: 'INSU-13-1M',       name: 'Izolace potrubí 13 mm × 1 m',category: 'insulation', shape: null, materialCode: null, unit: 'm', weightKg: 0.4 },
  { sku: 'FLT-G4-390',       name: 'Filtr G4 390×390',           category: 'filter',     shape: 'rect',  widthMm: 390, heightMm: 390, unit: 'ks', weightKg: 0.6 },
  { sku: 'AHU-D400',         name: 'VZT jednotka Duplex 400',    category: 'ahu',        shape: null,   unit: 'ks', weightKg: 45 },
  { sku: 'FAST-CLIP-100',    name: 'Objímka Ø100 s pryží',       category: 'fasteners',  shape: null,   unit: 'ks', weightKg: 0.1 },
];

const catIds = {};
for (const item of catalog) {
  const r = await c.query(
    `INSERT INTO "CatalogItem" ("companyId",sku,name,category,shape,"diameterMm","widthMm","heightMm","lengthMm","angleDeg","materialCode",unit,"weightKg")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT ("companyId",sku) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [companyId, item.sku, item.name, item.category, item.shape, item.diameterMm, item.widthMm, item.heightMm, item.lengthMm, item.angleDeg, item.materialCode, item.unit, item.weightKg]
  );
  catIds[item.sku] = r.rows[0].id;
}
console.log(`✅ Katalog: ${catalog.length} SKU`);

// 2) Dodavatelé
const suppliers = [
  { name: 'Elektrodesign VZT',  ico: '25655450', dic: 'CZ25655450', email: 'obchod@elektrodesign.cz', apiType: 'EMAIL', currency: 'CZK', paymentTermDays: 14, discountPct: 5 },
  { name: 'Systemair CZ',       ico: '48117404', dic: 'CZ48117404', email: 'info@systemair.cz',       apiType: 'API',   currency: 'CZK', paymentTermDays: 30, discountPct: 8 },
  { name: 'Mandík',             ico: '26178156', dic: 'CZ26178156', email: 'obchod@mandik.cz',       apiType: 'CSV',   currency: 'CZK', paymentTermDays: 21, discountPct: 4 },
  { name: 'ATREA',              ico: '63216078', dic: 'CZ63216078', email: 'export@atrea.eu',        apiType: 'SCRAPE',currency: 'CZK', paymentTermDays: 14, discountPct: 6 },
  { name: 'Lindab CZ',          ico: '61535117', dic: 'CZ61535117', email: 'info@lindab.cz',         apiType: 'API',   currency: 'CZK', paymentTermDays: 30, discountPct: 10 },
];
const supIds = {};
for (const s of suppliers) {
  const r = await c.query(
    `INSERT INTO "Supplier" ("companyId",name,ico,dic,email,"apiType",currency,"paymentTermDays","discountPct",active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE) RETURNING id`,
    [companyId, s.name, s.ico, s.dic, s.email, s.apiType, s.currency, s.paymentTermDays, s.discountPct]
  );
  supIds[s.name] = r.rows[0].id;
}
console.log(`✅ Dodavatelé: ${suppliers.length}`);

// 3) Ceníky — pár vzorových
const prices = [
  { sku: 'DUCT-R-200-1000', name: 'Elektrodesign VZT', price: 145, lead: 3, priority: 100 },
  { sku: 'DUCT-R-200-1000', name: 'Systemair CZ',      price: 132, lead: 5, priority: 90 },
  { sku: 'DUCT-R-200-1000', name: 'Lindab CZ',         price: 138, lead: 2, priority: 80 },
  { sku: 'ELB-R-200-45',    name: 'Elektrodesign VZT', price: 210, lead: 3, priority: 100 },
  { sku: 'ELB-R-200-45',    name: 'Systemair CZ',      price: 195, lead: 5, priority: 90 },
  { sku: 'ELB-R-200-45',    name: 'Lindab CZ',         price: 202, lead: 2, priority: 80 },
  { sku: 'ELB-R-200-90',    name: 'Lindab CZ',         price: 265, lead: 2, priority: 80 },
  { sku: 'DAMP-R-200',      name: 'Mandík',            price: 890, lead: 7, priority: 100 },
  { sku: 'FLT-G4-390',      name: 'Elektrodesign VZT', price:  95, lead: 3, priority: 100 },
  { sku: 'AHU-D400',        name: 'ATREA',             price: 48500, lead: 14, priority: 100 },
];
for (const p of prices) {
  await c.query(
    `INSERT INTO "SupplierPrice" ("supplierId","catalogItemId","supplierSku",price,currency,moq,"leadTimeDays",priority)
     VALUES ($1,$2,$3,$4,'CZK',1,$5,$6)`,
    [supIds[p.name], catIds[p.sku], p.sku, p.price, p.lead, p.priority]
  );
}
console.log(`✅ Ceníky: ${prices.length} položek`);

await c.end();
console.log('\n🎉 Distribuční seed hotový.');
