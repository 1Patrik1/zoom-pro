import { logger } from '../utils/logger.js';

export function errorHandler(err, _req, res, _next) {
  const candidate = Number(err?.status);
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
  const isServerError = status >= 500;

  // Keep diagnostics on the server; never expose internal exception details to clients.
  logger.error('Request failed', {
    status,
    message: err?.message || 'Unknown error',
    details: err?.details || null,
    stack: err?.stack
  });

  const payload = {
    error: isServerError ? 'Interní chyba serveru' : (err?.message || 'Požadavek selhal')
  };
  if (!isServerError && err?.details != null) payload.details = err.details;

  return res.status(status).json(payload);
}
