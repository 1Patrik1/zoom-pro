import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { printService } from '../services/print.service.js';

const router = Router();

router.post(
  '/document/:documentType',
  auth,
  validateRequest({ params: validators.printDocumentParams, body: validators.printDocumentBody }),
  asyncHandler(async (req, res) => {
    const allowed = new Set(['issue', 'receipt', 'inventory-audit']);
    if (!allowed.has(req.params.documentType)) {
      return res.status(400).json({ ok: false, message: 'Nepodporovaný typ tiskového dokumentu' });
    }
    if (req.params.documentType === 'issue') {
      return res.json({ ok: true, document: await printService.issueDocument(req.user, req.body || {}) });
    }
    if (req.params.documentType === 'receipt') {
      return res.json({ ok: true, document: await printService.receiptDocument(req.user, req.body || {}) });
    }
    return res.json({ ok: true, document: await printService.inventoryAuditDocument(req.user) });
  })
);

router.post(
  '/qr/project-zone',
  auth,
  validateRequest({ body: validators.printQrZone }),
  asyncHandler(async (req, res) => res.json({ ok: true, document: await printService.projectZoneLabel(req.user, req.body.projectId) }))
);

router.post(
  '/qr/inventory-labels',
  auth,
  validateRequest({ body: validators.printQrInventory }),
  asyncHandler(async (req, res) => res.json({ ok: true, document: await printService.inventoryLabels(req.user, req.body || {}) }))
);

export default router;
