export interface ItineraryDetailsLocationState {
  initialHotelDetails?: unknown;
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

/**
 * React Router keeps location.state in the browser history entry, including
 * after a hard reload. Initial hotel details are only a navigation-time
 * optimization; reusing them after reload skips the normal availability
 * hydration request.
 */
export function isBrowserReloadNavigation(): boolean {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return false;
  }
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type === "reload";
}

export function parseItineraryDetailsLocationState(value: unknown): ItineraryDetailsLocationState {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as { initialHotelDetails?: unknown; partialSave?: unknown };
  const initialHotelDetails = candidate.initialHotelDetails && typeof candidate.initialHotelDetails === 'object'
    ? candidate.initialHotelDetails
    : undefined;
  const partial = candidate.partialSave;
  if (!partial || typeof partial !== 'object') {
    return initialHotelDetails ? { initialHotelDetails } : {};
  }

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
    ...(initialHotelDetails ? { initialHotelDetails } : {}),
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
