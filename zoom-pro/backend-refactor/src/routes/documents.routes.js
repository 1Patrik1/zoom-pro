import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { documentsService } from '../services/documents.service.js';

const router = Router();
router.get('/', auth, asyncHandler(async (req, res) => res.json(await documentsService.list(req.user.companyId, req.query))));
router.get('/:id', auth, asyncHandler(async (req, res) => res.json(await documentsService.get(req.user.companyId, req.params.id))));
router.post('/', auth, asyncHandler(async (req, res) => res.status(201).json(await documentsService.create(req.user.companyId, req.user.id, req.body))));
router.post('/:id/approve', auth, asyncHandler(async (req, res) => res.json(await documentsService.approve(req.user.companyId, req.params.id, req.user.id))));
export default router;
