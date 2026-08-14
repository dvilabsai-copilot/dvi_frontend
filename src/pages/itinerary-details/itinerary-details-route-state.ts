export interface ItineraryDetailsLocationState {
  partialSave?: {
    planId: number;
    quoteId: string;
    vehicleBuild?: {
      status?: string;
      message?: string;
      buildRunId?: string;
    };
    hotelSearch?: {
      status?: string;
      message?: string;
      searchRunId?: string;
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
    hotelSearch?: unknown;
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
  if (raw.hotelSearch && typeof raw.hotelSearch === 'object') {
    const search = raw.hotelSearch as Record<string, unknown>;
    result.partialSave!.hotelSearch = {
      ...(typeof search.status === 'string' ? { status: search.status } : {}),
      ...(typeof search.message === 'string' ? { message: search.message } : {}),
      ...(typeof search.searchRunId === 'string' ? { searchRunId: search.searchRunId } : {}),
    };
  }
  return result;
}
