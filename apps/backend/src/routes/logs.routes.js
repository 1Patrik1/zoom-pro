import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { logsService } from '../services/logs.service.js';

const router = Router();
router.post('/', auth, requireCapability('daily_log.create'), validateRequest({ body: validators.logCreate }), asyncHandler(async (req, res) => res.json({ ok: true, log: await logsService.create(req.user, req.body) })));
export default router;
