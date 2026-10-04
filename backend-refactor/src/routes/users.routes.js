import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { usersService } from '../services/users.service.js';

const router = Router();
router.post('/role', auth, asyncHandler(async (req, res) => res.json({ ok: true, user: await usersService.updateRole(req.user, req.body) })));
router.post('/approve', auth, asyncHandler(async (req, res) => res.json({ ok: true, user: await usersService.approve(req.user, req.body) })));
export default router;
