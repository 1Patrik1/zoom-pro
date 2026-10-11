// Registrace zařízení pro push notifikace (FCM / APNS)
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { query } from '../config/db.js';
import { pushService } from '../services/push.service.js';

const r = Router();

r.get('/public-key', (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  if (!publicKey) return res.status(503).json({ ok: false, error: 'Web push není na serveru nakonfigurovaný.' });
  return res.json({ ok: true, publicKey });
});

r.post('/register', auth, asyncHandler(async (req, res) => {
  const { pushToken, pushSubscription, platform } = req.body || {};
  let storedToken = pushToken;
  if (platform === 'web' && pushSubscription && typeof pushSubscription.endpoint === 'string'
    && pushSubscription.endpoint.startsWith('https://') && pushSubscription.keys?.p256dh && pushSubscription.keys?.auth) {
    storedToken = `webpush:${JSON.stringify(pushSubscription)}`;
  }
  if (typeof storedToken !== 'string' || !storedToken) return res.status(400).json({ ok: false, error: 'Chybí platný push token nebo web push subscription.' });
  await query(
    `INSERT INTO "DeviceRegistration" ("userId","companyId","pushToken",platform,"lastSeen")
     VALUES ($1,$2,$3,$4,NOW())
     ON CONFLICT ("pushToken") DO UPDATE SET "lastSeen" = NOW(), "userId" = EXCLUDED."userId", "companyId" = EXCLUDED."companyId", platform = EXCLUDED.platform`,
    [req.user.id, req.user.companyId, storedToken, platform || 'unknown']
  );
  res.json({ ok: true });
}));

r.post('/notify', auth, asyncHandler(async (req, res) => {
  const { userIds, title, body, data } = req.body || {};
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ ok: false, error: 'Jen SUPERADMIN může odesílat notifikace.' });
  const result = await pushService.sendToUsers(userIds || [], { title, body, data });
  res.json({ ok: true, ...result });
}));

export default r;
