import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { saasService } from '../services/saas.service.js';

const router = Router();
router.post('/toggle', auth, asyncHandler(async (req, res) => res.json({ ok: true, company: await saasService.toggle(req.user, req.body) })));
export default router;
