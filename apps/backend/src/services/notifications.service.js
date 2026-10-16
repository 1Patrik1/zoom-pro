import { query } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';
import { pushService } from './push.service.js';
import { isValidNotificationUserId, normalizeNotificationInput } from '../utils/notifications-validation.js';

export const notificationsService = {
  async createForUsers(userIds, input) {
    const normalized = normalizeNotificationInput(input);
    if (!normalized.ok) throw new HttpError(400, normalized.error);

    const ids = [...new Set((Array.isArray(userIds) ? userIds : []).filter(isValidNotificationUserId))].slice(0, 100);
    if (!ids.length) return { created: 0, push: { sent: 0, invalid: 0, reason: 'no-valid-recipients' } };

    const { title, body, type, data } = normalized.value;
    const rows = await query(
      `INSERT INTO "Notification" ("userId", "companyId", title, body, type, data)
       SELECT u.id, u."companyId", $2, $3, $4, $5::jsonb
       FROM "User" u
       WHERE u.id = ANY($1::uuid[])
       RETURNING id, "userId", "createdAt"`,
      [ids, title, body, type, JSON.stringify(data)]
    );
    const created = rows.rows || rows;
    const recipientIds = [...new Set(created.map((row) => row.userId))];

    let push = { sent: 0, invalid: 0, reason: 'push-not-attempted' };
    if (recipientIds.length) {
      try {
        const result = await pushService.sendToUsers(recipientIds, {
          title,
          body,
          data: { ...data, type: data.type || type }
        });
        push = {
          sent: Number(result.sent || 0),
          invalid: Number(result.invalid || 0),
          ...(result.reason ? { reason: result.reason } : {})
        };
      } catch (error) {
        // In-app persistence is the source of truth; a push-provider outage must not
        // roll back a notification the user can read in the app.
        push = { sent: 0, invalid: recipientIds.length, reason: 'push-delivery-failed' };
      }
    }

    return { created: created.length, push };
  }
};
