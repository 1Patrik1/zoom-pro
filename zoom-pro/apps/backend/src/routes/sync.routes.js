import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { syncService } from '../services/sync.service.js';

const router = Router();
router.get('/', auth, asyncHandler(async (req, res) => req.query.since
        ? res.json(await syncService.getDeltaSync(req.user, new Date(req.query.since)))
        : res.json(await syncService.getFullSync(req.user))));
export default router;
