import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const envPath = path.resolve('.env.e2e');
const env = { ...process.env };
for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim();
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const result = spawnSync(process.execPath, ['--experimental-strip-types', 'tests/e2e/seed-booking-test-data.ts'], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  windowsHide: true,
});

process.exit(result.status ?? 1);
