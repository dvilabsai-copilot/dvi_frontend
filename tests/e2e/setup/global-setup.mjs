import { assertE2EEnvironment } from './environment-preflight.mjs';

export default async function globalSetup() {
  const mutationProject = process.argv.some((argument) => argument.includes('admin-mutation') || argument.includes('api-contract') || argument.includes('legacy-fixture') || argument.includes('group-')) || ['mutation', 'api', 'legacy-fixture'].includes(process.env.E2E_TEST_MODE) || process.env.E2E_TEST_MODE?.startsWith('group-');
  assertE2EEnvironment({ requireWrites: mutationProject });
}
