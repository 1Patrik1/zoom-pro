import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { inventoryService } from '../services/inventory.service.js';

const router = Router();

router.post(
  '/item',
  auth,
  requireCapability('inventory.create_item'),
  validateRequest({ body: validators.inventoryItemCreate }),
  asyncHandler(async (req, res) => res.json({ ok: true, item: await inventoryService.createItem(req.user, req.body) }))
);

router.post(
  '/movement',
  auth,
  requireCapability('inventory.create_movement'),
  validateRequest({ body: validators.inventoryMovementCreate }),
  asyncHandler(async (req, res) => res.json({ ok: true, result: await inventoryService.createMovement(req.user, req.body) }))
);

export default router;
