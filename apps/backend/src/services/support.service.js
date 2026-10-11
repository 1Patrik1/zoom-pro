import { supportRepo } from '../repositories/support.repo.js';
import { HttpError } from '../utils/http-error.js';
import { query } from '../config/db.js';
import { pushService } from './push.service.js';

export const supportService = {
  async listMessages(user, requestedCompanyId) {
    const companyId = user.role === 'SUPERADMIN' ? requestedCompanyId : user.companyId;
    if (!companyId) throw new HttpError(400, 'Vyberte firmu.');
    if (user.role !== 'SUPERADMIN' && companyId !== user.companyId) {
      throw new HttpError(403, 'K této konverzaci nemáte přístup.');
    }
    return supportRepo.listMessages(companyId);
  },

  async createMessage(user, { companyId: requestedCompanyId, text, requestType, requestDetails }) {
    const companyId = user.role === 'SUPERADMIN' ? requestedCompanyId : user.companyId;
    const message = typeof text === 'string' ? text.trim() : '';
    if (!companyId) throw new HttpError(400, 'Vyberte firmu.');
    if (user.role !== 'SUPERADMIN' && companyId !== user.companyId) {
      throw new HttpError(403, 'K této konverzaci nemáte přístup.');
    }
    if (!message || message.length > 5000) throw new HttpError(400, 'Zpráva musí mít 1 až 5000 znaků.');
    if (requestType && (requestType !== 'LICENSE_REQUEST' || user.role !== 'REDITEL')) {
      throw new HttpError(403, 'Žádost o změnu licence může podat pouze ředitel firmy.');
    }
    let details = {};
    if (requestType === 'LICENSE_REQUEST') {
      const users = Number(requestDetails?.users);
      const period = Number(requestDetails?.period);
      if (!requestDetails?.planCode || String(requestDetails.planCode).length > 64) throw new HttpError(400, 'V žádosti chybí platný balíček.');
      if (!Number.isInteger(users) || users < 1 || users > 10000) throw new HttpError(400, 'Počet členů musí být celé číslo od 1 do 10000.');
      if (![1, 3, 6, 12].includes(period)) throw new HttpError(400, 'Neplatná délka licence.');
      const modules = Array.isArray(requestDetails.modules) ? requestDetails.modules : [];
      details = {
        planCode: String(requestDetails.planCode),
        users,
        period,
        modules: [...new Set(modules.filter((module) => typeof module === 'string').map((module) => module.slice(0, 64)))].slice(0, 50)
      };
    }
    const result = await supportRepo.createMessage({
      companyId,
      userId: user.id,
      text: message,
      requestType: requestType || null,
      requestDetails: details
    });
    const messages = await supportRepo.listMessages(companyId);
    const createdMessage = messages.find((item) => item.id === result[0]?.id) || result[0];
    const recipientQuery = user.role === 'SUPERADMIN'
      ? query(`SELECT id FROM "User" WHERE "companyId" = $1 AND id <> $2`, [companyId, user.id])
      : query(`SELECT id FROM "User" WHERE role = 'SUPERADMIN' AND id <> $1`, [user.id]);
    recipientQuery.then(({ rows }) => pushService.sendToUsers(rows.map((row) => row.id), {
      title: requestType === 'LICENSE_REQUEST' ? 'Nová žádost o licenci' : `Chat-podpora · ${createdMessage.companyName || 'firma'}`,
      body: `${createdMessage.companyName ? `${createdMessage.companyName}: ` : ''}${createdMessage.authorName || user.email}: ${message}`.slice(0, 180),
      data: { type: 'support-chat', companyId: String(companyId), messageId: String(createdMessage.id) }
    })).catch((error) => console.warn('[push] Support chat notification failed:', error.message));
    return createdMessage;
  },

  async listOpenLicenseRequests(user) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Pouze SUPERADMIN může zobrazit všechny žádosti.');
    return supportRepo.listOpenLicenseRequests();
  },

  async resolveLicenseRequest(user, requestId) {
    if (user.role !== 'SUPERADMIN') throw new HttpError(403, 'Pouze SUPERADMIN může vyřídit žádosti.');
    const result = await supportRepo.resolveLicenseRequest(requestId, user.id);
    if (!result.length) throw new HttpError(404, 'Nevyřízená žádost nebyla nalezena.');
    return { ok: true, ...result[0] };
  }
};
