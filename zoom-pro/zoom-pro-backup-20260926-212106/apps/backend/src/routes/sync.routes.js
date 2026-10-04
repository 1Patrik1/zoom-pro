import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { syncService } from '../services/sync.service.js';

const router = Router();
router.get('/', auth, asyncHandler(async (req, res) => res.json(await syncService.getFullSync(req.user))));
export default router;
