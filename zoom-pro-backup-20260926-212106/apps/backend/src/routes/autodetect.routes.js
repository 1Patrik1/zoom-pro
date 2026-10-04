import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { autoDetectService } from '../services/autodetect.service.js';

const r = Router();

r.post('/detect', auth, asyncHandler(async (req, res) => {
  const result = await autoDetectService.detect(req.user, req.body || {});
  res.json(result);
}));

r.get('/history', auth, asyncHandler(async (req, res) => {
  const rows = await autoDetectService.history(req.user, req.query.projectId || null);
  res.json({ ok: true, rows });
}));

export default r;
