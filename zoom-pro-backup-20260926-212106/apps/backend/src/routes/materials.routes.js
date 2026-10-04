import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { materialsService } from '../services/materials.service.js';

const router = Router();

router.get('/search', auth, asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const rows = await materialsService.search(req.user, q);
  res.json(rows);
}));

router.get('/', auth, asyncHandler(async (req, res) => {
  const rows = await materialsService.list(req.user);
  res.json(rows);
}));

router.post('/', auth, asyncHandler(async (req, res) => {
  const item = await materialsService.create(req.user, req.body);
  res.status(201).json(item);
}));

router.post('/seed', auth, asyncHandler(async (req, res) => {
  const items = req.body.items || [];
  const seeded = await materialsService.seed(req.user, items);
  res.json({ seeded });
}));

export default router;
