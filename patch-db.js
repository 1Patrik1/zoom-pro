// Backward-compatible entry point for old notes/scripts.
// Schema updates are now applied only through numbered SQL migrations.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
console.warn('patch-db.js now delegates to the canonical SQL migration runner.');
const result = spawnSync(process.execPath, ['scripts/db-migrate-all.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(`Could not start the SQL migrator: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
