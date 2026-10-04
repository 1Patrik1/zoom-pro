import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { assistantService } from '../services/assistant.service.js';

const router = Router();

router.post(
  '/analyze',
  auth,
  validateRequest({ body: validators.assistantAnalyze }),
  asyncHandler(async (req, res) => res.json({ ok: true, analysis: await assistantService.analyze(req.user, req.body) }))
);

export default router;
