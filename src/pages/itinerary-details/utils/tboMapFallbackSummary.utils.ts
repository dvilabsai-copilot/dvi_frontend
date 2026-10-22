type SelectedHotelView = {
  provider?: unknown;
  tboMapFallbackApplied?: unknown;
  tboMapFallbackDinnerRate?: unknown;
  tboMapFallbackDinnerPerPerson?: unknown;
  tboMapFallbackDinnerTotal?: unknown;
  tboMapFallbackDinnerPerNight?: unknown;
  selectedPriceSnapshot?: unknown;
};

type HotelSelectionGroupView = {
  groupType?: unknown;
  routes?: Array<{ selected?: SelectedHotelView | null }>;
};

export type TboMapFallbackSummary = {
  hasGroup: boolean;
  dinnerRate: number;
  dinnerCost: number;
};

const toPositiveNumber = (value: unknown): number => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const parseSnapshot = (value: unknown): SelectedHotelView => {
  if (value && typeof value === "object") return value as SelectedHotelView;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as SelectedHotelView : {};
  } catch {
    return {};
  }
};

/** Reads the active recommendation's TBO MAP supplement for display only. */
export const getTboMapFallbackSummary = (
  groups: HotelSelectionGroupView[] | null | undefined,
  activeGroupType: number | null,
): TboMapFallbackSummary => {
  if (activeGroupType == null || !Array.isArray(groups)) {
    return { hasGroup: false, dinnerRate: 0, dinnerCost: 0 };
  }

  const group = groups.find((candidate) => Number(candidate?.groupType) === Number(activeGroupType));
  if (!group) return { hasGroup: false, dinnerRate: 0, dinnerCost: 0 };

  const rates = new Set<number>();
  let dinnerCost = 0;

  for (const route of group.routes || []) {
    const selected = route?.selected || {};
    const snapshot = parseSnapshot(selected.selectedPriceSnapshot);
    const provider = String(selected.provider ?? snapshot.provider ?? "").trim().toLowerCase();
    const applied = selected.tboMapFallbackApplied === true || snapshot.tboMapFallbackApplied === true;
    if (provider !== "tbo" || !applied) continue;

    const dinnerRate = toPositiveNumber(
      selected.tboMapFallbackDinnerRate ??
        selected.tboMapFallbackDinnerPerPerson ??
        snapshot.tboMapFallbackDinnerRate ??
        snapshot.tboMapFallbackDinnerPerPerson,
    );
    const routeDinnerCost = toPositiveNumber(
      selected.tboMapFallbackDinnerTotal ??
        selected.tboMapFallbackDinnerPerNight ??
        snapshot.tboMapFallbackDinnerTotal ??
        snapshot.tboMapFallbackDinnerPerNight,
    );

    if (dinnerRate > 0) rates.add(dinnerRate);
    dinnerCost += routeDinnerCost;
  }

  return {
    hasGroup: true,
    dinnerRate: rates.size === 1 ? [...rates][0] : 0,
    dinnerCost: Number(dinnerCost.toFixed(2)),
  };
};
