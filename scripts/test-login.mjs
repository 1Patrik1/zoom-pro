#!/usr/bin/env node
// Test a configured seed account — set BASE, TEST_ADMIN_EMAIL, and TEST_ADMIN_PASSWORD.
import { randomUUID } from 'node:crypto';
const BASE = process.env.BASE || 'http://localhost:5000';
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD before running this check.');
  process.exit(2);
}
const ACCOUNTS = [{ email, password, role: 'configured admin' }];
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
const neg = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: `missing-${randomUUID()}@invalid.local`, password: randomUUID() }),
});
console.log(`\n  ${[400, 401].includes(neg.status) ? '✅' : '❌'} Neexistující účet správně zamítnut (HTTP ${neg.status}; 400/401 = správné odmítnutí)`);
console.log(fail ? `\n❌ ${fail} loginů selhalo` : '\n✅ Všechny loginy OK');
process.exit(fail ? 1 : 0);
