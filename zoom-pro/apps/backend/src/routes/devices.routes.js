// Registrace zařízení pro push notifikace (FCM / APNS)
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { query } from '../config/db.js';
import { pushService } from '../services/push.service.js';

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

r.post('/notify', auth, asyncHandler(async (req, res) => {
  const { userIds, title, body, data } = req.body || {};
  if (req.user.role !== 'SUPERADMIN') return res.status(403).json({ ok: false, error: 'Jen SUPERADMIN může odesílat notifikace.' });
  const result = await pushService.sendToUsers(userIds || [], { title, body, data });
  res.json({ ok: true, ...result });
}));

export default r;
