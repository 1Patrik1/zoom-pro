import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { monterInvoicesService } from '../services/monter-invoices.service.js';

const router = Router();

router.get('/mine', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, invoices: await monterInvoicesService.listMyInvoices(req.user) });
}));

router.get('/pending', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, invoices: await monterInvoicesService.listPending(req.user) });
}));

router.post('/create', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, invoice: await monterInvoicesService.createMonterInvoice(req.user, req.body) });
}));

router.post('/submit', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, invoice: await monterInvoicesService.submitForApproval(req.user, req.body.invoiceId) });
}));

router.post('/approve', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, invoice: await monterInvoicesService.approve(req.user, req.body.invoiceId) });
}));

router.post('/rate', auth, asyncHandler(async (req, res) => {
  res.json({ ok: true, rate: await monterInvoicesService.setRate(req.user, req.body) });
}));

export default router;
