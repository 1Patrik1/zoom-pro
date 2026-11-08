#!/usr/bin/env node
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Client } from 'pg';

const EMAIL = 'owner@platform.local';
const PLACEHOLDER_HASH = '!INITIAL_PASSWORD_SETUP_REQUIRED!';
const LEGACY_PUBLIC_HASH = ['$2a$12$gGSBNLlFm0fZEM5L8UXZV.nPrMyBeMEPbHu.', '8bn1qT3COfuXWtvCK'].join('');
const suppliedPassword = process.env.INITIAL_ADMIN_PASSWORD;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const found = await client.query('SELECT id, password FROM "User" WHERE email = $1 LIMIT 1', [EMAIL]);
  if (!found.rows.length) throw new Error('Platform admin is missing. Run the platform SQL seed first.');

  const user = found.rows[0];
  if (![PLACEHOLDER_HASH, LEGACY_PUBLIC_HASH].includes(user.password)) {
    console.log('Existing SUPERADMIN password preserved; no password was changed.');
  } else {
    if (suppliedPassword && suppliedPassword.length < 20) {
      throw new Error('INITIAL_ADMIN_PASSWORD must contain at least 20 characters.');
    }
    if (!suppliedPassword && !process.stdout.isTTY) {
      throw new Error('Non-interactive setup requires INITIAL_ADMIN_PASSWORD; refusing to print a generated password into CI logs.');
    }
    const password = suppliedPassword || randomBytes(32).toString('base64url');
    const hash = await bcrypt.hash(password, 12);
    const updated = await client.query('UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2 AND password = $3 RETURNING id', [hash, user.id, user.password]);
    if (updated.rowCount !== 1) throw new Error('Admin password changed concurrently; no credential was printed. Re-run after checking the account.');
    console.log('SUPERADMIN account provisioned.');
    console.log('Email: ' + EMAIL);
    if (suppliedPassword) {
      console.log('Password was read from INITIAL_ADMIN_PASSWORD; it was not printed.');
    } else {
      console.log('ONE-TIME INITIAL PASSWORD (store it now; it will not be shown again):');
      console.log(password);
    }
  }
} catch (error) {
  console.error('Platform admin provisioning failed: ' + error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
