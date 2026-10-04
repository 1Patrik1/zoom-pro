import { logger } from '../utils/logger.js';

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  logger.error(err.message, err.details || '');
  res.status(status).json({
    error: err.message || 'Interní chyba serveru',
    details: err.details || null
  });
}
