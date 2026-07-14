export function e2eRecordName(domain: string, sequence: number): string {
  const runId = process.env.E2E_RUN_ID?.trim();
  if (!runId) throw new Error('E2E_RUN_ID is required for generated records');
  return `${runId}_${domain}_${sequence}`;
}
