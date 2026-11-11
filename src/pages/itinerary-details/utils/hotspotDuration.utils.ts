import type { AvailableHotspot } from "../itinerary-details.types";

export const FULL_DAY_VISIT_MINUTES = 8 * 60;

export const getHotspotDurationMinutes = (hotspot: Partial<AvailableHotspot> | null | undefined): number => {
  const exactMinutes = Number(hotspot?.durationMinutes);
  if (Number.isFinite(exactMinutes) && exactMinutes > 0) return Math.round(exactMinutes);

  const legacyHours = Number(hotspot?.timeSpend);
  return Number.isFinite(legacyHours) && legacyHours > 0 ? Math.round(legacyHours * 60) : 0;
};

export const formatHotspotDuration = (durationMinutes: number): string => {
  const minutes = Math.max(0, Math.round(Number(durationMinutes) || 0));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts = [
    hours > 0 ? `${hours} hr${hours === 1 ? "" : "s"}` : "",
    remainingMinutes > 0 ? `${remainingMinutes} min` : "",
  ].filter(Boolean);
  return parts.join(" ") || "Duration unavailable";
};

export const isFullDayHotspot = (durationMinutes: number): boolean =>
  Number(durationMinutes) >= FULL_DAY_VISIT_MINUTES;
