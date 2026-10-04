import fs from 'node:fs';
import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';

// Odesílací service pro push notifikace (FCM HTTP v1).
//
// Konfigurace (apps/backend/.env):
//   FCM_PROJECT_ID=tvuj-firebase-projekt
//   FCM_SERVICE_ACCOUNT_JSON={...obsah service-account JSON...}   NEBO
//   FCM_SERVICE_ACCOUNT_FILE=/cesta/serviceAccount.json           NEBO
//   FCM_OAUTH_TOKEN=<hotový access token>  (pro testy / vlastní obměnu)
//
// Bez konfigurace vrací jasný reason, nepadá tajně. Detaily chyb z Google se vrací do UI.

let cachedToken = null;
let cachedTokenExp = 0;

function loadServiceAccount() {
  if (process.env.FCM_SERVICE_ACCOUNT_JSON) {
    try { return { ok: true, sa: JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON) }; }
    catch (e) { return { ok: false, error: `FCM_SERVICE_ACCOUNT_JSON není platný JSON: ${e.message}` }; }
  }
  if (process.env.FCM_SERVICE_ACCOUNT_FILE) {
    try {
      const raw = fs.readFileSync(process.env.FCM_SERVICE_ACCOUNT_FILE, 'utf8');
      return { ok: true, sa: JSON.parse(raw) };
    } catch (e) { return { ok: false, error: `FCM_SERVICE_ACCOUNT_FILE se nepodařilo načíst: ${e.message}` }; }
  }
  return { ok: false, error: 'not-configured' };
}

// Vyrobí OAuth access token přes JWT (RFC 7523) — přesně podle FCM dokumentace.
export async function mintAccessToken(sa) {
  const jwtMod = await import('jose');
  const jwt = await new jwtMod.SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('55m')
    .sign(await jwtMod.importPKCS8(sa.private_key, 'RS256'));

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) {
    return { ok: false, status: r.status, error: data.error || 'unknown', errorDescription: data.error_description || '' };
  }
  return { ok: true, token: data.access_token, expiresIn: data.expires_in };
}

async function getAccessToken() {
  if (process.env.FCM_OAUTH_TOKEN) return { ok: true, token: process.env.FCM_OAUTH_TOKEN };
  if (cachedToken && Date.now() < cachedTokenExp) return { ok: true, token: cachedToken };

  const saRes = loadServiceAccount();
  if (!saRes.ok) return { ok: false, reason: saRes.error === 'not-configured' ? 'fcm-not-configured' : 'fcm-config-invalid', detail: saRes.error };
  if (!saRes.sa.client_email || !saRes.sa.private_key) {
    return { ok: false, reason: 'fcm-config-invalid', detail: 'V service-account JSON chybí client_email nebo private_key.' };
  }

  const projectId = process.env.FCM_PROJECT_ID;
  if (!projectId) return { ok: false, reason: 'fcm-config-invalid', detail: 'Chybí FCM_PROJECT_ID.' };

  const minted = await mintAccessToken(saRes.sa).catch((e) => ({ ok: false, status: 0, error: e.message, errorDescription: '' }));
  if (!minted.ok) {
    logger.error('FCM auth failed:', minted.error, minted.errorDescription);
    return { ok: false, reason: 'fcm-auth-failed', status: minted.status, detail: `${minted.error}${minted.errorDescription ? ': ' + minted.errorDescription : ''}` };
  }
  cachedToken = minted.token;
  cachedTokenExp = Date.now() + (minted.expiresIn - 60) * 1000;
  return { ok: true, token: minted.token };
}

// Jedno reálné FCM odeslání — vrací přesnou odpověď Google (i chyby, kvůli diagnostice)
export async function sendFcmMessage(projectId, accessToken, message) {
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, body };
}

export const pushService = {
  async sendToUsers(userIds, { title, body, data } = {}) {
    if (!userIds?.length) return { sent: 0, invalid: 0, reason: 'empty' };
    const rows = await query(
      `SELECT "pushToken" FROM "DeviceRegistration" WHERE "userId" = ANY($1)`,
      [userIds]
    );
    const tokens = rows.rows.map((r) => r.pushToken).filter(Boolean);
    if (!tokens.length) return { sent: 0, invalid: 0, reason: 'no-devices' };

    const auth = await getAccessToken();
    if (!auth.ok) {
      return { sent: 0, invalid: 0, reason: auth.reason, detail: auth.detail,
        hint: 'Nastav FCM_PROJECT_ID + FCM_SERVICE_ACCOUNT_JSON (nebo FCM_SERVICE_ACCOUNT_FILE / FCM_OAUTH_TOKEN) v apps/backend/.env.' };
    }
    const projectId = process.env.FCM_PROJECT_ID;
    let sent = 0;
    let invalid = 0;
    const errors = [];
    for (const t of tokens) {
      try {
        const res = await sendFcmMessage(projectId, auth.token, {
          token: t,
          notification: { title: title || 'Zoom Pro', body: body || '' },
          data: data || {},
          android: { priority: 'high' },
        });
        if (res.ok) { sent += 1; continue; }
        invalid += 1;
        const gErr = res.body?.error?.message || `HTTP ${res.status}`;
        errors.push(`${t.slice(0, 12)}…: ${gErr}`);
        // smazané/neplatné tokeny (UNREGISTERED) vyčistit
        if (res.status === 404 || String(gErr).includes('UNREGISTERED') || res.status === 410) {
          await query(`DELETE FROM "DeviceRegistration" WHERE "pushToken" = $1`, [t]).catch(() => {});
        }
      } catch (e) {
        invalid += 1;
        errors.push(`${t.slice(0, 12)}…: ${e.message}`);
      }
    }
    return { sent, invalid, errors: errors.slice(0, 10) };
  }
};
