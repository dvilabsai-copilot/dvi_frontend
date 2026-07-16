import { spawn } from 'node:child_process';
import process from 'node:process';
import { assertE2EEnvironment } from '../../tests/e2e/setup/environment-preflight.mjs';

const [mode = 'smoke', ...args] = process.argv.slice(2);
process.env.E2E_TEST_MODE = mode;
if (mode === 'external') process.env.E2E_INCLUDE_EXTERNAL = 'true';
if (mode === 'legacy') process.env.E2E_INCLUDE_LEGACY = 'true';
if (mode === 'legacy-fixture') process.env.E2E_INCLUDE_LEGACY_FIXTURES = 'true';
if (mode === 'external' && !/^(mock|sandbox)$/i.test(process.env.E2E_EXTERNAL_MOCK_MODE ?? '')) throw new Error('External workflows require E2E_EXTERNAL_MOCK_MODE=mock or sandbox');
const isGroupedWorkflow = mode.startsWith('group-');
assertE2EEnvironment({ requireWrites: ['mutation', 'api', 'legacy-fixture'].includes(mode) || isGroupedWorkflow });

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const project = mode === 'smoke' ? 'smoke' : mode === 'readonly' ? 'admin-readonly' : mode === 'mutation' ? 'admin-mutation' : mode === 'api' ? 'api-contract' : mode === 'agent' ? 'agent' : mode === 'external' ? 'external-sandbox' : mode === 'legacy' ? 'legacy-environment' : mode === 'legacy-fixture' ? 'legacy-fixture' : isGroupedWorkflow ? mode : undefined;
const commandArgs = ['playwright', 'test', ...(project ? ['--project', project] : []), ...args];
const quoteCmdArg = (value) => /[\s"&|<>^]/.test(value) ? `"${value.replace(/["^]/g, (character) => `^${character}`)}"` : value;
const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : command;
const spawnArgs = process.platform === 'win32' ? ['/d', '/s', '/c', [command, ...commandArgs].map(quoteCmdArg).join(' ')] : commandArgs;
const child = spawn(spawnCommand, spawnArgs, { stdio: 'inherit', env: process.env, windowsHide: true });
child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : (code ?? 1); });
