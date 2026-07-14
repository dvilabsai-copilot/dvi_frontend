import type { TriedAnchorState } from "../itinerary-details.types";

export const getFitHereTriedState = (resultType?: string): Omit<TriedAnchorState, "anchorKey"> => {
  const normalized = String(resultType || "").toUpperCase();
  if (normalized === "FITS_DIRECTLY") return { status: "DIRECT_FIT", label: "Tried: fits directly" };
  if (normalized === "FITS_WITH_OPTIONAL_REMOVAL") return { status: "REMOVES_OPTIONAL", label: "Tried: removes optional hotspot" };
  if (normalized === "REQUIRES_P3_CONFIRMATION") return { status: "P3_CONFIRMATION", label: "Tried: needs P3 confirmation" };
  if (normalized === "PRIORITY_CONFLICT") return { status: "PRIORITY_CONFLICT", label: "Tried: priority conflict" };
  return { status: "CANNOT_FIT", label: "Tried: does not fit" };
};
