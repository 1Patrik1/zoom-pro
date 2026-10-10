import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { settingsService } from '../services/settings.service.js';

const router = Router();
router.post('/', auth, requireCapability('vzt.manage_pricing'), validateRequest({ body: validators.settingsPricing }), asyncHandler(async (req, res) => res.json({ ok: true, company: await settingsService.updatePricing(req.user, req.body) })));
router.get('/company', auth, requireCapability('settings.manage_company'), asyncHandler(async (req, res) => res.json(await settingsService.getCompanySettings(req.user.companyId))));
router.get('/modules/:moduleKey', auth, requireCapability('settings.manage_modules'), validateRequest({ params: validators.moduleKeyParam }), asyncHandler(async (req, res) => res.json(await settingsService.getModuleSettings(req.user.companyId, req.params.moduleKey))));
router.put('/modules/:moduleKey', auth, requireCapability('settings.manage_modules'), validateRequest({ params: validators.moduleKeyParam, body: validators.moduleSettingsBody }), asyncHandler(async (req, res) => res.json(await settingsService.upsertModuleSettings(req.user.companyId, req.params.moduleKey, req.body, req.user.id))));
export default router;
