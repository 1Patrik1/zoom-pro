import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { geminiService } from '../services/gemini.service.js';

const router = Router();

router.post('/chat', auth, asyncHandler(async (req, res) => {
  const result = await geminiService.chat(req.user, req.body || {});
  res.json({ ok: result.ok !== false, ...result });
}));

router.post('/troubleshoot', auth, asyncHandler(async (req, res) => {
  const result = await geminiService.troubleshoot(req.user, req.body || {});
  res.json({ ok: result.ok !== false, ...result });
}));

export default router;
