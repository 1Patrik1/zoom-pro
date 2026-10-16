import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { query } from '../config/db.js';
import { notificationsService } from '../services/notifications.service.js';
import { isValidNotificationUserId, normalizeNotificationInput } from '../utils/notifications-validation.js';

const router = Router();

router.get('/', auth, asyncHandler(async (req, res) => {
  const parsedLimit = Number.parseInt(String(req.query.limit || '30'), 10);
  const limit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 30;
  const [items, count] = await Promise.all([
    query(
      `SELECT id, title, body, type, data, "readAt", "createdAt"
       FROM "Notification"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT $2`,
      [req.user.id, limit]
    ),
    query(
      `SELECT COUNT(*)::int AS count
       FROM "Notification"
       WHERE "userId" = $1 AND "readAt" IS NULL`,
      [req.user.id]
    )
  ]);
  res.json({ ok: true, notifications: items.rows || items, unreadCount: Number((count.rows || count)[0]?.count || 0) });
}));

router.patch('/:id/read', auth, asyncHandler(async (req, res) => {
  if (!isValidNotificationUserId(req.params.id)) {
    return res.status(400).json({ ok: false, error: 'Neplatné ID upozornění.' });
  }
  const result = await query(
    `UPDATE "Notification" SET "readAt" = COALESCE("readAt", NOW())
     WHERE id = $1::uuid AND "userId" = $2
     RETURNING id, "readAt"`,
    [req.params.id, req.user.id]
  );
  const rows = result.rows || result;
  if (!rows.length) return res.status(404).json({ ok: false, error: 'Upozornění nebylo nalezeno.' });
  return res.json({ ok: true, notification: rows[0] });
}));

router.post('/read-all', auth, asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE "Notification" SET "readAt" = NOW()
     WHERE "userId" = $1 AND "readAt" IS NULL`,
    [req.user.id]
  );
  return res.json({ ok: true, updated: result.rowCount ?? result.rows?.rowCount ?? 0 });
}));

router.post('/broadcast', auth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ ok: false, error: 'Pouze SUPERADMIN může odesílat hromadná upozornění.' });
  }
  const input = normalizeNotificationInput(req.body || {});
  if (!input.ok) return res.status(400).json({ ok: false, error: input.error });

  const suppliedIds = req.body?.userIds;
  if (!Array.isArray(suppliedIds) || suppliedIds.length < 1 || suppliedIds.length > 100
    || suppliedIds.some((id) => !isValidNotificationUserId(id))) {
    return res.status(400).json({ ok: false, error: 'Zadejte 1 až 100 platných ID příjemců.' });
  }

  const result = await notificationsService.createForUsers(suppliedIds, input.value);
  return res.status(201).json({ ok: true, ...result });
}));

export default router;
