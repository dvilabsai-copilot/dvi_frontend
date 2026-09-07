import type { AvailableHotspot } from "../itinerary-details.types";

export type HotspotCityContext =
  "SOURCE_CITY" |
  "VIA_ROUTE" |
  "DESTINATION_CITY" |
  "UNKNOWN";

export function deriveHotspotCityContext(
  hotspot: AvailableHotspot,
  context: {
    sourceCityKey?: string | null;
    destinationCityKey?: string | null;
    departure?: string | null;
    arrival?: string | null;
    locationName?: string | null;
  },
): HotspotCityContext {
  const backend = String(hotspot.cityContext || "").trim().toUpperCase();
  if (
  backend === "SOURCE_CITY" ||
  backend === "VIA_ROUTE" ||
  backend === "DESTINATION_CITY"
) {
  return backend as HotspotCityContext;
}

  const sourceKey = String(
    context.sourceCityKey || context.departure || context.locationName || "",
  ).trim().toLowerCase();
  const destinationKey = String(
    context.destinationCityKey || context.arrival || "",
  ).trim().toLowerCase();
  const haystack = `${String(hotspot.locationMap || "")} ${String(hotspot.name || "")}`.toLowerCase();

  if (destinationKey && haystack.includes(destinationKey)) return "DESTINATION_CITY";
  if (sourceKey && haystack.includes(sourceKey)) return "SOURCE_CITY";
  return "UNKNOWN";
}
