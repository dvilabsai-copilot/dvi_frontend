import type { CostBreakdown } from '../itinerary-details.types';

const money = (value: number) => `₹ ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** These API supplements are already included in the hotel payable amount. */
export function HotelMealSupplementSummary({ cost }: { cost?: CostBreakdown | null }) {
  const breakfast = Number(cost?.tboMapFallbackBreakfastCost || 0);
  const breakfastRate = Number(cost?.tboMapFallbackBreakfastRate || 0);
  const lunch = Number(cost?.tboMapFallbackLunchCost || 0);
  // The legacy DinnerCost field contains the complete meal supplement.
  const dinner = Number(cost?.tboMapFallbackDinnerComponentCost || 0) || Math.max(Number(cost?.tboMapFallbackDinnerCost || 0) - breakfast - lunch, 0);
  const plan = String(cost?.tboMapFallbackTargetMealPlan || 'MAP').toUpperCase();
  const rows = [
    { label: `${plan} Breakfast Supplement`, amount: breakfast, rate: breakfastRate },
    { label: `${plan} Lunch Supplement`, amount: lunch, rate: 0 },
    { label: `${plan} Dinner Supplement`, amount: dinner, rate: 0 },
  ].filter(row => row.amount > 0);
  return <>{rows.map(row => <div key={row.label} className="text-sm text-[#6c6c6c]">
    <div className="flex justify-between gap-4"><span>{row.label} (included in Total Hotel Amount)</span><span className="shrink-0 text-right">{money(row.amount)}</span></div>
    {row.rate > 0 && <div className="text-xs">{money(row.rate)} × {Number((row.amount / row.rate).toFixed(2))} guest-nights</div>}
  </div>)}</>;
}
