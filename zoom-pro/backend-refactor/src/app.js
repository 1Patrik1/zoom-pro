import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import syncRoutes from './routes/sync.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import usersRoutes from './routes/users.routes.js';
import saasRoutes from './routes/saas.routes.js';
import logsRoutes from './routes/logs.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import vztRoutes from './routes/vzt.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import importsRoutes from './routes/imports.routes.js';
import exportsRoutes from './routes/exports.routes.js';
import signaturesRoutes from './routes/signatures.routes.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();
  if (env.trustProxy) app.set('trust proxy', 1);
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: env.appName }));

  app.use('/api/auth', authRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/saas', saasRoutes);
  app.use('/api/logs', logsRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/vzt', vztRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/imports', importsRoutes);
  app.use('/api/exports', exportsRoutes);
  app.use('/api/signatures', signaturesRoutes);

  app.use(errorHandler);
  return app;
}
