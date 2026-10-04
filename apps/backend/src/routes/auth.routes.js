import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { authService } from '../services/auth.service.js';

const router = Router();
router.post('/register', validateRequest({ body: validators.authRegister }), asyncHandler(async (req, res) => res.json(await authService.register(req.body))));
router.post('/login', validateRequest({ body: validators.authLogin }), asyncHandler(async (req, res) => res.json(await authService.login(req.body))));
export default router;
