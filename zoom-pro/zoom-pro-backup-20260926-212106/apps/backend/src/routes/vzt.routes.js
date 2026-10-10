import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { vztService } from '../services/vzt.service.js';

const router = Router();
router.post('/', auth, requireCapability('vzt.create'), validateRequest({ body: validators.vztCreate }), asyncHandler(async (req, res) => res.json({ ok: true, component: await vztService.create(req.user, req.body) })));
export default router;
