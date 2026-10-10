#!/usr/bin/env node
// Test přihlášení všech seed účtů — spusť: BASE=http://localhost:5000 node scripts/test-login.mjs
const BASE = process.env.BASE || 'http://localhost:5000';

const ACCOUNTS = [
  { email: 'owner@platform.local', password: 'PlatformOwner2026!', role: 'SUPERADMIN (platforma)' },
  // Doplň další demo účty podle 006_seed_demo_profiles_and_records.sql, např.:
  // { email: 'reditel@demo.local', password: 'DemoReditel2026!', role: 'REDITEL' },
  // { email: 'monter@demo.local', password: 'DemoMonter2026!', role: 'MONTER' },
];

let fail = 0;
console.log(`Test loginů proti ${BASE}\n`);
for (const acc of ACCOUNTS) {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: acc.email, password: acc.password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      console.log(`  ✅ ${acc.email} (${acc.role}) — token OK, user.role=${data.user?.role}`);
    } else {
      fail += 1;
      console.log(`  ❌ ${acc.email} — HTTP ${res.status}: ${data?.error || 'bez odpovědi'}`);
    }
  } catch (e) {
    fail += 1;
    console.log(`  ❌ ${acc.email} — ${e.message}`);
  }
}

// Negativní test
const neg = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'nikdo@nic.cz', password: 'xxx' }),
});
console.log(`\n  ${[400, 401].includes(neg.status) ? '✅' : '❌'} Neexistující účet správně zamítnut (HTTP ${neg.status}; 400/401 = správné odmítnutí)`);

console.log(fail ? `\n❌ ${fail} loginů selhalo` : '\n✅ Všechny loginy OK');
process.exit(fail ? 1 : 0);
