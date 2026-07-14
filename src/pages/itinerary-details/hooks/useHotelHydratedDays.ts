import { useMemo } from "react";
import type { CheckinSegment, ItineraryDay, ItinerarySegment, TravelSegment } from "../itinerary-details.types";
import {
  estimateHotelTravelMinutesFromDistance,
  formatMinutesDuration,
  formatMinutesToDisplay,
  isEarlyMorningTime,
  normalizeTimelineLabel,
  parseDisplayMinutes,
  parseDisplayTimeToHms,
} from "../utils/timeline.utils";

type SelectedHotelRouteMeta = {
  hotelName?: string | null;
  hotelDistance?: string | null;
};

type UseHotelHydratedDaysOptions = {
  itineraryDays?: ItineraryDay[] | null;
  selectedHotelMetaByRoute: Map<number, SelectedHotelRouteMeta>;
};

/** Applies selected-hotel names and travel/check-in timing to displayable itinerary days. */
export const useHotelHydratedDays = ({
  itineraryDays,
  selectedHotelMetaByRoute,
}: UseHotelHydratedDaysOptions): ItineraryDay[] => {
  return useMemo(() => {
    if (!itineraryDays?.length) return [];

    return itineraryDays.map((day, dayIndex) => {
      // ALWAYS ensure we have a segments array to process
      let segments = Array.isArray(day.segments) ? [...day.segments] : [];
      
      // If no segments,  just return the day with empty segments
      // (don't try to process hotel logic if there's nothing to process)
      if (!segments || segments.length === 0) {
        return {
          ...day,
          segments: [],
        };
      }
      
      const currentHotelName = selectedHotelMetaByRoute.get(day.id)?.hotelName?.trim() || null;
      const currentHotelDistance = selectedHotelMetaByRoute.get(day.id)?.hotelDistance?.trim() || null;
      const previousDay = dayIndex > 0 ? itineraryDays[dayIndex - 1] : null;
      const previousHotelName = previousDay
        ? selectedHotelMetaByRoute.get(previousDay.id)?.hotelName?.trim() || null
        : null;

      let firstTravelSeen = false;
      let derivedHotelArrivalMinutes: number | null = null;
      const getSegmentAnchorLabel = (segment: ItinerarySegment | undefined, fallbackHotelName?: string | null): string => {
        if (!segment) return day.arrival || day.departure || fallbackHotelName || 'Hotel';
        if (segment.type === 'attraction') return segment.name;
        if (segment.type === 'travel') return segment.to || segment.from || day.arrival || fallbackHotelName || 'Hotel';
        if (segment.type === 'break') return segment.location || day.arrival || fallbackHotelName || 'Hotel';
        if (segment.type === 'checkin') return segment.hotelName || fallbackHotelName || 'Hotel';
        if (segment.type === 'start') return day.arrival || day.departure || fallbackHotelName || 'Hotel';
        if (segment.type === 'return') return day.arrival || day.departure || fallbackHotelName || 'Hotel';
        return day.arrival || day.departure || fallbackHotelName || 'Hotel';
      };

      const getSegmentEndMinutes = (segment: ItinerarySegment | undefined): number | null => {
        if (!segment) return null;
        if (segment.type === 'attraction') return parseDisplayMinutes(segment.visitTime, 'end');
        if (segment.type === 'travel') return parseDisplayMinutes(segment.timeRange, 'end');
        if (segment.type === 'break') return parseDisplayMinutes(segment.timeRange, 'end');
        if (segment.type === 'checkin') return parseDisplayMinutes(segment.time);
        if (segment.type === 'start') return parseDisplayMinutes(segment.timeRange, 'end');
        if (segment.type === 'return') return parseDisplayMinutes(segment.time);
        return null;
      };

      const ensureTravelBeforeCheckin = (
        checkinIndex: number,
        fallbackHotelName?: string | null,
      ) => {
        if (checkinIndex <= 0) return;

        const checkin = segments[checkinIndex];
        if (!checkin || checkin.type !== 'checkin') return;

        const targetHotelName = String(
          fallbackHotelName ||
          checkin.hotelName ||
          currentHotelName ||
          'Hotel',
        ).trim() || 'Hotel';

        let previousRenderableIndex = -1;
        for (let index = checkinIndex - 1; index >= 0; index -= 1) {
          if (segments[index]?.type === 'hotspot') continue;
          previousRenderableIndex = index;
          break;
        }

        if (previousRenderableIndex < 0) {
          segments[checkinIndex] = {
            ...checkin,
            hotelName: targetHotelName,
          };
          return;
        }

        const previousSegment = segments[previousRenderableIndex];
        const previousLabel = getSegmentAnchorLabel(previousSegment, targetHotelName);

        const alreadyArrivesAtHotel =
          previousSegment.type === 'checkin' ||
          (
            previousSegment.type === 'travel' &&
            normalizeTimelineLabel(previousSegment.to || '') === normalizeTimelineLabel(targetHotelName)
          ) ||
          normalizeTimelineLabel(previousLabel) === 'hotel' ||
          normalizeTimelineLabel(previousLabel) === normalizeTimelineLabel(targetHotelName);

        if (alreadyArrivesAtHotel) {
          segments[checkinIndex] = {
            ...checkin,
            hotelName: targetHotelName,
          };
          return;
        }

        const previousEndMinutes = getSegmentEndMinutes(previousSegment);
        const checkinMinutes = parseDisplayMinutes(checkin.time);
        const scheduleGapMinutes =
          previousEndMinutes !== null && checkinMinutes !== null
            ? Math.max(0, checkinMinutes - previousEndMinutes)
            : 0;
        const estimatedTravelMinutes = estimateHotelTravelMinutesFromDistance(currentHotelDistance);
        const effectiveTravelMinutes =
          estimatedTravelMinutes != null
            ? Math.max(scheduleGapMinutes, estimatedTravelMinutes)
            : Math.max(scheduleGapMinutes, 10);

        if (previousEndMinutes === null) {
          segments[checkinIndex] = {
            ...checkin,
            hotelName: targetHotelName,
          };
          return;
        }

        const travelEndMinutes = previousEndMinutes + effectiveTravelMinutes;
        const adjustedCheckinMinutes =
          checkinMinutes !== null
            ? Math.max(checkinMinutes, travelEndMinutes)
            : travelEndMinutes;

        const travelSegment: TravelSegment = {
          type: 'travel',
          from: previousLabel,
          to: targetHotelName,
          timeRange: `${formatMinutesToDisplay(previousEndMinutes)} - ${formatMinutesToDisplay(travelEndMinutes)}`,
          distance: currentHotelDistance || '',
          duration: formatMinutesDuration(effectiveTravelMinutes),
          note: 'This may vary due to traffic conditions',
        };

        segments.splice(checkinIndex, 0, travelSegment);
        segments[checkinIndex + 1] = {
          ...checkin,
          hotelName: targetHotelName,
          hotelAddress: checkin.hotelAddress || '',
          time: formatMinutesToDisplay(adjustedCheckinMinutes),
        };
      };

      segments = segments.map((segment) => {
        if (segment.type === 'travel') {
          const isFirstTravelOfDay = !firstTravelSeen;
          firstTravelSeen = true;

          let from = segment.from;
          let to = segment.to;

          if (currentHotelName && /\bhotel\b/i.test(String(segment.to || '').trim())) {
            to = currentHotelName;
          }

          if (isFirstTravelOfDay && previousHotelName) {
            const normalizedFrom = normalizeTimelineLabel(segment.from);
            const normalizedDeparture = normalizeTimelineLabel(day.departure);
            const normalizedArrival = normalizeTimelineLabel(day.arrival);

            if (
              /\bhotel\b/i.test(String(segment.from || '').trim()) ||
              normalizedFrom === normalizedDeparture ||
              normalizedFrom === normalizedArrival
            ) {
              from = previousHotelName;
            }
          } else if (currentHotelName && /\bhotel\b/i.test(String(segment.from || '').trim())) {
            from = currentHotelName;
          }

          const isTravelToCurrentHotel =
            !!currentHotelName &&
            normalizeTimelineLabel(to) === normalizeTimelineLabel(currentHotelName);

          if (isTravelToCurrentHotel) {
            const estimatedTravelMinutes = estimateHotelTravelMinutesFromDistance(currentHotelDistance);
            const travelStartMinutes = parseDisplayMinutes(segment.timeRange, 'start');
            const travelEndMinutes = parseDisplayMinutes(segment.timeRange, 'end');

            if (
              estimatedTravelMinutes != null &&
              travelStartMinutes !== null &&
              travelEndMinutes !== null
            ) {
              const scheduledTravelMinutes = Math.max(0, travelEndMinutes - travelStartMinutes);
              const effectiveTravelMinutes = Math.max(scheduledTravelMinutes, estimatedTravelMinutes);
              const adjustedTravelEndMinutes = travelStartMinutes + effectiveTravelMinutes;
              derivedHotelArrivalMinutes = adjustedTravelEndMinutes;

              return {
                ...segment,
                from,
                to,
                timeRange: `${formatMinutesToDisplay(travelStartMinutes)} - ${formatMinutesToDisplay(adjustedTravelEndMinutes)}`,
                duration: formatMinutesDuration(effectiveTravelMinutes),
                distance: currentHotelDistance || segment.distance,
              };
            }
          }

          return {
            ...segment,
            from,
            to,
          };
        }

        if (segment.type === 'checkin' && currentHotelName) {
          const existingCheckinMinutes = parseDisplayMinutes(segment.time);
          const adjustedCheckinMinutes =
            derivedHotelArrivalMinutes != null && existingCheckinMinutes != null
              ? Math.max(existingCheckinMinutes, derivedHotelArrivalMinutes)
              : (derivedHotelArrivalMinutes ?? existingCheckinMinutes);

          return {
            ...segment,
            hotelName: currentHotelName,
            time: adjustedCheckinMinutes !== null ? formatMinutesToDisplay(adjustedCheckinMinutes) : segment.time,
          };
        }

        return segment;
      });

      const lastCheckinIndex = (() => {
        for (let index = segments.length - 1; index >= 0; index -= 1) {
          if (segments[index]?.type === 'checkin') return index;
        }
        return -1;
      })();

      if (lastCheckinIndex >= 0) {
        ensureTravelBeforeCheckin(lastCheckinIndex, currentHotelName);
      }

      const earlyCheckinIndex = segments.findIndex((segment) => {
        if (segment.type !== 'checkin') return false;
        const timeMinutes = parseDisplayMinutes(segment.time);
        if (timeMinutes === null) return false;
        return isEarlyMorningTime(parseDisplayTimeToHms(segment.time || ''));
      });

      const hasEarlyMorningArrival = dayIndex === 0 && earlyCheckinIndex >= 0;

      const hasLateHotelTravel =
        hasEarlyMorningArrival &&
        currentHotelName &&
        segments.some((segment, segmentIndex) => (
          segmentIndex > earlyCheckinIndex &&
          segment.type === 'travel' &&
          normalizeTimelineLabel(segment.to) === normalizeTimelineLabel(currentHotelName)
        ));

      const hasLateCheckin =
        hasEarlyMorningArrival &&
        segments.some((segment, segmentIndex) => (
          segmentIndex > earlyCheckinIndex && segment.type === 'checkin'
        ));

      if (hasEarlyMorningArrival && currentHotelName && !hasLateHotelTravel) {
        const lateCheckinIndex = segments.findIndex((segment, segmentIndex) => (
          segmentIndex > earlyCheckinIndex && segment.type === 'checkin'
        ));
        const lateCheckinSegment = lateCheckinIndex >= 0 ? segments[lateCheckinIndex] as CheckinSegment : null;

        const searchEndIndex = lateCheckinIndex >= 0 ? lateCheckinIndex : segments.length;
        let anchorIndex = -1;
        for (let index = searchEndIndex - 1; index > earlyCheckinIndex; index -= 1) {
          if (segments[index]?.type === 'hotspot') continue;
          anchorIndex = index;
          break;
        }

        const anchorSegment = anchorIndex >= 0 ? segments[anchorIndex] : undefined;
        const anchorLabel = getSegmentAnchorLabel(anchorSegment);
        const anchorEndMinutes = getSegmentEndMinutes(anchorSegment);
        const existingCheckinMinutes = lateCheckinSegment ? parseDisplayMinutes(lateCheckinSegment.time) : parseDisplayMinutes(day.endTime);
        const dayEndMinutes = parseDisplayMinutes(day.endTime);
        const desiredCheckinMinutes = existingCheckinMinutes ?? dayEndMinutes ?? anchorEndMinutes;
        const estimatedTravelMinutes = estimateHotelTravelMinutesFromDistance(currentHotelDistance);

        const tailAlreadyArrivesAtHotel =
          !!anchorSegment &&
          (
            anchorSegment.type === 'checkin' ||
            (
              anchorSegment.type === 'travel' &&
              normalizeTimelineLabel(anchorSegment.to || '') === normalizeTimelineLabel(currentHotelName)
            ) ||
            normalizeTimelineLabel(anchorLabel) === 'hotel' ||
            normalizeTimelineLabel(anchorLabel) === normalizeTimelineLabel(currentHotelName)
          );

        if (!tailAlreadyArrivesAtHotel && anchorLabel && normalizeTimelineLabel(anchorLabel) !== normalizeTimelineLabel(currentHotelName)) {
          const scheduleGapMinutes =
            anchorEndMinutes !== null && desiredCheckinMinutes !== null
              ? Math.max(0, desiredCheckinMinutes - anchorEndMinutes)
              : 0;
          const effectiveTravelMinutes =
            estimatedTravelMinutes != null
              ? Math.max(scheduleGapMinutes, estimatedTravelMinutes)
              : scheduleGapMinutes;

          if (anchorEndMinutes !== null) {
            const travelEndMinutes = anchorEndMinutes + effectiveTravelMinutes;
            const travelSegment: TravelSegment = {
              type: 'travel',
              from: anchorLabel,
              to: currentHotelName,
              timeRange: `${formatMinutesToDisplay(anchorEndMinutes)} - ${formatMinutesToDisplay(travelEndMinutes)}`,
              distance: currentHotelDistance || '',
              duration: formatMinutesDuration(effectiveTravelMinutes),
              note: 'This may vary due to traffic conditions',
            };
            const adjustedCheckinMinutes = desiredCheckinMinutes !== null
              ? Math.max(desiredCheckinMinutes, travelEndMinutes)
              : travelEndMinutes;

            if (lateCheckinIndex >= 0) {
              segments.splice(lateCheckinIndex, 0, travelSegment);
              segments[lateCheckinIndex + 1] = {
                ...(segments[lateCheckinIndex + 1] as CheckinSegment),
                hotelName: currentHotelName,
                hotelAddress: '',
                time: formatMinutesToDisplay(adjustedCheckinMinutes),
              };
            } else {
              segments.push(travelSegment);
              segments.push({
                type: 'checkin',
                hotelName: currentHotelName,
                hotelAddress: '',
                time: formatMinutesToDisplay(adjustedCheckinMinutes),
              });
            }
          } else if (lateCheckinIndex < 0) {
            segments.push({
              type: 'checkin',
              hotelName: currentHotelName,
              hotelAddress: '',
              time: desiredCheckinMinutes !== null ? formatMinutesToDisplay(desiredCheckinMinutes) : day.endTime || null,
            });
          }
        } else if (lateCheckinIndex >= 0) {
          segments[lateCheckinIndex] = {
            ...(segments[lateCheckinIndex] as CheckinSegment),
            hotelName: currentHotelName,
            hotelAddress: '',
          };
        }
      }

      return {
        ...day,
        segments,
      };
    });
  }, [itineraryDays, selectedHotelMetaByRoute]);

};
