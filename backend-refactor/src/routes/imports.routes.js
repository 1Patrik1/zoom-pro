import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { importsService } from '../services/imports.service.js';

const router = Router();
router.get('/profiles', auth, asyncHandler(async (req, res) => res.json(await importsService.listProfiles(req.user.companyId))));
router.get('/jobs', auth, asyncHandler(async (req, res) => res.json(await importsService.listJobs(req.user.companyId))));
router.post('/jobs', auth, asyncHandler(async (req, res) => res.status(201).json(await importsService.createJob(req.user.companyId, req.user.id, req.body))));
export default router;
