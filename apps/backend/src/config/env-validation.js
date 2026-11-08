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

export function validateProductionConfig({ nodeEnv, jwtSecret, corsOrigin, databaseUrl }) {
  if (nodeEnv !== 'production') return;

  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32
    || INSECURE_JWT_SECRETS.has(jwtSecret.trim().toLowerCase())) {
    throw new Error('JWT_SECRET is insecure for production: provide a unique random secret with at least 32 characters.');
  }

  const insecureDatabasePasswords = new Set([
    'change-me-in-production',
    'change-me',
    'changeme',
    'password',
    'postgres',
    'vzt_pass'
  ]);
  let databasePassword = '';
  try {
    databasePassword = decodeURIComponent(new URL(databaseUrl).password);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (databasePassword.length < 20
    || insecureDatabasePasswords.has(databasePassword.trim().toLowerCase())) {
    throw new Error('DATABASE_URL password is insecure for production: use a unique random password with at least 20 characters.');
  }

  const origins = Array.isArray(corsOrigin) ? corsOrigin : [];
  const hasPlaceholderOrigin = origins.some((origin) =>
    /^(change-me|https?:\/\/your-|https?:\/\/example\.)/i.test(origin)
    || origin === 'http://localhost'
    || origin === 'http://localhost:5173'
  );
  if (!origins.length || origins.includes('*') || hasPlaceholderOrigin) {
    throw new Error('CORS_ORIGIN must contain an explicit production origin allowlist; wildcard CORS is not allowed.');
  }
}
