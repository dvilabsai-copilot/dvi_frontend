export type CleanupAction = () => Promise<void>;

export class CleanupRegistry {
  private readonly actions: CleanupAction[] = [];

  add(action: CleanupAction): void {
    this.actions.push(action);
  }

  async run(): Promise<void> {
    const failures: unknown[] = [];
    for (const action of [...this.actions].reverse()) {
      try {
        await action();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) throw new Error(`E2E cleanup failed for ${failures.length} action(s)`);
  }
}
