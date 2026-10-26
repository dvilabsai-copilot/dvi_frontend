export type HotelMealLine = {
  key: string;
  label: string;
  amount: number;
  rate?: number;
  quantity?: number;
};

export type HotelMealSummary = {
  planCode: string;
  lines: HotelMealLine[];
  subtotal: number;
  included: boolean;
  scope: 'night' | 'stay';
};

type MealBreakdownRecord = Record<string, unknown>;

const asRecord = (value: unknown): MealBreakdownRecord | null =>
  value && typeof value === 'object' ? value as MealBreakdownRecord : null;

const normalizedDate = (value: unknown): string => String(value ?? '').trim().slice(0, 10);

const recordDate = (value: unknown): string => {
  const record = asRecord(value);
  return normalizedDate(
    record?.date ??
    record?.routeDate ??
    record?.route_date ??
    record?.checkInDate ??
    record?.check_in_date ??
    record?.itineraryRouteDate ??
    record?.itinerary_route_date,
  );
};

/**
 * The API stores both the complete-stay meal aggregate and one meal entry per
 * route night. Tooltips are rendered for one route row, so select the matching
 * nightly entry without changing the aggregate used by itinerary totals.
 */
export function selectOfflineMealBreakdown(input: {
  aggregate: MealBreakdownRecord | null;
  nightlyBreakdown: unknown;
  nightlyRates: unknown;
  routeDate?: unknown;
}): { breakdown: MealBreakdownRecord | null; scope: 'night' | 'stay' } {
  const entries = Array.isArray(input.nightlyBreakdown)
    ? input.nightlyBreakdown.map(asRecord).filter((entry): entry is MealBreakdownRecord => Boolean(entry))
    : [];
  if (entries.length === 0) return { breakdown: input.aggregate, scope: 'stay' };

  const targetDate = normalizedDate(input.routeDate);
  let index = targetDate
    ? entries.findIndex((entry) => recordDate(entry) === targetDate)
    : -1;

  // Current snapshots keep dates in nightlyRates and align both arrays by
  // index. Prefer an explicit entry date when available, then use that stable
  // persisted alignment for snapshots that predate date fields on meal rows.
  if (index < 0 && targetDate && Array.isArray(input.nightlyRates)) {
    index = input.nightlyRates.findIndex((rate) => recordDate(rate) === targetDate);
  }
  if (index >= 0 && entries[index]) return { breakdown: entries[index], scope: 'night' };

  // A single entry is unambiguous even when an older snapshot omitted dates.
  if (entries.length === 1) return { breakdown: entries[0], scope: 'night' };
  return { breakdown: input.aggregate, scope: 'stay' };
}

const numeric = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown): number => Number(numeric(value).toFixed(2));

/**
 * Replace only the stay-level meal portion of an API subtotal when a row is
 * rendered for one night. The guard prevents changing a subtotal that is
 * already route-night scoped (and preserves the API's other supplements).
 */
export function getNightlyHotelSubtotal(input: {
  aggregateSubtotal: unknown;
  roomCost: unknown;
  aggregateMealSubtotal: unknown;
  nightlyMealSubtotal: unknown;
}): number | null {
  const aggregateSubtotal = numeric(input.aggregateSubtotal);
  const roomCost = numeric(input.roomCost);
  const aggregateMealSubtotal = numeric(input.aggregateMealSubtotal);
  const nightlyMealSubtotal = numeric(input.nightlyMealSubtotal);
  if (
    aggregateSubtotal <= 0 ||
    roomCost <= 0 ||
    aggregateMealSubtotal <= nightlyMealSubtotal
  ) return null;

  const nonMealSubtotal = aggregateSubtotal - aggregateMealSubtotal;
  // If removing the aggregate meal amount would also remove room/supplement
  // costs, this is not a full-stay subtotal and must remain API-authoritative.
  if (nonMealSubtotal + 0.01 < roomCost) return null;
  return money(nonMealSubtotal + nightlyMealSubtotal);
}

const chargeable = (value: unknown): number => {
  const amount = numeric(value);
  return amount >= 1 ? money(amount) : 0;
};

const mealPlanMeals = (planCode: string): Array<'breakfast' | 'lunch' | 'dinner'> => {
  if (planCode === 'MAP') return ['breakfast', 'dinner'];
  if (planCode === 'CP') return ['breakfast'];
  if (planCode === 'AP') return ['breakfast', 'lunch', 'dinner'];
  return ['breakfast', 'lunch', 'dinner'];
};

const labels: Record<string, string> = {
  breakfast: 'Breakfast Cost',
  lunch: 'Lunch Cost',
  dinner: 'Dinner Cost',
};

const capitalize = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`;

export function buildOfflineMealSummary(
  mealPlanCode: unknown,
  breakdown: Record<string, unknown> | null,
  scope: 'night' | 'stay' = 'stay',
): HotelMealSummary | null {
  if (!breakdown) return null;
  const planCode = String(mealPlanCode || breakdown.mealPlanCode || '').trim().toUpperCase();
  if (!planCode) return null;
  const quantity = numeric(breakdown.foodRequiredCount) * numeric(breakdown.roomQuantity);
  const lines = mealPlanMeals(planCode).map((meal) => {
    const suffix = capitalize(meal);
    const rawRate = breakdown[`${meal}CostPerPerson`];
    const hasRate = rawRate !== undefined && rawRate !== null && rawRate !== '';
    const rateValue = numeric(rawRate);
    const amount = chargeable(hasRate && rateValue < 1 ? 0 : breakdown[`total${suffix}Cost`]);
    const rate = chargeable(rateValue);
    return {
      key: meal,
      label: scope === 'night' ? `${labels[meal]} / Night` : labels[meal],
      amount,
      ...(rate > 0 && quantity > 0 ? { rate, quantity } : {}),
    };
  }).filter((line) => line.amount > 0);
  const subtotal = money(lines.reduce((total, line) => total + line.amount, 0));
  return { planCode, lines, subtotal, included: lines.length === 0, scope };
}

export function buildTboFallbackMealSummary(input: {
  planCode: unknown;
  lunchRate?: unknown;
  lunchCostPerNight?: unknown;
  dinnerRate?: unknown;
  dinnerCostPerNight?: unknown;
}): HotelMealSummary | null {
  const planCode = String(input.planCode || '').trim().toUpperCase();
  if (!['MAP', 'AP'].includes(planCode)) return null;
  const entries = planCode === 'AP'
    ? [
        ['lunch', input.lunchRate, input.lunchCostPerNight],
        ['dinner', input.dinnerRate, input.dinnerCostPerNight],
      ]
    : [['dinner', input.dinnerRate, input.dinnerCostPerNight]];
  const lines = entries.map(([meal, rateValue, amountValue]) => {
    const rate = chargeable(rateValue);
    const amount = chargeable(amountValue);
    const quantity = rate > 0 && amount > 0 ? money(amount / rate) : 0;
    return {
      key: String(meal),
      label: labels[String(meal)],
      amount,
      ...(rate > 0 && quantity > 0 ? { rate, quantity } : {}),
    };
  }).filter((line) => line.amount > 0);
  const subtotal = money(lines.reduce((total, line) => total + line.amount, 0));
  return { planCode, lines, subtotal, included: lines.length === 0, scope: 'stay' };
}
