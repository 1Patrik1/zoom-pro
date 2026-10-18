import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/invoices.repo.js', () => ({
  invoicesRepo: {
    create: vi.fn(),
    getEmployee: vi.fn(),
    getProject: vi.fn(),
    markPaid: vi.fn(),
    getAttendanceForEmployee: vi.fn(),
    getLogsForEmployee: vi.fn()
  }
}));

import { invoicesRepo } from '../repositories/invoices.repo.js';
import { invoicesService } from './invoices.service.js';

describe('invoice tenant reference validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an employee from another company', async () => {
    invoicesRepo.getEmployee.mockResolvedValue({ rows: [] });

    await expect(invoicesService.create(
      { id: 'manager-a', companyId: 'company-a', role: 'REDITEL' },
      { employeeId: 'employee-b', amount: 100, vatRate: 0 }
    )).rejects.toMatchObject({ status: 404 });

    expect(invoicesRepo.create).not.toHaveBeenCalled();
  });

  it('rejects a project from another company', async () => {
    invoicesRepo.getEmployee.mockResolvedValue({ rows: [{ id: 'employee-a' }] });
    invoicesRepo.getProject.mockResolvedValue({ rows: [] });

    await expect(invoicesService.create(
      { id: 'manager-a', companyId: 'company-a', role: 'REDITEL' },
      { employeeId: 'employee-a', projectId: 'project-b', amount: 100, vatRate: 0 }
    )).rejects.toMatchObject({ status: 404 });

    expect(invoicesRepo.create).not.toHaveBeenCalled();
  });

  it('creates an invoice after confirming employee and project ownership', async () => {
    const invoice = { id: 'invoice-a', companyId: 'company-a' };
    invoicesRepo.getEmployee.mockResolvedValue({ rows: [{ id: 'employee-a' }] });
    invoicesRepo.getProject.mockResolvedValue({ rows: [{ id: 'project-a' }] });
    invoicesRepo.create.mockResolvedValue({ rows: [invoice] });

    await expect(invoicesService.create(
      { id: 'manager-a', companyId: 'company-a', role: 'REDITEL' },
      { employeeId: 'employee-a', projectId: 'project-a', amount: 100, vatRate: 21 }
    )).resolves.toEqual(invoice);

    expect(invoicesRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company-a',
      employeeId: 'employee-a',
      projectId: 'project-a',
      amount: 100,
      amountVat: 21,
      amountTotal: 121
    }));
  });
});
