import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { vztService } from '../services/vzt.service.js';

const router = Router();
router.post('/', auth, asyncHandler(async (req, res) => res.json({ ok: true, component: await vztService.create(req.user, req.body) })));
export default router;
