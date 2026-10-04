import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  appName: process.env.APP_NAME || 'zoom-pro',
  trustProxy: process.env.TRUST_PROXY === 'true',
  pgPoolMax: Number(process.env.PG_POOL_MAX || 10),
  pgIdleTimeoutMs: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000)
};
