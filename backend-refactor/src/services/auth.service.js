import bcrypt from 'bcryptjs';
import { authRepo } from '../repositories/auth.repo.js';
import { signAccessToken } from '../utils/jwt.js';
import { HttpError } from '../utils/http-error.js';

export const authService = {
  async register({ email, password, companyName, joinId }) {
    const existing = await authRepo.findByEmail(email);
    if (existing.rows.length) throw new HttpError(400, 'Tento e-mail už v systému existuje');
    const passwordHash = await bcrypt.hash(password, 10);

    if (joinId) {
      const company = await authRepo.findCompanyById(joinId);
      if (!company.rows.length) throw new HttpError(404, 'Firma pro připojení nebyla nalezena');
      await authRepo.createJoinUser({ email, passwordHash, companyId: joinId });
      return { msg: 'Účet vytvořen. Čekejte na schválení ředitelstvím.' };
    }

    await authRepo.createCompanyAndOwner({ companyName, email, passwordHash });
    return { msg: 'Firma založena! Vyčkejte na licenci.' };
  },

  async login({ email, password }) {
    const result = await authRepo.findByEmail(email);
    if (!result.rows.length) throw new HttpError(401, 'Špatné údaje.');

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new HttpError(401, 'Špatné údaje.');
    if (user.role !== 'SUPERADMIN' && !user.compActive) throw new HttpError(403, 'Firma nemá licenci!');

    return {
      token: signAccessToken({ id: user.id }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        isApproved: user.isApproved,
        compActive: user.compActive
      }
    };
  }
};
