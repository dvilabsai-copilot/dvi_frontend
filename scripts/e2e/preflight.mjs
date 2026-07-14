import { assertE2EEnvironment } from '../../tests/e2e/setup/environment-preflight.mjs';

try {
  const result = assertE2EEnvironment({ requireWrites: process.argv.includes('--writes') });
  console.log(`E2E preflight passed (frontend=${result.frontendBaseUrl}, api=${result.apiBaseUrl}, run=${result.runId})`);
} catch (error) {
  console.error(`E2E preflight failed: ${error.message}`);
  process.exitCode = 1;
}
