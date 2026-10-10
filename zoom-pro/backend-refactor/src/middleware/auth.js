import { verifyAccessToken } from '../utils/jwt.js';
import { query } from '../config/db.js';
import { HttpError } from '../utils/http-error.js';

export async function auth(req, _res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new HttpError(401, 'Přístup odepřen');

    const decoded = verifyAccessToken(token);
    const result = await query(
      `SELECT u.*, c."isActive" as "compActive"
       FROM "User" u
       JOIN "Company" c ON u."companyId" = c.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (!result.rows.length) throw new HttpError(403, 'Uživatel nenalezen');
    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error.status ? error : new HttpError(403, 'Neplatný token'));
  }
}
