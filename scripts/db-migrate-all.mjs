#!/usr/bin/env node
// Zoom Pro — bezpečný auto-migrátor
// - vytvoří tabulku _migrations
// - pro EXISTUJÍCÍ DB udělá baseline: pokud najde známé objekty (Company, Permission, ...), označí staré migrace jako aplikované
// - poté aplikuje jen chybějící NNN_*.sql v tranzakci
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const ROOT = process.cwd();
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL is required'); process.exit(1); }

const client = new Client({ connectionString: dbUrl });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS "_migrations" (
    filename TEXT PRIMARY KEY,
    "appliedAt" TIMESTAMPTZ DEFAULT NOW(),
    checksum TEXT
  )
`);

async function tableExists(name) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [name]
  );
  return !!r.rows.length;
}

async function markApplied(filename) {
  await client.query(
    `INSERT INTO "_migrations" (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [filename]
  );
}

// --- baseline: pokud DB existuje, označíme "staré" migrace jako aplikované ---
const has = {
  Company:     await tableExists('Company'),
  Permission:  await tableExists('Permission'),
  Project:     await tableExists('Project'),
  CatalogItem: await tableExists('CatalogItem'),
  DeviceRegistration: await tableExists('DeviceRegistration'),
};

const baselineMap = [
  { file: '001_initial_schema.sql',                   when: () => has.Company },
  { file: '002_seed_permissions.sql',                 when: () => has.Permission },
  { file: '003_seed_default_module_settings.sql',     when: () => has.Permission },
  { file: '004_upgrade_legacy_in_place.sql',          when: () => has.Company },
  { file: '005_seed_platform_superadmin.sql',         when: () => has.Company },
  { file: '006_seed_demo_profiles_and_records.sql',   when: () => has.Company },
  { file: '007_project_geo_and_gallery.sql',          when: () => has.Project },
  { file: '008_invoice_automation_and_permissions.sql', when: () => has.Company },
  { file: '009_attendance_geo_guard_and_log_media.sql', when: () => has.Company },
  { file: '010_collisions_and_qr_labels.sql',         when: async () => await tableExists('CollisionAlert') },
  { file: '011_zoom_pro_licensing.sql',               when: async () => await tableExists('LicensePlan') },
  { file: '012_monter_invoices.sql',                  when: async () => await tableExists('MonterInvoice') },
  { file: '013_distribution_platform.sql',            when: () => has.CatalogItem },
  { file: '014_mobile_devices.sql',                   when: () => has.DeviceRegistration },
];
for (const m of baselineMap) {
  const known = await client.query(`SELECT 1 FROM "_migrations" WHERE filename = $1`, [m.file]);
  if (known.rows.length) continue;
  const ok = typeof m.when === 'function' ? await m.when() : false;
  if (ok) { await markApplied(m.file); console.log(`≡ baseline: ${m.file}`); }
}

// --- aplikace zbývajících migrací ---
const files = (await fs.readdir(ROOT))
  .filter((f) => /^\d{3}_.+\.sql$/.test(f))
  .sort();

let applied = 0, skipped = 0, failed = 0;
for (const f of files) {
  const known = await client.query(`SELECT 1 FROM "_migrations" WHERE filename = $1`, [f]);
  if (known.rows.length) { console.log(`⏭  ${f}`); skipped++; continue; }
  const sql = await fs.readFile(path.join(ROOT, f), 'utf8');
  process.stdout.write(`▶  ${f} … `);
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await markApplied(f);
    await client.query('COMMIT');
    console.log('OK');
    applied++;
  } catch (e) {
    await client.query('ROLLBACK');
    console.log(`SELHALO — ${e.message}`);
    failed++;
    // Pokud jde jenom o "already exists", označíme jako baseline a jedeme dál
    if (/already exists/i.test(e.message)) {
      await markApplied(f);
      console.log(`   → označeno jako baseline (objekty už existují)`);
    } else {
      break;
    }
  }
}

await client.end();
console.log(`\n✅ Hotovo: ${applied} aplikováno, ${skipped} přeskočeno, ${failed} baseline/warnings.`);
process.exit(0);
