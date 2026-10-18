import { describe, expect, it } from 'vitest';
import { validateProductionConfig } from './env-validation.js';

const good = {
  nodeEnv: 'production',
  jwtSecret: 'a-unique-random-secret-value-that-is-not-a-template',
  corsOrigin: ['https://app.example.test', 'https://api.example.test']
};

describe('production environment validation', () => {
  it('accepts a strong secret and explicit origin allowlist', () => {
    expect(() => validateProductionConfig(good)).not.toThrow();
  });

  it('rejects the documented sample JWT secret even though it is long', () => {
    expect(() => validateProductionConfig({
      ...good,
      jwtSecret: 'SuperSilneHesloZde123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    })).toThrow(/JWT_SECRET is insecure/);
  });

  it('rejects wildcard or missing CORS origins in production', () => {
    expect(() => validateProductionConfig({ ...good, corsOrigin: ['*'] })).toThrow(/CORS_ORIGIN/);
    expect(() => validateProductionConfig({ ...good, corsOrigin: [] })).toThrow(/CORS_ORIGIN/);
  });

  it('does not apply production-only checks in development', () => {
    expect(() => validateProductionConfig({
      nodeEnv: 'development',
      jwtSecret: 'dev',
      corsOrigin: ['*']
    })).not.toThrow();
  });
});
