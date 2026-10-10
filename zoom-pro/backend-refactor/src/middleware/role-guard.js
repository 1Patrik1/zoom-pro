import { HttpError } from '../utils/http-error.js';

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Neautorizováno'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Nedostatečná role'));
  next();
};
