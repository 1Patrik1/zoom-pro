import fs from 'node:fs';
import path from 'node:path';

const pairs = [
  ['apps/backend/.env.example', 'apps/backend/.env'],
  ['apps/frontend/.env.example', 'apps/frontend/.env']
];

for (const [source, target] of pairs) {
  const sourcePath = path.resolve(source);
  const targetPath = path.resolve(target);

  if (fs.existsSync(targetPath)) {
    console.log(`Skipping ${target} (already exists)`);
    continue;
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Created ${target}`);
}
