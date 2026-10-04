#!/usr/bin/env node
// Zoom Pro — diagnostika prostředí
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const ROOT = path.resolve(process.cwd());
const OK = '✅', WARN = '⚠', ERR = '❌';
let errors = 0, warns = 0;

function check(cond, msg) {
  if (cond === true) console.log(`${OK} ${msg}`);
  else if (cond === 'warn') { console.log(`${WARN} ${msg}`); warns++; }
  else { console.log(`${ERR} ${msg}`); errors++; }
}

console.log('\n=== Zoom Pro Doctor ===\n');

// 1) Node
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
check(nodeMajor >= 20, `Node.js ${process.versions.node} (>=20 vyžadováno)`);

// 2) Soubory
const files = ['package.json', 'apps/backend/package.json', 'apps/frontend/package.json',
  'apps/backend/.env', 'apps/frontend/.env', '001_initial_schema.sql', '014_mobile_devices.sql'];
for (const f of files) check(fs.existsSync(path.join(ROOT, f)), `soubor ${f}`);

// 3) Migrace 001–014
for (let i = 1; i <= 14; i++) {
  const num = String(i).padStart(3, '0');
  const found = fs.readdirSync(ROOT).some((f) => f.startsWith(`${num}_`) && f.endsWith('.sql'));
  check(found, `SQL migrace ${num}_*.sql`);
}

// 4) DB připojení
const dbUrl = process.env.DATABASE_URL
  || (fs.existsSync('apps/backend/.env') && fs.readFileSync('apps/backend/.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]);
if (!dbUrl) { check(false, 'DATABASE_URL není nastavená'); }
else {
  const c = new Client({ connectionString: dbUrl.trim() });
  try {
    await c.connect();
    const r = await c.query('SELECT current_database() db, version()');
    check(true, `DB připojení OK (${r.rows[0].db})`);
    const tables = await c.query(`SELECT COUNT(*)::int c FROM information_schema.tables WHERE table_schema='public'`);
    check(tables.rows[0].c > 5, `Public tabulek: ${tables.rows[0].c}`);
    const perms = await c.query(`SELECT COUNT(*)::int c FROM "Permission"`).catch(() => ({ rows: [{ c: 0 }] }));
    check(perms.rows[0].c > 0 ? true : 'warn', `Permission rows: ${perms.rows[0].c}`);
    await c.end();
  } catch (e) {
    check(false, `DB připojení selhalo: ${e.message}`);
  }
}

// 5) Backend .env povinné klíče
try {
  const envText = fs.readFileSync('apps/backend/.env', 'utf8');
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN']) {
    check(new RegExp(`^${key}=.+`, 'm').test(envText), `.env obsahuje ${key}`);
  }
  check(/GEMINI_API_KEY=.+/.test(envText) ? true : 'warn', 'GEMINI_API_KEY (volitelné pro AI)');
} catch { /* ignore */ }

// 6) node_modules
check(fs.existsSync('node_modules') ? true : 'warn', 'node_modules v rootu (npm install)');
check(fs.existsSync('apps/mobile/node_modules') ? true : 'warn', 'apps/mobile/node_modules');

// Souhrn
console.log(`\n=== Souhrn: ${errors} chyb, ${warns} varování ===`);
process.exit(errors > 0 ? 1 : 0);
