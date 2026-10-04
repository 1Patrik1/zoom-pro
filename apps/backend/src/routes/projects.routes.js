import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { projectsService } from '../services/projects.service.js';

const router = Router();

router.post(
  '/',
  auth,
  requireCapability('projects.create'),
  validateRequest({ body: validators.projectCreate }),
  asyncHandler(async (req, res) => res.json({ ok: true, project: await projectsService.create(req.user, req.body) }))
);

router.post(
  '/update',
  auth,
  requireCapability('projects.create'),
  validateRequest({ body: validators.projectUpdate }),
  asyncHandler(async (req, res) => res.json({ ok: true, project: await projectsService.update(req.user, req.body) }))
);

router.post(
  '/assign',
  auth,
  requireCapability('projects.assign_team'),
  validateRequest({ body: validators.projectAssign }),
  asyncHandler(async (req, res) => res.json(await projectsService.assign(req.user, req.body)))
);

router.post(
  '/chat',
  auth,
  requireCapability('chat.send'),
  validateRequest({ body: validators.projectChat }),
  asyncHandler(async (req, res) => res.json({ ok: true, chat: await projectsService.createChat(req.user, req.body) }))
);

export default router;
