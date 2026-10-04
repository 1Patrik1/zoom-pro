import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { licensingService } from '../services/licensing.service.js';

const router = Router();

router.get('/plans', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, plans: await licensingService.listPlans(req.user) });
}));

router.post('/plans', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, plan: await licensingService.savePlan(req.user, req.body) });
}));

router.delete('/plans/:code', auth, asyncHandler(async (req, res) => {
  res.json(await licensingService.deletePlan(req.user, req.params.code));
}));

router.get('/mine', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, ...(await licensingService.getMyLicense(req.user)) });
}));

router.post('/quote', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, ...(await licensingService.quote(req.user, req.body)) });
}));

router.post('/subscribe', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, ...(await licensingService.subscribe(req.user, req.body)) });
}));

router.get('/platform-settings', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, settings: await licensingService.listPlatformSettings(req.user) });
}));

router.post('/platform-settings', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, setting: await licensingService.savePlatformSetting(req.user, req.body) });
}));

export default router;
