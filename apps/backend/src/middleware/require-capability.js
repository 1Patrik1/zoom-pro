import { permissionsRepo } from '../repositories/permissions.repo.js';
import { HttpError } from '../utils/http-error.js';

export const requireCapability = (capability) => async (req, _res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Neautorizováno');

    if (!req.user._capabilities) {
      const result = await permissionsRepo.getEffectivePermissions(req.user.id, req.user.role);
      req.user._capabilities = new Set(result.rows.filter((row) => row.granted).map((row) => row.key));
    }

    if (!req.user._capabilities.has(capability)) {
      throw new HttpError(403, `Chybí oprávnění: ${capability}`);
    }

    next();
  } catch (error) {
    next(error);
  }
};
