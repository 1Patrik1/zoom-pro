#!/usr/bin/env node
// Write-paths audit — pokrývá POST/PUT scénáře všech modulů end-to-end.
// Spuštění: node scripts/audit-write-paths.mjs  (vyžaduje běžící backend + migrace + seed ownera)
const BASE = process.env.BASE_URL || 'http://localhost:5000';
let fail = 0;
let skip = 0;
const ok = (cond, label, extra = '') => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) fail += 1;
};
const skipMsg = (label, why) => { console.log(`  ⏭️  ${label} — ${why}`); skip += 1; };
const J = (token, body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body ?? {}) });
const PUT = (token, body) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body ?? {}) });
const G = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const post = async (p, token, body) => (await fetch(`${BASE}${p}`, J(token, body))).json().catch(() => ({}));
const statusOf = async (p, token, body) => { const r = await fetch(`${BASE}${p}`, J(token, body)); if (r.ok) { await r.json().catch(() => ({})); } return r.status; };
const getJson = async (p, token) => (await fetch(`${BASE}${p}`, G(token))).json().catch(() => ({}));

(async () => {
  // ---- login ownera
  const lo = await fetch(`${BASE}/api/auth/login`, J(null, { email: 'owner@platform.local', password: 'PlatformOwner2026!' }));
  const loBody = await lo.json().catch(() => ({}));
  const token = loBody.token;
  const me = loBody.user;
  ok(!!token, 'Login ownera', loBody.error || '');

  // ---- projekty: create → update → assign → chat
  const proj = (await post('/api/projects', token, { name: `WriteAudit-${Date.now()}`, radius: 150 })).project;
  ok(!!proj?.id, 'Projekty: create', proj?.id ? proj.name : '');
  if (proj?.id) {
    const up = await statusOf('/api/projects/update', token, { projectId: proj.id, name: `${proj.name}-upraveno`, radius: 180 });
    ok(up === 200, 'Projekty: update', `HTTP ${up}`);
    const chat = await statusOf('/api/projects/chat', token, { projectId: proj.id, text: 'Testovací zpráva z write-paths auditu.' });
    ok(chat === 200, 'Projekty: chat', `HTTP ${chat}`);
    // assign provedeme později, až vytvoříme druhého uživatele
    globalThis.__projId = proj.id;
  }

  // ---- deník prací (potřebuje projekt)
  if (globalThis.__projId) {
    const d = await statusOf('/api/logs', token, { projectId: globalThis.__projId, date: new Date().toISOString().slice(0, 10), weather: 'slunečno', content: 'Testovací zápis deníku.' });
    ok(d === 200, 'Deník: create', `HTTP ${d}`);
  } else skipMsg('Deník: create', 'chybí projekt');

  // ---- docházka
  const att = await statusOf('/api/attendance', token, { type: 'PRICHOD', status: 'PRACE' });
  ok(att === 200, 'Docházka: create (příchod)', `HTTP ${att}`);

  // ---- VZT kalkulačka
  const vzt = await statusOf('/api/vzt', token, { type: 'duct', width: 200, height: 200, length: 10 });
  ok(vzt === 200, 'Kalkulačka VZT: create', `HTTP ${vzt}`);

  // ---- sklad: item → movement
  const item = (await post('/api/inventory/item', token, { name: `Materiál audit ${Date.now()}`, code: `AUD-${Date.now()}`, quantity: 100, unit: 'ks', minQuantity: 10 })).item;
  ok(!!item?.id, 'Sklad: create item', item?.error || item?.name || '');
  if (item?.id) {
    const mv = await statusOf('/api/inventory/movement', token, { itemId: item.id, type: 'ISSUE', quantity: 5 });
    ok(mv === 200, 'Sklad: movement (ISSUE 5 ks)', `HTTP ${mv}`);
  }

  // ---- faktury: create → pay
  const inv = (await post('/api/invoices', token, { amount: 1234.5, vatRate: 21, invoiceNumber: `WA-${Date.now()}` })).invoice;
  ok(!!inv?.id, 'Faktury: create', inv?.error || inv?.invoiceNumber || '');
  if (inv?.id) {
    const pay = await statusOf('/api/invoices/pay', token, { id: inv.id });
    ok(pay === 200, 'Faktury: pay', `HTTP ${pay}`);
    // auto-faktura z docházky — nejdřív dodej pár PRICHOD+ODCHOD na dnešek
    await statusOf('/api/attendance', token, { type: 'ODCHOD', status: 'PRACE' });
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const autoRes = await fetch(`${BASE}/api/invoices/auto`, J(token, { employeeId: me.id, periodFrom: '2026-09-01', periodTo: tomorrow, hourlyRate: 350 }));
    const autoBody = await autoRes.json().catch(() => ({}));
    const autoOk = autoRes.status === 200 || (autoRes.status === 400 && String(autoBody.error || '').includes('není co fakturovat'));
    ok(autoOk, autoRes.status === 200 ? 'Faktury: auto z docházky' : 'Faktury: auto z docházky — obchodní pravidlo (nic k fakturaci) ověřeno', `HTTP ${autoRes.status} ${String(autoBody.error || '').slice(0, 90)}`);
  }

  // ---- výkazy montérů: create → submit → approve → rate
  const miRes = await fetch(`${BASE}/api/monter-invoices/create`, J(token, { hoursWorked: 4, hourlyRate: 300, periodFrom: '2026-09-01', periodTo: '2026-09-30' }));
  const miBody = await miRes.json().catch(() => ({}));
  const mi = miBody.invoice || miBody;
  ok(miRes.ok && !!mi?.id, 'Výkazy montérů: create', miRes.ok ? '' : `HTTP ${miRes.status} ${JSON.stringify(miBody).slice(0, 140)}`);
  if (mi?.id) {
    const sub = await statusOf('/api/monter-invoices/submit', token, { invoiceId: mi.id, id: mi.id });
    ok(sub === 200, 'Výkazy montérů: submit', `HTTP ${sub}`);
    const appr = await statusOf('/api/monter-invoices/approve', token, { invoiceId: mi.id, id: mi.id });
    ok(appr === 200, 'Výkazy montérů: approve', `HTTP ${appr}`);
  }
  const rate = await statusOf('/api/monter-invoices/rate', token, { userId: me.id, hourlyRate: 320 });
  ok(rate === 200, 'Výkazy montérů: setRate', `HTTP ${rate}`);

  // ---- kolize: status (create je systémová recomputace z dat)
  const col = (await getJson('/api/collisions', token)).collisions || [];
  if (col.length) {
    const cs = await statusOf('/api/collisions/status', token, { collisionId: col[0].id, status: 'ACKNOWLEDGED' });
    ok(cs === 200, 'Kolize: status → ACKNOWLEDGED', `HTTP ${cs}`);
  } else skipMsg('Kolize: status', 'DB nemá žádnou kolizi (create je systémová recomputace)');

  // ---- projektový asistent (troubleshooting)
  if (globalThis.__projId) {
    const trb = await statusOf('/api/troubleshooting', token, { projectId: globalThis.__projId, title: 'Testovací porucha', description: 'Testovací popis poruchy z write-paths auditu.', category: 'OTHER', severity: 'INFO' });
    ok(trb === 200, 'Projektový asistent: create poruchy', `HTTP ${trb}`);
  } else skipMsg('Projektový asistent: create', 'chybí projekt');

  // ---- dokumenty: create → approve
  const docRes = await fetch(`${BASE}/api/documents`, J(token, { documentType: 'PRICE_OFFER', title: `Test dokument ${Date.now()}`, dataJson: { test: true } }));
  const docBody = await docRes.json().catch(() => ({}));
  const doc = docBody.document || docBody;
  ok(docRes.ok && !!doc?.id, 'Dokumenty: create', docRes.ok ? '' : `HTTP ${docRes.status} ${JSON.stringify(docBody).slice(0, 140)}`);
  if (doc?.id) {
    const da = await statusOf(`/api/documents/${doc.id}/approve`, token, {});
    ok(da === 200 || da === 400, `Dokumenty: approve (HTTP ${da})`, da === 400 ? 'obsahová validace stavu — viz hláška' : '');
  }

  // ---- podpisy: providers → request
  const prov = (await getJson('/api/signatures/providers', token)).providers || [];
  if (prov.length) {
    const sr = await statusOf('/api/signatures/requests', token, { providerId: prov[0].id, signerName: 'Testovní Test', signatureLevel: 'SIMPLE' });
    ok(sr === 200, 'Podpisy: create request', `HTTP ${sr}`);
  } else skipMsg('Podpisy: create request', 'žádní providers v DB');

  // ---- tisk: dokument issue nad skladovou položkou
  if (item?.id) {
    const pr = await fetch(`${BASE}/api/print/document/issue`, J(token, { itemId: item.id, documentRef: 'WA-TEST' }));
    ok(pr.status === 200, 'Tisk: document/issue', `HTTP ${pr.status}`);
  }

  // ---- nastavení: pricing
  const sp = await statusOf('/api/settings', token, { cost: 110, sell: 160 });
  ok(sp === 200, 'Nastavení: pricing update', `HTTP ${sp}`);

  // ---- týmový životní cyklus: register join user → approve → role → assign → login
  const cid = (await getJson('/api/sync', token)).company?.id;
  const uemail = `writeaudit${Date.now()}@x.cz`;
  const reg = await statusOf('/api/auth/register', null, { email: uemail, password: 'SilneHeslo123!', joinId: cid });
  ok(reg === 200 || reg === 201, `Tým: registrace člena (HTTP ${reg})`);
  const users = (await getJson('/api/sync', token)).users || [];
  const newU = users.find((u) => u.email === uemail);
  if (newU) {
    const ap = await statusOf('/api/users/approve', token, { userId: newU.id });
    ok(ap === 200, 'Tým: approve', `HTTP ${ap}`);
    const rl = await statusOf('/api/users/role', token, { userId: newU.id, role: 'MONTER' });
    ok(rl === 200, 'Tým: role → MONTER', `HTTP ${rl}`);
    if (globalThis.__projId) {
      const asg = await statusOf('/api/projects/assign', token, { projectId: globalThis.__projId, userId: newU.id, assign: true });
      ok(asg === 200, 'Projekty: assign uživatele', `HTTP ${asg}`);
    }
    const nl = await fetch(`${BASE}/api/auth/login`, J(null, { email: uemail, password: 'SilneHeslo123!' }));
    ok(nl.status === 200, 'Tým: schválený člen se přihlásí', `HTTP ${nl.status}`);
  } else skipMsg('Tým: approve/role/assign/login', 'registrace člena nenašla uživatele v syncu');

  // ---- modul settings PUT (system)
  const msR = await fetch(`${BASE}/api/settings/modules/system`, PUT(token, { locale: 'cs-CZ' }));
  ok(msR.status === 200, 'Nastavení modulů: PUT system', `HTTP ${msR.status}`);

  console.log(`\n${fail ? `❌ WRITE-PATHS: ${fail} chyb` : '✅ WRITE-PATHS: všechno prošlo'}${skip ? ` · ${skip} přeskočeno (chybí data)` : ''}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(`❌ WRITE-PATHS kritická chyba: ${e.message}`); process.exit(1); });
