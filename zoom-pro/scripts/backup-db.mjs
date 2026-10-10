#!/usr/bin/env node
// Záloha PostgreSQL databáze — spusť: node scripts/backup-db.mjs
// Výstup: backups/zoom-pro-YYYYMMDD-HHMMSS.sql.gz
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const url = process.env.DATABASE_URL;
if (!url) { console.error('Chybí DATABASE_URL v .env'); process.exit(1); }

const stamp = new Date().toISOString().replace(/[:T]/g, '').slice(0, 14);
const dir = join(root, 'backups');
mkdirSync(dir, { recursive: true });
const file = join(dir, `zoom-pro-${stamp}.sql.gz`);

try {
  execSync(`pg_dump "${url}" | gzip > "${file}"`, { stdio: 'inherit', shell: '/bin/bash' });
  console.log(`✅ Záloha vytvořena: ${file}`);
  console.log('   Obnova: node scripts/restore-db.mjs ' + file);
} catch (e) {
  console.error('❌ Záloha selhala:', e.message);
  process.exit(1);
}
