const INSECURE_JWT_SECRETS = new Set([
  'change-me-in-production',
  'changeme',
  'change-me',
  'secret',
  'jwt-secret',
  'your-secret-key',
  'your_jwt_secret',
  'supersilneheslozde123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
]);

export function validateProductionConfig({ nodeEnv, jwtSecret, corsOrigin }) {
  if (nodeEnv !== 'production') return;

  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32
    || INSECURE_JWT_SECRETS.has(jwtSecret.trim().toLowerCase())) {
    throw new Error('JWT_SECRET is insecure for production: provide a unique random secret with at least 32 characters.');
  }

  const origins = Array.isArray(corsOrigin) ? corsOrigin : [];
  if (!origins.length || origins.includes('*')) {
    throw new Error('CORS_ORIGIN must contain an explicit production origin allowlist; wildcard CORS is not allowed.');
  }
}
