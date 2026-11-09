import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { plansService } from '../services/plans.service.js';

const router = Router();

router.get(
  '/',
  auth,
  requireCapability('plans.read'),
  validateRequest({ query: validators.plansQuery }),
  asyncHandler(async (req, res) => res.json(await plansService.list(req.user.companyId, req.query)))
);

router.get(
  '/:id',
  auth,
  requireCapability('plans.read'),
  validateRequest({ params: validators.planIdParam }),
  asyncHandler(async (req, res) => res.json(await plansService.get(req.user.companyId, req.params.id)))
);

router.post(
  '/',
  auth,
  requireCapability('plans.manage'),
  validateRequest({ body: validators.planCreate }),
  asyncHandler(async (req, res) => res.status(201).json(await plansService.create(req.user.companyId, req.user.id, req.body)))
);

router.post(
  '/:id/versions',
  auth,
  requireCapability('plans.manage'),
  validateRequest({ params: validators.planIdParam, body: validators.planVersionCreate }),
  asyncHandler(async (req, res) => res.status(201).json(await plansService.createVersion(req.user.companyId, req.user.id, req.params.id, req.body)))
);

router.post(
  '/:id/archive',
  auth,
  requireCapability('plans.manage'),
  validateRequest({ params: validators.planIdParam }),
  asyncHandler(async (req, res) => res.json(await plansService.archive(req.user.companyId, req.params.id)))
);

router.get(
  '/:id/markers',
  auth,
  requireCapability('plans.read'),
  validateRequest({ params: validators.planIdParam }),
  asyncHandler(async (req, res) => res.json(await plansService.listMarkers(req.user.companyId, req.params.id)))
);

router.post(
  '/:id/markers',
  auth,
  requireCapability('plans.annotate'),
  validateRequest({ params: validators.planIdParam, body: validators.planMarkerCreate }),
  asyncHandler(async (req, res) => res.status(201).json(await plansService.createMarker(req.user.companyId, req.user.id, req.params.id, req.body)))
);

router.delete(
  '/markers/:markerId',
  auth,
  requireCapability('plans.annotate'),
  validateRequest({ params: validators.markerIdParam }),
  asyncHandler(async (req, res) => res.json(await plansService.deleteMarker(req.user.companyId, req.params.markerId)))
);

export default router;
