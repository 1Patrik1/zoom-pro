#!/usr/bin/env node
// Obnova databáze ze zálohy — spusť: node scripts/restore-db.mjs backups/zoom-pro-XXXX.sql.gz
// POZOR: přepíše obsah cílové databáze!
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const file = process.argv[2];
const url = process.env.DATABASE_URL;
if (!file || !existsSync(file)) { console.error('Použití: node scripts/restore-db.mjs <soubor.sql.gz>'); process.exit(1); }
if (!url) { console.error('Chybí DATABASE_URL v .env'); process.exit(1); }

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question(`Opravdu obnovit databázi ze souboru ${file}? Přepíše se obsah DB! (ano/NE) `, (ans) => {
  rl.close();
  if (ans !== 'ano') { console.log('Zrušeno.'); process.exit(0); }
  try {
    execSync(`gunzip -c "${file}" | psql "${url}"`, { stdio: 'inherit', shell: '/bin/bash' });
    console.log('✅ Databáze obnovena.');
  } catch (e) {
    console.error('❌ Obnova selhala:', e.message);
    process.exit(1);
  }
});
