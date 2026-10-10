import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { signaturesService } from '../services/signatures.service.js';

const router = Router();
router.get('/providers', auth, requireCapability('signatures.request'), asyncHandler(async (req, res) => res.json(await signaturesService.listProviders(req.user.companyId))));
router.get('/requests', auth, requireCapability('signatures.request'), asyncHandler(async (req, res) => res.json(await signaturesService.listRequests(req.user.companyId))));
router.post('/requests', auth, requireCapability('signatures.request'), validateRequest({ body: validators.signatureRequestCreate }), asyncHandler(async (req, res) => res.status(201).json(await signaturesService.createRequest(req.user.companyId, req.user.id, req.body))));
export default router;
