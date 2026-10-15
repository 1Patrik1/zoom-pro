#!/usr/bin/env node
// Read-only funkční smoke test API — spusť proti testovacímu backendu:
// BASE=http://localhost:5000 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... node scripts/audit-functionality.mjs
// Nepoužívej produkční administrátorský účet. Test nikdy nemění heslo ani profil.
const BASE = (process.env.BASE || 'http://localhost:5000').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD for authenticated checks. Use a dedicated test account.');
  process.exit(2);
}

const results = [];

async function call(name, path, { method = 'GET', token, body, expectedStatus } = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
    const ok = expectedStatus !== undefined && res.status === expectedStatus;
    results.push({
      name, status: res.status, expectedStatus, ok,
      note: ok ? '' : `očekáváno HTTP ${expectedStatus ?? '(nenastaveno)'}, odpověď ${String(data?.error || data?.message || '').slice(0, 180)}`,
    });
    return { res, data };
  } catch (error) {
    results.push({ name, status: 0, expectedStatus, ok: false, note: error.message });
    return { res: null, data: null };
  }
}

console.log(`Funkční test proti: ${BASE}\n`);

const health = await call('GET /health', '/health', { expectedStatus: 200 });
if (!health.res) {
  console.error('Backend není dostupný; zkontroluj BASE a stav služby.');
  process.exit(2);
}

await call('Login se záměrně chybným heslem', '/api/auth/login', {
  method: 'POST',
  body: { email: ADMIN_EMAIL, password: `${ADMIN_PASSWORD}-invalid` },
  expectedStatus: 401,
});

const good = await call('Login testovacího účtu', '/api/auth/login', {
  method: 'POST',
  body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  expectedStatus: 200,
});
const token = good.data?.token;

await call('GET /api/sync bez tokenu', '/api/sync', { expectedStatus: 401 });

if (token) {
  // Pouze GET požadavky: žádné změny hesla, profilu, licence ani provozních dat.
  await call('GET /api/sync s tokenem', '/api/sync', { token, expectedStatus: 200 });
  await call('GET /api/licensing/mine', '/api/licensing/mine', { token, expectedStatus: 200 });
  await call('GET /api/licensing/plans', '/api/licensing/plans', { token, expectedStatus: 200 });
  await call('GET /api/collisions', '/api/collisions', { token, expectedStatus: 200 });
  await call('GET /api/monter-invoices/mine', '/api/monter-invoices/mine', { token, expectedStatus: 200 });
} else {
  results.push({ name: 'Autorizované GET endpointy', status: '-', expectedStatus: '-', ok: false,
    note: 'login nevrátil token; ověř testovací účet a tvar odpovědi API' });
}

const failures = results.filter((result) => !result.ok);
console.log('\n=== FUNKČNÍ TEST ===');
for (const result of results) {
  const expectation = result.expectedStatus === undefined ? '' : ` očekáváno=${result.expectedStatus}`;
  console.log(`  ${result.ok ? '✅ PASS' : '❌ FAIL'} [${result.status}]${expectation} ${result.name}${result.note ? ` — ${result.note}` : ''}`);
}
console.log(`\nCelkem: ${results.length}, úspěšných: ${results.length - failures.length}, chyb: ${failures.length}`);
process.exit(failures.length ? 1 : 0);
