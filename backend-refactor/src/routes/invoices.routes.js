import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { invoicesService } from '../services/invoices.service.js';

const router = Router();
router.post('/', auth, asyncHandler(async (req, res) => res.json({ ok: true, invoice: await invoicesService.create(req.user, req.body) })));
router.post('/pay', auth, asyncHandler(async (req, res) => res.json({ ok: true, invoice: await invoicesService.markPaid(req.user, req.body) })));
export default router;
