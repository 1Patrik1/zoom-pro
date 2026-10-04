import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { settingsService } from '../services/settings.service.js';

const router = Router();
router.post('/', auth, asyncHandler(async (req, res) => res.json({ ok: true, company: await settingsService.updatePricing(req.user, req.body) })));
router.get('/company', auth, asyncHandler(async (req, res) => res.json(await settingsService.getCompanySettings(req.user.companyId))));
router.get('/modules/:moduleKey', auth, asyncHandler(async (req, res) => res.json(await settingsService.getModuleSettings(req.user.companyId, req.params.moduleKey))));
router.put('/modules/:moduleKey', auth, asyncHandler(async (req, res) => res.json(await settingsService.upsertModuleSettings(req.user.companyId, req.params.moduleKey, req.body, req.user.id))));
export default router;
