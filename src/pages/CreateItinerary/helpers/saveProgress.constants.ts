export const OPTIMIZE_ESTIMATED_MS_BY_DAYS: Record<number, number> = {
  3: 32298,
  4: 35396,
  5: 36519,
  6: 39035,
  7: 41803,
  8: 44000,
  9: 55117,
};

export const SAME_ROUTE_BASE_ESTIMATED_MS = 9000;

export const FINAL_ITINERARY_LOADING_MESSAGES: string[] = [
  "Analyzing destinations",
  "Optimizing travel routes",
  "Selecting experiences",
  "Calculating travel times",
  "Organizing daily plans",
  "Preparing final itinerary",
];

export const TRANSPORT_LOADING_MESSAGES: string[] = [
  "Calculating travel distance",
  "Checking vehicle suitability",
  "Optimizing route efficiency",
  "Evaluating luggage requirements",
  "Computing travel costs",
  "Preparing transportation options",
  "Finalizing recommendations",
];

export function getEstimatedSaveMs(
  dayCount: number,
  type: "itineary_basic_info" | "itineary_basic_info_with_optimized_route",
): number {
  if (type === "itineary_basic_info") {
    return SAME_ROUTE_BASE_ESTIMATED_MS;
  }

  return OPTIMIZE_ESTIMATED_MS_BY_DAYS[dayCount] ?? Math.max(18000, dayCount * 5600);
}
