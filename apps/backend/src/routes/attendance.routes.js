import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { attendanceService } from '../services/attendance.service.js';

const router = Router();
router.post('/', auth, requireCapability('attendance.create'), validateRequest({ body: validators.attendanceCreate }), asyncHandler(async (req, res) => res.json({ ok: true, attendance: await attendanceService.create(req.user, req.body) })));
export default router;
