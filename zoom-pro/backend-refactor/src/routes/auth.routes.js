import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authService } from '../services/auth.service.js';

const router = Router();
router.post('/register', asyncHandler(async (req, res) => res.json(await authService.register(req.body))));
router.post('/login', asyncHandler(async (req, res) => res.json(await authService.login(req.body))));
export default router;
