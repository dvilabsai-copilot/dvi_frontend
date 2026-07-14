import { useCallback } from "react";
import type { HotspotAnchor, ItineraryDay } from "../itinerary-details.types";
import { buildFitHereAnchorKey } from "../utils/fitHereAnchor.utils";

type UseAutoFitHereAnchorsOptions = {
  buildFitHereAnchorForTimelineRow: (day: ItineraryDay, index: number) => HotspotAnchor | null;
};

/** Builds the unique start/attraction anchors used by automatic Fit Here preview. */
export const useAutoFitHereAnchors = ({
  buildFitHereAnchorForTimelineRow,
}: UseAutoFitHereAnchorsOptions) => useCallback((day: ItineraryDay): HotspotAnchor[] => {
  const anchors: HotspotAnchor[] = [];

  for (let index = 0; index < day.segments.length; index += 1) {
    const anchor = buildFitHereAnchorForTimelineRow(day, index);
    if (!anchor) continue;
    if (anchor.anchorIntent !== "AFTER_START" && anchor.anchorIntent !== "AFTER_ATTRACTION") continue;
    anchors.push(anchor);
  }

  const seen = new Set<string>();
  return anchors.filter((anchor) => {
    const key = buildFitHereAnchorKey(anchor);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}, [buildFitHereAnchorForTimelineRow]);
