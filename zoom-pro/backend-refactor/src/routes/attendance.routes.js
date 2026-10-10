import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { attendanceService } from '../services/attendance.service.js';

const router = Router();
router.post('/', auth, asyncHandler(async (req, res) => res.json({ ok: true, attendance: await attendanceService.create(req.user, req.body) })));
export default router;
