import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { troubleshootingService } from '../services/troubleshooting.service.js';

const router = Router();

router.get(
  '/:projectId',
  auth,
  requireCapability('projects.troubleshoot'),
  validateRequest({ params: validators.projectIdParam }),
  asyncHandler(async (req, res) => res.json({ ok: true, items: await troubleshootingService.listForProject(req.user, req.params.projectId) }))
);

router.post(
  '/',
  auth,
  requireCapability('projects.troubleshoot'),
  validateRequest({ body: validators.troubleshootingCreate }),
  asyncHandler(async (req, res) => res.json({ ok: true, item: await troubleshootingService.create(req.user, req.body) }))
);

router.post(
  '/analyze',
  auth,
  requireCapability('projects.troubleshoot'),
  validateRequest({ body: validators.troubleshootingAnalyze }),
  asyncHandler(async (req, res) => res.json({ ok: true, analysis: await troubleshootingService.proposeAnalysis(req.user, req.body) }))
);

router.get(
  '/context/:projectId',
  auth,
  requireCapability('projects.troubleshoot'),
  validateRequest({ params: validators.projectIdParam }),
  asyncHandler(async (req, res) => res.json({ ok: true, context: await troubleshootingService.gatherContext(req.user, req.params.projectId) }))
);

export default router;
