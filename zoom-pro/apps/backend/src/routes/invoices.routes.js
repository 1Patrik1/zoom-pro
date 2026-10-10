import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { invoicesService } from '../services/invoices.service.js';

const router = Router();

router.post(
  '/',
  auth,
  requireCapability('invoices.create'),
  validateRequest({ body: validators.invoiceCreate }),
  asyncHandler(async (req, res) => res.json({ ok: true, invoice: await invoicesService.create(req.user, req.body) }))
);

router.post(
  '/auto',
  auth,
  requireCapability('invoices.create'),
  validateRequest({ body: validators.invoiceAutoCreate }),
  asyncHandler(async (req, res) => res.json({ ok: true, invoice: await invoicesService.createAutoFromAttendance(req.user, req.body) }))
);

router.post(
  '/pay',
  auth,
  requireCapability('invoices.mark_paid'),
  validateRequest({ body: validators.invoicePay }),
  asyncHandler(async (req, res) => res.json({ ok: true, invoice: await invoicesService.markPaid(req.user, req.body) }))
);

export default router;
