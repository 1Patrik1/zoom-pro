import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { authRepo } from '../repositories/auth.repo.js';
import { authService } from './auth.service.js';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  }
}));
vi.mock('../repositories/auth.repo.js', () => ({
  authRepo: {
    findByEmail: vi.fn()
  }
}));
vi.mock('../utils/jwt.js', () => ({ signAccessToken: vi.fn() }));
vi.mock('../config/db.js', () => ({ query: vi.fn() }));
vi.mock('./push.service.js', () => ({ pushService: { sendToUsers: vi.fn() } }));

describe('authService.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks an unprovisioned SUPERADMIN before password comparison', async () => {
    authRepo.findByEmail.mockResolvedValue({
      rows: [{ password: '!INITIAL_PASSWORD_SETUP_REQUIRED!' }]
    });

    await expect(authService.login({
      email: 'owner@platform.local',
      password: 'any-input'
    })).rejects.toThrow('počáteční heslo');

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});
