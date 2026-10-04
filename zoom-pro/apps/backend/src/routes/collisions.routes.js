import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { collisionsService } from '../services/collisions.service.js';

const router = Router();

router.get(
  '/',
  auth,
  requireCapability('collisions.read'),
  asyncHandler(async (req, res) => res.json({ ok: true, collisions: await collisionsService.list(req.user, { status: req.query.status || '' }) }))
);

router.post(
  '/detect',
  auth,
  requireCapability('collisions.manage'),
  asyncHandler(async (req, res) => res.json({ ok: true, result: await collisionsService.detectAndPersist(req.user) }))
);

router.post(
  '/status',
  auth,
  requireCapability('collisions.manage'),
  validateRequest({ body: validators.collisionStatus }),
  asyncHandler(async (req, res) => res.json(await collisionsService.setStatus(req.user, req.body.collisionId, req.body.status)))
);

export default router;
