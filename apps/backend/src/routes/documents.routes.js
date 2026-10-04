import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { documentsService } from '../services/documents.service.js';

const router = Router();
router.get('/', auth, requireCapability('documents.read'), validateRequest({ query: validators.documentsQuery }), asyncHandler(async (req, res) => res.json(await documentsService.list(req.user.companyId, req.query))));
router.get('/:id', auth, requireCapability('documents.read'), validateRequest({ params: validators.documentIdParam }), asyncHandler(async (req, res) => res.json(await documentsService.get(req.user.companyId, req.params.id))));
router.post('/', auth, requireCapability('documents.create'), validateRequest({ body: validators.documentCreate }), asyncHandler(async (req, res) => res.status(201).json(await documentsService.create(req.user.companyId, req.user.id, req.body))));
router.post('/:id/approve', auth, requireCapability('documents.approve'), validateRequest({ params: validators.documentIdParam }), asyncHandler(async (req, res) => res.json(await documentsService.approve(req.user.companyId, req.params.id, req.user.id))));
export default router;
