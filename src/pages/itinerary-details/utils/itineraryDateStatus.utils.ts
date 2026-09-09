import type { ItineraryDetailsResponse } from "../itinerary-details.types";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateOnly = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
};

export const getItineraryStartDate = (
  itinerary: Pick<ItineraryDetailsResponse, "days" | "dateRange"> | null | undefined,
): string => {
  const firstDayDate = normalizeDateOnly(itinerary?.days?.[0]?.date);
  if (DATE_ONLY_PATTERN.test(firstDayDate)) return firstDayDate;

  const dateRangeDates = String(itinerary?.dateRange || "").match(/\d{4}-\d{2}-\d{2}/g) || [];
  return dateRangeDates[0] || "";
};

export const getLocalDateOnly = (now = new Date()): string => (
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
);

export const isItineraryDateExpired = (
  itinerary: Pick<ItineraryDetailsResponse, "days" | "dateRange"> | null | undefined,
  now = new Date(),
): boolean => {
  const startDate = getItineraryStartDate(itinerary);
  return DATE_ONLY_PATTERN.test(startDate) && startDate < getLocalDateOnly(now);
};
