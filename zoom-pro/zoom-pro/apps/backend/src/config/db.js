import pkg from 'pg';
import { env } from './env.js';

const { Pool } = pkg;
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.pgPoolMax,
  idleTimeoutMillis: env.pgIdleTimeoutMs
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  // Hybridní návrat: pole řádků, které zároveň nese .rows / .rowCount / .command.
  // Řeší nekonzistenci repozitářů (někde se destrukturalizuje pole, jinde se čte .rows).
  const rows = result.rows;
  rows.rows = result.rows;
  rows.rowCount = result.rowCount;
  rows.command = result.command;
  return rows;
}

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
