import type { HotspotAnchor } from "../itinerary-details.types";

export function buildFitHereAnchorKey(anchor: HotspotAnchor): string {
  const normalize = (value: unknown, fallback: string) => String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return [
    anchor.anchorType,
    anchor.anchorIntent,
    Number(anchor.anchorIndex ?? -1),
    normalize(anchor.anchorFrom, "UNKNOWN_FROM"),
    normalize(anchor.anchorTo, "UNKNOWN_TO"),
  ].join(":");
}

export function serializeFitHereAnchor(anchor: HotspotAnchor) {
  return {
    anchorType: anchor.anchorType || "BETWEEN_ROWS",
    anchorIntent: anchor.anchorIntent,
    anchorIndex: anchor.anchorIndex,
    anchorFrom: anchor.anchorFrom,
    anchorTo: anchor.anchorTo,
    anchorLabel: anchor.anchorLabel,
    anchorTimeRange: anchor.anchorTimeRange,
    afterRowType: anchor.afterRowType,
    beforeRowType: anchor.beforeRowType,
    afterHotspotId: anchor.afterHotspotId,
    afterRouteHotspotId: anchor.afterRouteHotspotId,
    beforeHotspotId: anchor.beforeHotspotId,
    beforeRouteHotspotId: anchor.beforeRouteHotspotId,
  };
}
