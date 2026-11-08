#!/usr/bin/env node
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Client } from 'pg';

const expectedPassword = process.env.EXPECTED_INITIAL_ADMIN_PASSWORD;
if (!process.env.DATABASE_URL || !expectedPassword) {
  console.error('DATABASE_URL and EXPECTED_INITIAL_ADMIN_PASSWORD are required.');
  process.exit(1);
}
const client = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const result = await client.query('SELECT password FROM "User" WHERE email = $1 LIMIT 1', ['owner@platform.local']);
  if (!result.rows.length || !(await bcrypt.compare(expectedPassword, result.rows[0].password))) {
    throw new Error('Existing SUPERADMIN password was not preserved by the repeated seed.');
  }
  console.log('Secure SUPERADMIN seed is idempotent; existing password was preserved.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
