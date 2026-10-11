import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { supportService } from '../services/support.service.js';

const router = Router();

router.get('/', auth, asyncHandler(async (req, res) => {
  const messages = await supportService.listMessages(req.user, req.query.companyId);
  res.json({ ok: true, messages });
}));

router.post('/', auth, asyncHandler(async (req, res) => {
  const message = await supportService.createMessage(req.user, req.body || {});
  res.status(201).json({ ok: true, message });
}));

router.get('/requests', auth, asyncHandler(async (req, res) => {
  const requests = await supportService.listOpenLicenseRequests(req.user);
  res.json({ ok: true, requests });
}));

router.post('/requests/:id/resolve', auth, asyncHandler(async (req, res) => {
  res.json(await supportService.resolveLicenseRequest(req.user, req.params.id));
}));

export default router;
