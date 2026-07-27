export interface ItineraryDetailsLocationState {
  partialSave?: {
    planId: number;
    quoteId: string;
    vehicleBuild?: {
      status?: string;
      message?: string;
      buildRunId?: string;
    };
  };
}

export function parseItineraryDetailsLocationState(value: unknown): ItineraryDetailsLocationState {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as { partialSave?: unknown };
  const partial = candidate.partialSave;
  if (!partial || typeof partial !== 'object') return {};

  const raw = partial as {
    planId?: unknown;
    quoteId?: unknown;
    vehicleBuild?: unknown;
  };
  const planId = Number(raw.planId);
  const quoteId = String(raw.quoteId || '').trim();
  if (!Number.isInteger(planId) || planId <= 0 || !quoteId) return {};

  const result: ItineraryDetailsLocationState = {
    partialSave: { planId, quoteId },
  };
  if (raw.vehicleBuild && typeof raw.vehicleBuild === 'object') {
    const build = raw.vehicleBuild as Record<string, unknown>;
    result.partialSave!.vehicleBuild = {
      ...(typeof build.status === 'string' ? { status: build.status } : {}),
      ...(typeof build.message === 'string' ? { message: build.message } : {}),
      ...(typeof build.buildRunId === 'string' ? { buildRunId: build.buildRunId } : {}),
    };
  }
  return result;
}
