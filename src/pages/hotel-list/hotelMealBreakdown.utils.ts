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
};

const numeric = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown): number => Number(numeric(value).toFixed(2));

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
      label: labels[meal],
      amount,
      ...(rate > 0 && quantity > 0 ? { rate, quantity } : {}),
    };
  }).filter((line) => line.amount > 0);
  const subtotal = money(lines.reduce((total, line) => total + line.amount, 0));
  return { planCode, lines, subtotal, included: lines.length === 0 };
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
  return { planCode, lines, subtotal, included: lines.length === 0 };
}
