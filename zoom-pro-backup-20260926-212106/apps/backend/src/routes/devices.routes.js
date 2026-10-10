// Registrace zařízení pro push notifikace (FCM / APNS)
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { query } from '../config/db.js';

const r = Router();

r.post('/register', auth, asyncHandler(async (req, res) => {
  const { pushToken, platform } = req.body || {};
  if (!pushToken) return res.status(400).json({ ok: false, error: 'Chybí pushToken' });
  await query(
    `INSERT INTO "DeviceRegistration" ("userId","companyId","pushToken",platform,"lastSeen")
     VALUES ($1,$2,$3,$4,NOW())
     ON CONFLICT ("pushToken") DO UPDATE SET "lastSeen" = NOW(), "userId" = EXCLUDED."userId"`,
    [req.user.id, req.user.companyId, pushToken, platform || 'unknown']
  ).catch(() => {});
  res.json({ ok: true });
}));

export default r;
