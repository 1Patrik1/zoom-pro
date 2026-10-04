import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { logger } from './utils/logger.js';

const app = createApp();

process.on('uncaughtException', (err) => logger.error('Uncaught exception:', err));
process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });

app.listen(env.port, '0.0.0.0', () => {
  logger.info(`${env.appName} backend listening on ${env.port}`);
});
