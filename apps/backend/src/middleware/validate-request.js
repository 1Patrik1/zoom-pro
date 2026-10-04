import { HttpError } from '../utils/http-error.js';

export const validateRequest = ({ body, query, params } = {}) => (req, _res, next) => {
  const errors = [
    ...(body ? body(req.body || {}) : []),
    ...(query ? query(req.query || {}) : []),
    ...(params ? params(req.params || {}) : [])
  ];

  if (errors.length) {
    return next(new HttpError(400, 'Validation error', errors));
  }

  next();
};
