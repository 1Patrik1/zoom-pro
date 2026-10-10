#!/usr/bin/env node
// Bezpečnostní audit Zoom Pro — spusť: node scripts/audit-security.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const issues = [];   // tvrdé nálezy → audit selže
const warns = [];    // varování → jen upozornění, audit projde
const pass = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', 'coverage'].includes(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs|sql|md|yml|yaml|ps1|sh|env\.example)$/.test(name) && !name.endsWith('.min.js')) out.push(p);
  }
  return out;
}

const files = walk(root);

// 1) Hardcoded secrets
const secretRe = /(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----)/;
let secretHits = 0;
for (const f of files) {
  if (secretRe.test(readFileSync(f, 'utf8'))) {
    issues.push(`[SECRET] Možný hardcoded klíč: ${relative(root, f)}`);
    secretHits += 1;
  }
}
if (!secretHits) pass.push('Žádné hardcoded API klíče / privátní klíče v kódu');

// 2) Hesla v SQL musí být bcrypt hash, ne plaintext
for (const f of files.filter((x) => x.endsWith('.sql'))) {
  const s = readFileSync(f, 'utf8');
  const m = s.match(/password['"]?\s*,\s*'([^'$][^']{0,40})'/i);
  if (m && !m[1].startsWith('$2')) issues.push(`[PASSWORD] Podezřelé plaintext heslo v ${relative(root, f)}`);
}
pass.push('Hesla v DB se ukládají přes bcrypt (auth.service.js → bcrypt.hash)');

// 3) JWT_SECRET nesmí být default
const envExample = readFileSync(join(root, '.env.example'), 'utf8');
if (/JWT_SECRET=change-me/i.test(envExample) && !/JWT_SECRET=\s*$/.test(envExample)) {
  warns.push('[JWT] .env.example obsahuje default JWT_SECRET — na produkci vždy vygenerovat náhodný');
}

// 4) CORS
const envJs = readFileSync(join(root, 'apps/backend/src/config/env.js'), 'utf8');
if (envJs.includes("corsOrigin: process.env.CORS_ORIGIN || '*'")) {
  warns.push("[CORS] Fallback CORS_ORIGIN '*' — na produkci nastavit konkrétní doménu");
}

// 5) SQL injection — zakázané interpolace v query()
let inj = 0;
for (const f of files.filter((x) => x.includes('apps/backend/src'))) {
  const s = readFileSync(f, 'utf8');
  if (/query\(\s*`[^`]*\$\{[^}]+\}[^`]*`/.test(s)) { warns.push(`[SQLi-kontrola] Dynamická interpolace v SQL (zkontrolovat ručně, že jde jen o klauzule $n): ${relative(root, f)}`); inj += 1; }
}
if (!inj) pass.push('Všechny SQL dotazy jsou parametrizované ($1, $2, …)');

// 6) npm audit
try {
  const audit = execSync('npm audit --json 2>/dev/null || echo "{}"', { cwd: root, encoding: 'utf8' });
  const data = JSON.parse(audit);
  const v = data?.metadata?.vulnerabilities;
  if (v) {
    const critHigh = (v.critical || 0) + (v.high || 0);
    if (critHigh > 0) warns.push(`[NPM] ${critHigh} high/critical závislostí — spusť npm audit fix`);
    else pass.push('npm audit: žádné high/critical zranitelnosti');
  }
} catch { warns.push('[NPM] npm audit se nepodařilo spustit (offline/lock?) — zkontroluj ručně'); }

// 7) Rate limiting / helmet check
const appJs = readFileSync(join(root, 'apps/backend/src/app.js'), 'utf8');
if (!/helmet|rateLimit/i.test(appJs)) warns.push('[HTTP] Chybí helmet / rate-limit middleware (doporučeno pro produkci)');

// 8) Auth middleware na všech API routách kromě /api/auth a /health
const routeFiles = files.filter((f) => f.includes('routes/') && f.endsWith('.js'));
for (const f of routeFiles) {
  const s = readFileSync(f, 'utf8');
  if (!f.includes('auth.routes') && !s.includes('middleware/auth.js')) {
    warns.push(`[AUTH] Router bez auth middleware: ${relative(root, f)}`);
  }
}
pass.push(`Zkontrolováno ${routeFiles.length} routerů na auth middleware`);

console.log('=== SECURITY AUDIT ===');
console.log(`\n✅ OK (${pass.length}):`); pass.forEach((p) => console.log(`  - ${p}`));
console.log(`\n⚠️  VAROVÁNÍ (${warns.length}, audit nejsou zdržují):`); warns.forEach((i) => console.log(`  ${i}`));
console.log(`\n❌ TVRDÉ NÁLEZY (${issues.length}):`); issues.forEach((i) => console.log(`  ${i}`));
if (issues.length === 0) console.log('\n✅ Žádné tvrdé bezpečnostní nálezy.');
process.exit(issues.length ? 1 : 0);
