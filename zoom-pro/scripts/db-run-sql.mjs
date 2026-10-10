import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const [, , ...inputFiles] = process.argv;

if (!inputFiles.length) {
  console.error('Usage: node scripts/db-run-sql.mjs <sql-file> [more-files...]');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const projectRoot = process.cwd();
const client = new Client({ connectionString: databaseUrl });

async function run() {
  await client.connect();
  console.log('Connected to database');

  for (const relativeFile of inputFiles) {
    const filePath = path.resolve(projectRoot, relativeFile);
    console.log(`Applying ${relativeFile} ...`);
    const sql = await fs.readFile(filePath, 'utf8');
    await client.query(sql);
    console.log(`Applied ${relativeFile}`);
  }

  await client.end();
  console.log('Done');
}

run().catch(async (error) => {
  console.error('SQL execution failed:', error.message);
  try {
    await client.end();
  } catch {
    // ignore close errors
  }
  process.exit(1);
});
