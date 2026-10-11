// Backward-compatible entry point; schema changes belong in numbered SQL migrations.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
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
