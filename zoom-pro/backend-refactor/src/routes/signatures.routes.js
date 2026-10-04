import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { signaturesService } from '../services/signatures.service.js';

const router = Router();
router.get('/providers', auth, asyncHandler(async (req, res) => res.json(await signaturesService.listProviders(req.user.companyId))));
router.post('/requests', auth, asyncHandler(async (req, res) => res.status(201).json(await signaturesService.createRequest(req.user.companyId, req.body))));
export default router;
