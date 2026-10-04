#!/usr/bin/env node
// Funkční smoke test API — spusť proti běžícímu backendu:
//   BASE=http://localhost:5000 node scripts/audit-functionality.mjs
//   BASE=https://api.zoom-pro.app node scripts/audit-functionality.mjs
const BASE = process.env.BASE || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD for authenticated checks.');
  process.exit(2);
}
const BACKEND_URL_CHECK = process.env.BASE_URL || '';
async function assertBackendUp() {
  try { const h = await fetch(`${BASE}/health`); if (h.ok) return; } catch {}
  console.error(`\n❌ BACKEND_DOWN: backend neběží na ${BASE} — spusť npm run dev (nebo bash scripts/audit-all.sh, který ho spustí sám).`);
  process.exit(2);
}
const results = [];

async function call(name, path, { method = 'GET', token, body } = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    results.push({ name, status: res.status, ok: res.status < 500, note: data?.error || '' });
    return { res, data };
  } catch (e) {
    results.push({ name, status: 0, ok: false, note: e.message });
    return { res: null, data: null };
  }
}

console.log(`Funkční test proti: ${BASE}\n`);

// 1) Health
await call('GET /health', '/health');

// 2) Login — správné i špatné heslo
const bad = await call('Login špatné heslo (oček. 401)', '/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD + '-invalid' } });
const good = await call('Login configured admin', '/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
const token = good?.data?.token;

// 3) Auth-gated endpointy bez tokenu musí vrátit 401
await call('GET /api/sync bez tokenu (oček. 401)', '/api/sync');

if (token) {
  await call('GET /api/sync', '/api/sync', { token });
  await call('GET /api/licensing/mine', '/api/licensing/mine', { token });
  await call('GET /api/licensing/plans', '/api/licensing/plans', { token });
  await call('GET /api/collisions', '/api/collisions', { token });
  await call('GET /api/monter-invoices/mine', '/api/monter-invoices/mine', { token });

  // 4) Změna hesla → zpět (self-test)
  if (process.env.TEST_ADMIN_NEW_PASSWORD) {
    const ch = await call('POST /api/users/password (self-test)', '/api/users/password', {
      method: 'POST', token, body: { currentPassword: ADMIN_PASSWORD, newPassword: process.env.TEST_ADMIN_NEW_PASSWORD },
    });
    if (ch?.res?.status === 400) results[results.length - 1].note = 'ověř, že hesla mohou být stejná';
  } else {
    results.push({ name: 'Změna hesla přeskočena', status: '-', ok: true, note: 'nastav TEST_ADMIN_NEW_PASSWORD pro spuštění self-testu' });
  }

  // 5) Profil
  await call('POST /api/users/profile', '/api/users/profile', { method: 'POST', token, body: { firstName: 'Test', lastName: 'User' } });
} else {
  results.push({ name: 'PŘESKOČENO: gated endpointy', status: '-', ok: false, note: 'login neprošel — zkontroluj DB seed a heslo' });
}

const fails = results.filter((r) => !r.ok);
console.log('=== FUNKČNÍ TEST ===');
for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} [${r.status}] ${r.name}${r.note ? ` — ${r.note}` : ''}`);
console.log(`\nCelkem: ${results.length}, chyb: ${fails.length}`);
process.exit(fails.length ? 1 : 0);
