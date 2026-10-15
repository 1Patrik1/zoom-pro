import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;
const insecureJwtSecrets = new Set([
  'change-me-in-production',
  'changeme',
  'change-me',
  'secret',
  'jwt-secret',
  'your-secret-key',
  'your_jwt_secret'
]);

if (nodeEnv === 'production') {
  if (jwtSecret.length < 32 || insecureJwtSecrets.has(jwtSecret.trim().toLowerCase())) {
    throw new Error('JWT_SECRET is insecure for production: provide a unique random secret with at least 32 characters.');
  }
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  corsOrigin: (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  appName: process.env.APP_NAME || 'zoom-pro',
  trustProxy: process.env.TRUST_PROXY === 'true',
  pgPoolMax: Number(process.env.PG_POOL_MAX || 10),
  pgIdleTimeoutMs: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000)
};
