#!/usr/bin/env node
// Ověření a test push notifikací (FCM HTTP v1) pro Zoom Pro.
//
// Použití:
//   node scripts/push-setup.mjs                          # ověří konfiguraci a zkusí mintnout token
//   node scripts/push-setup.mjs --token <FCM_token>      # + pošle testovací notifikaci na konkrétní FCM token
//   node scripts/push-setup.mjs --user <userId>          # + pošle přes backend na všechna zařízení uživatele
//
// Čte apps/backend/.env (FCM_PROJECT_ID, FCM_SERVICE_ACCOUNT_JSON / FCM_SERVICE_ACCOUNT_FILE).
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { mintAccessToken, sendFcmMessage } from '../apps/backend/src/services/push.service.js';

// jednoduchý .env parser
const envPath = path.resolve('apps/backend/.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const args = process.argv.slice(2);
const deviceToken = args.includes('--token') ? args[args.indexOf('--token') + 1] : null;
const userId = args.includes('--user') ? args[args.indexOf('--user') + 1] : null;

console.log('=== Push (FCM) setup ===');
if (!process.env.FCM_PROJECT_ID) {
  console.log('❌ FCM_PROJECT_ID není nastavené (apps/backend/.env)');
  process.exit(1);
}
console.log(`✅ FCM_PROJECT_ID = ${process.env.FCM_PROJECT_ID}`);

const saRaw = process.env.FCM_SERVICE_ACCOUNT_JSON;
const saFile = process.env.FCM_SERVICE_ACCOUNT_FILE;
let sa = null;
try {
  if (saFile) sa = JSON.parse(fs.readFileSync(saFile, 'utf8'));
  else if (saRaw) sa = JSON.parse(saRaw);
  else { console.log('❌ Chybí FCM_SERVICE_ACCOUNT_JSON nebo FCM_SERVICE_ACCOUNT_FILE'); process.exit(1); }
  if (!sa.client_email || !sa.private_key) throw new Error('v JSON chybí client_email/private_key');
  console.log(`✅ Service account: ${sa.client_email}`);
} catch (e) {
  console.log(`❌ Service account neplatný: ${e.message}`);
  process.exit(1);
}

console.log('Mintuji OAuth token (reálné volání oauth2.googleapis.com)…');
const mint = await mintAccessToken(sa).catch((e) => ({ ok: false, error: e.message }));
if (!mint.ok) {
  console.log(`❌ Token se nevytvořil (${mint.status ?? '—'} ${mint.error || mint.error}) ${mint.errorDescription || ''}`);
  console.log('   Typicky: service account nemá roli "Firebase Cloud Messaging API Admin"');
  console.log('   nebo projekt nemá zapnuté FCM API (console.firebase.google.com → nastavení → Cloud Messaging).');
  process.exit(1);
}
console.log('✅ OAuth token OK (platnost ~1 h, cache se řeší v push.service).');

if (!deviceToken && !userId) {
  console.log('\n✅ Konfigurace je funkční. Pro test doručení přidej --token <FCM_token> nebo --user <userId>.');
  process.exit(0);
}

if (deviceToken) {
  console.log(`Posílám testovací notifikaci na token ${deviceToken.slice(0, 12)}…`);
  const res = await sendFcmMessage(process.env.FCM_PROJECT_ID, mint.token, {
    token: deviceToken,
    notification: { title: 'Zoom Pro test', body: 'Push notifikace fungují 🎉' },
    android: { priority: 'high' },
  });
  if (res.ok) { console.log('✅ Google přijal zprávu — doručí se na zařízení (pokud je aktivní).'); }
  else { console.log(`❌ FCM odmítl (${res.status}): ${res.body?.error?.message || JSON.stringify(res.body).slice(0, 200)}`); }
}

if (userId) {
  console.log(`Posílám přes backend na všechna zařízení uživatele ${userId}…`);
  const r = await fetch('http://localhost:5000/api/devices/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.TEST_TOKEN || ''}` },
    body: JSON.stringify({ userIds: [userId], title: 'Zoom Pro test', body: 'Push notifikace fungují 🎉' }),
  }).catch((e) => ({ status: 0, json: async () => ({ error: e.message }) }));
  const b = await r.json().catch(() => ({}));
  console.log(`→ HTTP ${r.status}: sent=${b.sent} invalid=${b.invalid} reason=${b.reason || '—'} ${b.detail || ''}`);
  if (r.status === 401) console.log('   (backend vyžaduje SUPERADMIN token — nastav TEST_TOKEN nebo použij --token cestu výše)');
}
