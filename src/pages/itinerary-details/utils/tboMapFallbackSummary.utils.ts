type SelectedHotelView = {
  provider?: unknown;
  tboMapFallbackApplied?: unknown;
  tboMapFallbackTargetMealPlan?: unknown;
  tboMapFallbackLunchRate?: unknown;
  tboMapFallbackLunchTotal?: unknown;
  mealPlan?: unknown;
  mealPlanCode?: unknown;
  tboMapFallbackDinnerRate?: unknown;
  tboMapFallbackDinnerPerPerson?: unknown;
  tboMapFallbackDinnerTotal?: unknown;
  tboMapFallbackDinnerPerNight?: unknown;
  tboMapFallbackDinnerComponentTotal?: unknown;
  selectedPriceSnapshot?: unknown;
};

type HotelSelectionGroupView = {
  groupType?: unknown;
  routes?: Array<{ selected?: SelectedHotelView | null }>;
};

export type TboMapFallbackSummary = {
  hasGroup: boolean;
  targetMealPlan: string;
  dinnerRate: number;
  dinnerCost: number;
  dinnerComponentCost: number;
  lunchRate: number;
  lunchCost: number;
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
    return { hasGroup: false, targetMealPlan: '', dinnerRate: 0, dinnerCost: 0, dinnerComponentCost: 0, lunchRate: 0, lunchCost: 0 };
  }

  const group = groups.find((candidate) => Number(candidate?.groupType) === Number(activeGroupType));
  if (!group) return { hasGroup: false, targetMealPlan: '', dinnerRate: 0, dinnerCost: 0, dinnerComponentCost: 0, lunchRate: 0, lunchCost: 0 };

  const rates = new Set<number>();
  const lunchRates = new Set<number>();
  let dinnerCost = 0;
  let dinnerComponentCost = 0;
  let lunchCost = 0;
  const targetMealPlans = new Set<string>();

  for (const route of group.routes || []) {
    const selected = route?.selected || {};
    const snapshot = parseSnapshot(selected.selectedPriceSnapshot);
    const provider = String(selected.provider ?? snapshot.provider ?? "").trim().toLowerCase();
    const applied = selected.tboMapFallbackApplied === true || snapshot.tboMapFallbackApplied === true;
    if (provider !== "tbo" || !applied) continue;
    const targetMealPlan = String(
      selected.tboMapFallbackTargetMealPlan ??
        snapshot.tboMapFallbackTargetMealPlan ??
        selected.mealPlanCode ??
        selected.mealPlan ??
        snapshot.mealPlanCode ??
        snapshot.mealPlan ??
        "MAP",
    ).trim().toUpperCase();
    if (targetMealPlan) targetMealPlans.add(targetMealPlan);

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
    const routeDinnerComponentCost = toPositiveNumber(
      selected.tboMapFallbackDinnerComponentTotal ?? snapshot.tboMapFallbackDinnerComponentTotal,
    );
    dinnerComponentCost += routeDinnerComponentCost;
    const lunchRate = toPositiveNumber(
      selected.tboMapFallbackLunchRate ?? snapshot.tboMapFallbackLunchRate,
    );
    const routeLunchCost = toPositiveNumber(
      selected.tboMapFallbackLunchTotal ?? snapshot.tboMapFallbackLunchTotal,
    );
    if (lunchRate > 0) lunchRates.add(lunchRate);
    lunchCost += routeLunchCost;
  }

  return {
    hasGroup: true,
    targetMealPlan: targetMealPlans.size === 1 ? [...targetMealPlans][0] : '',
    dinnerRate: rates.size === 1 ? [...rates][0] : 0,
    dinnerCost: Number(dinnerCost.toFixed(2)),
    dinnerComponentCost: Number(dinnerComponentCost.toFixed(2)),
    lunchRate: lunchRates.size === 1 ? [...lunchRates][0] : 0,
    lunchCost: Number(lunchCost.toFixed(2)),
  };
};
