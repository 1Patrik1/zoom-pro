import { invoicesRepo } from '../repositories/invoices.repo.js';

export const invoicesService = {
  async create(user, payload) {
    const result = await invoicesRepo.create({
      companyId: user.companyId,
      invoiceNumber: payload.invoiceNumber,
      amount: payload.amount
    });
    return result.rows[0];
  },
  async markPaid(user, payload) {
    const result = await invoicesRepo.markPaid({ companyId: user.companyId, id: payload.id });
    return result.rows[0];
  }
};
