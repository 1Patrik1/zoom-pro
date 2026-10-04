import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { saasService } from '../services/saas.service.js';

const router = Router();
router.post('/toggle', auth, requireCapability('saas.manage_licenses'), validateRequest({ body: validators.companyIdBody }), asyncHandler(async (req, res) => res.json({ ok: true, company: await saasService.toggle(req.user, req.body) })));
export default router;
