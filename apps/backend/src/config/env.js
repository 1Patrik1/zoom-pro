import 'dotenv/config';
import { validateProductionConfig } from './env-validation.js';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;
const corsOriginRaw = process.env.CORS_ORIGIN || '*';

validateProductionConfig({
  nodeEnv,
  jwtSecret,
  corsOrigin: corsOriginRaw.split(',').map((s) => s.trim()).filter(Boolean)
});

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  corsOrigin: corsOriginRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  appName: process.env.APP_NAME || 'zoom-pro',
  trustProxy: process.env.TRUST_PROXY === 'true',
  pgPoolMax: Number(process.env.PG_POOL_MAX || 10),
  pgIdleTimeoutMs: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000)
};
