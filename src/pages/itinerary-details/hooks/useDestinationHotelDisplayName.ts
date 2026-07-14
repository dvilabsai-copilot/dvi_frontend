/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";

type UseDestinationHotelDisplayNameOptions = {
  addHotspotRouteId: number | null | undefined;
  effectivePreviewTimeline: any[];
  hotelDetails: any;
  itinerary: any;
  matrixFit: any;
};

/** Resolves the destination hotel label used by hotspot preview and route-fit messaging. */
export const useDestinationHotelDisplayName = ({
  addHotspotRouteId,
  effectivePreviewTimeline,
  hotelDetails,
  itinerary,
  matrixFit,
}: UseDestinationHotelDisplayNameOptions): string => useMemo(() => {
    const sanitize = (raw: unknown): string => {
      const value = String(raw || '').trim();
      if (!value) return '';
      const lower = value.toLowerCase();
      if (lower === 'hotel' || lower === 'no hotels available' || lower === 'hotel / route start') {
        return '';
      }
      return value;
    };

    const routeId = Number(addHotspotRouteId || 0);
    const routeDay = itinerary?.days?.find((day) => Number(day?.id) === routeId);
    const routeCheckin = Array.isArray(routeDay?.segments)
      ? [...routeDay!.segments].reverse().find((segment) => String(segment?.type || '').toLowerCase() === 'checkin')
      : null;
    const routeCheckinName = sanitize((routeCheckin as any)?.hotelName);
    if (routeCheckinName) return routeCheckinName;

    const selectedRouteHotelName = sanitize(
      (hotelDetails?.hotels || [])
        .filter((hotel) => Number(hotel?.itineraryRouteId) === routeId)
        .filter((hotel) => Number(hotel?.itineraryPlanHotelDetailsId || 0) > 0)
        .sort((a, b) => Number(b?.itineraryPlanHotelDetailsId || 0) - Number(a?.itineraryPlanHotelDetailsId || 0))
        .map((hotel) => hotel?.hotelName)
        .find((name) => sanitize(name).length > 0)
    );
    if (selectedRouteHotelName) return selectedRouteHotelName;

    const fitName = sanitize((matrixFit as any)?.destinationHotelName);
    if (fitName) return fitName;

    const hotelDetailsName = sanitize(
      hotelDetails?.hotels?.find((hotel) => Number(hotel?.itineraryRouteId) === routeId)?.hotelName
    );
    if (hotelDetailsName) return hotelDetailsName;

    const previewRows = Array.isArray(effectivePreviewTimeline)
      ? [...(effectivePreviewTimeline as any[])].reverse()
      : [];
    for (const row of previewRows) {
      const type = String(row?.type || '').toLowerCase();
      if (type !== 'hotel' && type !== 'checkin' && Number(row?.item_type) !== 6) {
        continue;
      }

      const rowName = sanitize(row?.hotelName || row?.toName || row?.to);
      if (rowName) return rowName;

      const rowText = String(row?.text || '').trim();
      const match = rowText.match(/check-?in\s+(?:to|at)\s+(.+)/i);
      const parsed = sanitize(match?.[1] || '');
      if (parsed) return parsed;
    }

    return '';
  }, [addHotspotRouteId, effectivePreviewTimeline, hotelDetails?.hotels, itinerary?.days, matrixFit]);
