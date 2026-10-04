import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { exportsService } from '../services/exports.service.js';

const router = Router();
router.get('/profiles', auth, requireCapability('exports.read_history'), asyncHandler(async (req, res) => res.json(await exportsService.listProfiles(req.user.companyId))));
router.get('/jobs', auth, requireCapability('exports.read_history'), asyncHandler(async (req, res) => res.json(await exportsService.listJobs(req.user.companyId))));
router.post('/jobs', auth, requireCapability('exports.execute'), validateRequest({ body: validators.exportJobCreate }), asyncHandler(async (req, res) => res.status(201).json(await exportsService.createJob(req.user.companyId, req.user.id, req.body))));
export default router;
