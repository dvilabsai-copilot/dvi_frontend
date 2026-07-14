import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { AvailableHotspot, ItineraryDetailsResponse, ItinerarySegment } from "../itinerary-details.types";
import { normalizeConfirmedTimelineToSegments } from "../utils/timeline.utils";

interface FitHereConfirmationStateOptions {
  itinerary: ItineraryDetailsResponse | null;
  availableHotspots: AvailableHotspot[];
  setAddedInModalHotspotIds: Dispatch<SetStateAction<Set<number>>>;
  setExcludedHotspotIds: Dispatch<SetStateAction<number[]>>;
  setAvailableHotspots: Dispatch<SetStateAction<AvailableHotspot[]>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setRouteNeedsRebuild: Dispatch<SetStateAction<number | null>>;
}

interface ApplyFitHereConfirmationArgs {
  confirmedHotspotId: number;
  confirmedRouteId: number;
  insertedRouteHotspotId: number | null;
  removedHotspotIds: number[];
  persistedTimeline: unknown[];
}

/** Owns optimistic hotspot availability and timeline updates after Fit Here confirmation. */
export const useFitHereConfirmationState = ({
  itinerary,
  availableHotspots,
  setAddedInModalHotspotIds,
  setExcludedHotspotIds,
  setAvailableHotspots,
  setItinerary,
  setRouteNeedsRebuild,
}: FitHereConfirmationStateOptions) => useCallback(({
  confirmedHotspotId,
  confirmedRouteId,
  insertedRouteHotspotId,
  removedHotspotIds,
  persistedTimeline,
}: ApplyFitHereConfirmationArgs): ItinerarySegment[] => {
  if (confirmedHotspotId > 0) {
    setAddedInModalHotspotIds((previous) => {
      const next = new Set(previous);
      next.add(confirmedHotspotId);
      for (const removedId of removedHotspotIds) next.delete(removedId);
      return next;
    });
  }

  setExcludedHotspotIds((previous) => {
    const next = new Set(previous.map(Number).filter((id) => id > 0));
    for (const removedId of removedHotspotIds) next.add(removedId);
    if (confirmedHotspotId > 0) next.delete(confirmedHotspotId);
    return Array.from(next);
  });

  setAvailableHotspots((previous) => previous.map((row) => {
    const rowId = Number(row?.id || 0);
    if (confirmedHotspotId > 0 && rowId === confirmedHotspotId) {
      return { ...row, alreadyAdded: true, visitAgain: true, availabilityStatus: "ACTIVE_THIS_ROUTE", availabilityReason: "Hotspot is already active on this route.", actionDisabled: true, buttonLabel: "Added", routeHotspotId: insertedRouteHotspotId ?? row.routeHotspotId ?? null, planOwnWay: true, isManual: true };
    }
    if (removedHotspotIds.includes(rowId)) {
      return { ...row, alreadyAdded: false, visitAgain: false, availabilityStatus: "EXCLUDED_BY_ROUTE", availabilityReason: "Hotspot is currently excluded for this route.", actionDisabled: false, buttonLabel: "Preview", routeHotspotId: null, planOwnWay: false, isManual: false };
    }
    return row;
  }));

  const existingConfirmedRoute = itinerary?.days?.find((day) => Number(day.id) === Number(confirmedRouteId));
  const confirmedSegments = normalizeConfirmedTimelineToSegments(persistedTimeline, {
    existingSegments: existingConfirmedRoute?.segments || [],
    availableHotspots,
  });
  if (confirmedRouteId > 0 && persistedTimeline.length > 0) {
    setItinerary((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        days: previous.days.map((day) => Number(day.id) !== confirmedRouteId ? day : { ...day, segments: confirmedSegments.length > 0 ? confirmedSegments : day.segments }),
      };
    });
    setRouteNeedsRebuild(confirmedRouteId);
  }
  return confirmedSegments;
}, [availableHotspots, itinerary, setAddedInModalHotspotIds, setAvailableHotspots, setExcludedHotspotIds, setItinerary, setRouteNeedsRebuild]);
