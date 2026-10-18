import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/jwt.js', () => ({ verifyAccessToken: vi.fn(() => ({ id: 'user-1' })) }));
vi.mock('../config/db.js', () => ({ query: vi.fn() }));

import { query } from '../config/db.js';
import { auth } from './auth.js';

function makeReq() {
  return { headers: { authorization: 'Bearer valid-token' } };
}

describe('auth company status enforcement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a user whose company has been deactivated after token issuance', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-1', role: 'MONTER', companyId: 'company-1', compActive: false }] });
    const next = vi.fn();

    await auth(makeReq(), {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403, message: 'Firma nemá licenci!' }));
  });

  it('allows an active tenant user', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-1', role: 'MONTER', companyId: 'company-1', compActive: true }] });
    const req = makeReq();
    const next = vi.fn();

    await auth(req, {}, next);

    expect(req.user.companyId).toBe('company-1');
    expect(next).toHaveBeenCalledWith();
  });

  it('allows SUPERADMIN platform access independent of tenant company status', async () => {
    query.mockResolvedValue({ rows: [{ id: 'user-1', role: 'SUPERADMIN', companyId: 'platform-company', compActive: false }] });
    const req = makeReq();
    const next = vi.fn();

    await auth(req, {}, next);

    expect(req.user.role).toBe('SUPERADMIN');
    expect(next).toHaveBeenCalledWith();
  });
});
