import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { projectsService } from '../services/projects.service.js';

const router = Router();
router.post('/', auth, asyncHandler(async (req, res) => res.json({ ok: true, project: await projectsService.create(req.user, req.body) })));
router.post('/assign', auth, asyncHandler(async (req, res) => res.json(await projectsService.assign(req.user, req.body))));
router.post('/chat', auth, asyncHandler(async (req, res) => res.json({ ok: true, chat: await projectsService.createChat(req.user, req.body) })));
export default router;
