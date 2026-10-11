import bcrypt from 'bcryptjs';
import { authRepo } from '../repositories/auth.repo.js';
import { signAccessToken } from '../utils/jwt.js';
import { HttpError } from '../utils/http-error.js';
import { query } from '../config/db.js';
import { pushService } from './push.service.js';

function notifyRegistration(recipientQuery, values, { title, body, type, companyId }) {
  recipientQuery(values).then(({ rows }) => pushService.sendToUsers(rows.map((row) => row.id), {
    title, body: body.slice(0, 180), data: { type, companyId: String(companyId) }
  })).catch((error) => console.warn('[push] Registration notification failed:', error.message));
}

export const authService = {
  async register({ email, password, companyName, joinId, ico, dic, street, city, zip, employmentType, phone, companyEmail, companyPhone }) {
    email = String(email || '').trim().toLowerCase();
    const existing = await authRepo.findByEmail(email);
    if (existing.rows.length) throw new HttpError(400, 'Tento e-mail už v systému existuje');
    const passwordHash = await bcrypt.hash(password, 10);

    if (joinId) {
      const company = await authRepo.findCompanyById(joinId);
      if (!company.rows.length) throw new HttpError(404, 'Firma pro připojení nebyla nalezena');
      const isExternal = employmentType === 'EXTERNAL';
      await authRepo.createJoinUser({
        email, passwordHash, companyId: joinId,
        employmentType: isExternal ? 'EXTERNAL' : 'INTERNAL',
        ico: isExternal ? ico : null,
        dic: isExternal ? dic : null,
        street: isExternal ? street : null,
        city: isExternal ? city : null,
        zip: isExternal ? zip : null,
        phone
      });
      notifyRegistration(
        (values) => query(`SELECT id FROM "User" WHERE "companyId" = $1 AND role = 'REDITEL'`, values),
        [joinId],
        { title: 'Nový člen čeká na schválení', body: `O připojení k firmě požádal účet ${email}.`, type: 'member-registration', companyId: joinId }
      );
      return { msg: 'Účet vytvořen. Čekejte na schválení ředitelstvím.' };
    }

    const created = await authRepo.createCompanyAndOwner({
      companyName, ico, dic, street, city, zip,
      companyEmail: companyEmail?.trim().toLowerCase() || null,
      companyPhone: companyPhone?.trim() || null,
      email, passwordHash
    });
    notifyRegistration(
      () => query(`SELECT id FROM "User" WHERE role = 'SUPERADMIN'`),
      [],
      { title: 'Registrace nové firmy', body: `Nově se zaregistrovala firma ${created.company.name} (${email}).`, type: 'company-registration', companyId: created.company.id }
    );
    return { msg: 'Firma založena! Vyčkejte na licenci.' };
  },

  async login({ email, password }) {
    const result = await authRepo.findByEmail(String(email || '').trim().toLowerCase());
    if (!result.rows.length) throw new HttpError(401, 'Špatné údaje.');

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new HttpError(401, 'Špatné údaje.');
    if (!user.isApproved) throw new HttpError(403, 'Účet čeká na schválení ředitelem firmy.');
    if (user.role !== 'SUPERADMIN' && !user.compActive) throw new HttpError(403, 'Firma nemá licenci!');

    return {
      token: signAccessToken({ id: user.id }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        employmentType: user.employmentType || 'INTERNAL',
        ico: user.ico,
        dic: user.dic,
        street: user.street,
        city: user.city,
        zip: user.zip,
        companyId: user.companyId,
        isApproved: user.isApproved,
        compActive: user.compActive
      }
    };
  }
};
