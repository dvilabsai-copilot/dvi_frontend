import { useCallback } from "react";
import type { HotspotAnchor, ItineraryDay } from "../itinerary-details.types";
import {
  findNextAttractionAfterIndex,
  getAttractionHotspotId,
  getAttractionRouteHotspotId,
  getFitHereSegmentLabel,
  getFitHereSegmentTime,
  isFitHereAttractionSegment,
  isFitHereStartSegment,
} from "../utils/fitHereTimeline.utils";
import { buildFitHereAnchorForTimelineRow } from "../utils/fitHereAnchorBuilder.utils";

/** Provides stable Fit Here timeline helpers and anchor construction to the page/dialogs. */
export const useFitHereTimelineHelpers = () => {
  const getFitHereSegmentLabelCallback = useCallback(getFitHereSegmentLabel, []);
  const getFitHereSegmentTimeCallback = useCallback(getFitHereSegmentTime, []);
  const isFitHereStartSegmentCallback = useCallback(isFitHereStartSegment, []);
  const isFitHereAttractionSegmentCallback = useCallback(isFitHereAttractionSegment, []);
  const getAttractionHotspotIdCallback = useCallback(getAttractionHotspotId, []);
  const getAttractionRouteHotspotIdCallback = useCallback(getAttractionRouteHotspotId, []);
  const findNextAttractionAfterIndexCallback = useCallback(findNextAttractionAfterIndex, []);
  const buildAnchorForTimelineRow = useCallback(
    (day: ItineraryDay, index: number): HotspotAnchor | null => buildFitHereAnchorForTimelineRow(day, index, {
      getSegmentLabel: getFitHereSegmentLabelCallback,
      getSegmentTime: getFitHereSegmentTimeCallback,
      isStartSegment: isFitHereStartSegmentCallback,
      isAttractionSegment: isFitHereAttractionSegmentCallback,
      findNextAttraction: findNextAttractionAfterIndexCallback,
      getAttractionHotspotId: getAttractionHotspotIdCallback,
      getAttractionRouteHotspotId: getAttractionRouteHotspotIdCallback,
    }), [
      findNextAttractionAfterIndexCallback,
      getAttractionHotspotIdCallback,
      getAttractionRouteHotspotIdCallback,
      getFitHereSegmentLabelCallback,
      getFitHereSegmentTimeCallback,
      isFitHereAttractionSegmentCallback,
      isFitHereStartSegmentCallback,
    ],
  );

  return {
    getFitHereSegmentLabel: getFitHereSegmentLabelCallback,
    getFitHereSegmentTime: getFitHereSegmentTimeCallback,
    buildFitHereAnchorForTimelineRow: buildAnchorForTimelineRow,
  };
};
