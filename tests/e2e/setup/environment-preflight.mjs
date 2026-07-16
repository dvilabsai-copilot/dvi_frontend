import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..', '..', '..');
const REQUIRED = [
  'E2E_FRONTEND_BASE_URL',
  'E2E_API_BASE_URL',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_AGENT_EMAIL',
  'E2E_AGENT_PASSWORD',
  'E2E_DATABASE_NAME',
  'E2E_RUN_ID',
  'E2E_ALLOW_WRITES',
  'E2E_EXTERNAL_MOCK_MODE',
];

const PRODUCTION_HOSTS = new Set([
  'dvi.travel',
  'www.dvi.travel',
  'api.dvi.travel',
  'www.api.dvi.travel',
]);

function loadLocalEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function redact(value) {
  if (!value) return '<missing>';
  if (value.length < 6) return '<redacted>';
  return `${value.slice(0, 2)}…${value.slice(-2)}`;
}

function parseUrl(name) {
  const value = process.env[name]?.trim();
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
}

function assertSafeHost(name, url) {
  if (!url) return;
  const host = url.hostname.toLowerCase();
  if (PRODUCTION_HOSTS.has(host) || host.endsWith('.dvi.travel')) {
    throw new Error(`${name} resolves to a production host (${host}); E2E tests are blocked`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use http or https`);
  }
}

export function assertE2EEnvironment({ requireWrites = false } = {}) {
  loadLocalEnv(path.join(PROJECT_ROOT, '.env.e2e'));
  const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing required E2E environment variables: ${missing.join(', ')}`);
  }

  const frontend = parseUrl('E2E_FRONTEND_BASE_URL');
  const api = parseUrl('E2E_API_BASE_URL');
  assertSafeHost('E2E_FRONTEND_BASE_URL', frontend);
  assertSafeHost('E2E_API_BASE_URL', api);

  if (!/^PW_E2E_[A-Za-z0-9_-]+$/.test(process.env.E2E_RUN_ID)) {
    throw new Error('E2E_RUN_ID must match PW_E2E_<runId> and identify every generated record');
  }
  if (!/^(true|false)$/i.test(process.env.E2E_ALLOW_WRITES)) {
    throw new Error('E2E_ALLOW_WRITES must be exactly true or false');
  }
  if (requireWrites && process.env.E2E_ALLOW_WRITES.toLowerCase() !== 'true') {
    throw new Error('Mutation tests require E2E_ALLOW_WRITES=true');
  }
  if (!/e2e|test|local|dev/i.test(process.env.E2E_DATABASE_NAME)) {
    throw new Error('E2E_DATABASE_NAME must identify an E2E/test/local/dev database');
  }
  if (!/^(mock|sandbox|disabled)$/i.test(process.env.E2E_EXTERNAL_MOCK_MODE)) {
    throw new Error('E2E_EXTERNAL_MOCK_MODE must be mock, sandbox, or disabled');
  }

  return {
    frontendBaseUrl: frontend.href.replace(/\/$/, ''),
    apiBaseUrl: api.href.replace(/\/$/, ''),
    runId: process.env.E2E_RUN_ID,
    writesAllowed: process.env.E2E_ALLOW_WRITES.toLowerCase() === 'true',
    externalMockMode: process.env.E2E_EXTERNAL_MOCK_MODE,
    adminEmail: redact(process.env.E2E_ADMIN_EMAIL),
    agentEmail: redact(process.env.E2E_AGENT_EMAIL),
  };
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  try {
    const config = assertE2EEnvironment({ requireWrites: process.argv.includes('--writes') });
    console.log(`E2E preflight passed (frontend=${config.frontendBaseUrl}, api=${config.apiBaseUrl}, run=${config.runId})`);
  } catch (error) {
    console.error(`E2E preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}
