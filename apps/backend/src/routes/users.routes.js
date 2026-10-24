import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireCapability } from '../middleware/require-capability.js';
import { validateRequest } from '../middleware/validate-request.js';
import { validators } from '../validators/request-validators.js';
import { usersService } from '../services/users.service.js';
import { employeePermissionsService } from '../services/employee-permissions.service.js';

const router = Router();
router.get('/permissions', auth, requireCapability('team.manage_permissions'), asyncHandler(async (req, res) => res.json(await employeePermissionsService.getManagementData(req.user))));
router.put('/permissions', auth, requireCapability('team.manage_permissions'), validateRequest({ body: validators.userPermissions }), asyncHandler(async (req, res) => res.json(await employeePermissionsService.saveForEmployee(req.user, req.body))));
router.post('/role', auth, requireCapability('team.edit_roles'), validateRequest({ body: validators.userRole }), asyncHandler(async (req, res) => res.json({ ok: true, user: await usersService.updateRole(req.user, req.body) })));
router.post('/approve', auth, requireCapability('team.approve'), validateRequest({ body: validators.userApprove }), asyncHandler(async (req, res) => res.json({ ok: true, user: await usersService.approve(req.user, req.body) })));
// Self-service: vlastní heslo + profil (jméno/příjmení) — žádná capability, stačí auth
router.post('/password', auth, validateRequest({ body: validators.userPasswordChange }), asyncHandler(async (req, res) => res.json(await usersService.changePassword(req.user, req.body))));
router.post('/profile', auth, validateRequest({ body: validators.userProfileUpdate }), asyncHandler(async (req, res) => res.json({ ok: true, user: await usersService.updateProfile(req.user, req.body) })));
export default router;
