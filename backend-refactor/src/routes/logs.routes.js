import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { logsService } from '../services/logs.service.js';

const router = Router();
router.post('/', auth, asyncHandler(async (req, res) => res.json({ ok: true, log: await logsService.create(req.user, req.body) })));
export default router;
