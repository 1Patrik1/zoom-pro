import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { geminiService } from '../services/gemini.service.js';

const router = Router();
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/chat', auth, aiLimiter, asyncHandler(async (req, res) => {
  const result = await geminiService.chat(req.user, req.body || {});
  res.json({ ok: result.ok !== false, ...result });
}));

router.post('/troubleshoot', auth, aiLimiter, asyncHandler(async (req, res) => {
  const result = await geminiService.troubleshoot(req.user, req.body || {});
  res.json({ ok: result.ok !== false, ...result });
}));

export default router;
