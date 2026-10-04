#!/usr/bin/env node
// Vytvoří roli a databázi pro Zoom Pro na LOKÁLNÍ PostgreSQL instalaci.
// Použití (Windows i Linux):
//   node scripts/db-setup-local.mjs
// Přihlašovací údaje ADMIN účtu (např. 'postgres') vezme z proměnných:
//   ADMIN_DATABASE_URL  (celý connection string)  NEBO
//   PGADMIN_USER (default 'postgres') + PGADMIN_PASSWORD + PGADMIN_PORT (default 5432)
// Cílové údaje vezme z root .env: POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB (default vzt_user/vzt_pass/vzt_system)
import fs from 'node:fs';
import pg from 'pg';

// načti root .env (jednoduchý parser, bez závislostí)
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const targetUser = process.env.POSTGRES_USER || 'vzt_user';
const targetPass = process.env.POSTGRES_PASSWORD || 'vzt_pass';
const targetDb = process.env.POSTGRES_DB || 'vzt_system';
const port = process.env.PGADMIN_PORT || process.env.DB_PORT || '5432';

const adminUrl = process.env.ADMIN_DATABASE_URL
  || `postgresql://${process.env.PGADMIN_USER || 'postgres'}:${encodeURIComponent(process.env.PGADMIN_PASSWORD || 'postgres')}@127.0.0.1:${port}/postgres`;

const client = new pg.Client({ connectionString: adminUrl });
try {
  await client.connect();
  const role = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [targetUser]);
  if (!role.rows.length) {
    await client.query(`CREATE ROLE "${targetUser}" LOGIN PASSWORD '${targetPass.replace(/'/g, "''")}'`);
    console.log(`✅ Role "${targetUser}" vytvořena.`);
  } else {
    await client.query(`ALTER ROLE "${targetUser}" WITH LOGIN PASSWORD '${targetPass.replace(/'/g, "''")}'`);
    console.log(`✅ Role "${targetUser}" existuje — heslo aktualizováno na hodnotu z .env.`);
  }
  const db = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
  if (!db.rows.length) {
    await client.query(`CREATE DATABASE "${targetDb}" OWNER "${targetUser}"`);
    console.log(`✅ Databáze "${targetDb}" vytvořena.`);
  } else {
    await client.query(`ALTER DATABASE "${targetDb}" OWNER TO "${targetUser}"`);
    console.log(`✅ Databáze "${targetDb}" existuje — vlastník nastaven.`);
  }
  console.log('\nHotovo. Teď spusť:  npm run db:migrate:all');
} catch (e) {
  console.error(`❌ ${e.message}`);
  console.error('Tip: zkontroluj ADMIN_DATABASE_URL (heslo admin účtu postgres) a že běží služba PostgreSQL.');
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
