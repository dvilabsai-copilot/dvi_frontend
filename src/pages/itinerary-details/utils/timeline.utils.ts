import type { AttractionSegment, AvailableHotspot, ItineraryDay, ItinerarySegment } from "../itinerary-details.types";

export const formatHeaderDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getDisplayDistances = (day: ItineraryDay) => {
  return {
    intercityDistance: day.intercityDistance || day.distance,
    sightseeingDistance: day.sightseeingDistance || "0.00 KM",
  };
};
export const getGuestFoodPreferenceText = (
  itineraryData: any,
  dayData?: any
): string => {
  const rawValue =
    dayData?.guest_food_preference_name ||
    dayData?.guestFoodPreferenceName ||
    dayData?.guest_food_preference ||
    dayData?.guestFoodPreference ||
    dayData?.food_preference_name ||
    dayData?.foodPreferenceName ||
    dayData?.food_preference ||
    dayData?.foodPreference ||
    dayData?.food_type_name ||
    dayData?.foodTypeName ||
    dayData?.food_type ||
    dayData?.foodType ||
    itineraryData?.guest_food_preference_name ||
    itineraryData?.guestFoodPreferenceName ||
    itineraryData?.guest_food_preference ||
    itineraryData?.guestFoodPreference ||
    itineraryData?.food_preference_name ||
    itineraryData?.foodPreferenceName ||
    itineraryData?.food_preference ||
    itineraryData?.foodPreference ||
    itineraryData?.food_type_name ||
    itineraryData?.foodTypeName ||
    itineraryData?.food_type ||
    itineraryData?.foodType ||
    "";

  if (!rawValue) return "Not Mentioned";

  if (typeof rawValue === "string") {
    return rawValue.trim() || "Not Mentioned";
  }

  if (typeof rawValue === "number") {
    return String(rawValue);
  }

  return (
    rawValue?.name ||
    rawValue?.label ||
    rawValue?.title ||
    rawValue?.food_type_name ||
    rawValue?.foodTypeName ||
    "Not Mentioned"
  ).trim();
};
export const parseDisplayTimeToHms = (displayTime: string): string => {
  if (!displayTime) return "09:00:00";
  const parts = displayTime.split(' ');
  if (parts.length < 2) return "09:00:00";
  const [time, ampm] = parts;
  const timeParts = time.split(':');
  if (timeParts.length < 2) return "09:00:00";
  let hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
};

// Returns true for times in the 01:00â€“07:59 range (early morning, requires previous-day hotel)
export const isEarlyMorningTime = (hms: string): boolean => {
  const [h = 0, m = 0] = hms.split(':').map(Number);
  const totalMinutes = h * 60 + m;
  return totalMinutes >= 60 && totalMinutes < 480;
};

export const normalizeTimelineLabel = (value: unknown): string => {
  return String(value ?? '').trim().toLowerCase();
};

export const normalizeCityKeyForHotspotFilter = (value?: string | null): string => {
  return String(value || '')
    .split('|')[0]
    .split(',')[0]
    .toLowerCase()
    .replace(/\b(international|domestic|airport|railway|station|bus stand|mattuthavani|arappalayam)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

export const splitHotspotLocationTokens = (value?: string | null): string[] => {
  return String(value || '')
    .split('|')
    .flatMap((part) => String(part || '').split(','))
    .map(normalizeCityKeyForHotspotFilter)
    .filter(Boolean);
};

export const locationTokenMatchesCity = (
  value: string | null | undefined,
  cityKey: string,
): boolean => {
  if (!cityKey) return false;

  return splitHotspotLocationTokens(value).some((token) => (
    token === cityKey
    || token.startsWith(`${cityKey} `)
    || token.includes(` ${cityKey} `)
    || token.endsWith(` ${cityKey}`)
  ));
};

export const getHotspotFromLocationText = (hotspot: AvailableHotspot): string => {
  return String(
    hotspot.hotspot_location
    || hotspot.hotspotLocation
    || hotspot.locationMap
    || '',
  ).trim();
};

export const getHotspotToLocationText = (hotspot: AvailableHotspot): string => {
  return String(
    hotspot.hotspot_to_location
    || hotspot.hotspotToLocation
    || hotspot.hotspot_location
    || hotspot.hotspotLocation
    || hotspot.locationMap
    || '',
  ).trim();
};

export const isRouteMovementAvailableHotspot = (hotspot: AvailableHotspot): boolean => {
  const fromTokens = splitHotspotLocationTokens(getHotspotFromLocationText(hotspot));
  const toTokens = splitHotspotLocationTokens(getHotspotToLocationText(hotspot));

  if (!fromTokens.length || !toTokens.length) return false;

  return fromTokens.join('|') !== toTokens.join('|');
};

export const isAvailableHotspotForRoutePair = (
  hotspot: AvailableHotspot,
  sourceCity: string,
  destinationCity: string,
): boolean => {
  const sourceKey = normalizeCityKeyForHotspotFilter(sourceCity);
  const destinationKey = normalizeCityKeyForHotspotFilter(destinationCity);
  const sameCityRoute =
    !!sourceKey &&
    !!destinationKey &&
    sourceKey === destinationKey;

  const fromText = getHotspotFromLocationText(hotspot);
  const toText = getHotspotToLocationText(hotspot);

  const fromMatchesSource = locationTokenMatchesCity(fromText, sourceKey);
  const fromMatchesDestination = locationTokenMatchesCity(fromText, destinationKey);
  const toMatchesSource = locationTokenMatchesCity(toText, sourceKey);
  const toMatchesDestination = locationTokenMatchesCity(toText, destinationKey);

  if (sameCityRoute) {
    return (
      fromMatchesSource ||
      fromMatchesDestination ||
      toMatchesSource ||
      toMatchesDestination
    );
  }

  return (
    (fromMatchesSource && toMatchesDestination) ||
    (fromMatchesDestination && toMatchesSource)
  );
};

export const isAvailableHotspotForAnchorOrRoutePair = (
  hotspot: AvailableHotspot,
  sourceCity: string,
  destinationCity: string,
  anchorFrom?: string | null,
  anchorTo?: string | null,
): boolean => {
  if (!isRouteMovementAvailableHotspot(hotspot)) return true;

  const sourceKey = normalizeCityKeyForHotspotFilter(sourceCity);
  const destinationKey = normalizeCityKeyForHotspotFilter(destinationCity);

  const sameCityRoute =
    !!sourceKey &&
    !!destinationKey &&
    sourceKey === destinationKey;

  const hasConcreteAnchorLeg =
    String(anchorFrom || '').trim().length > 0 ||
    String(anchorTo || '').trim().length > 0;

  const anchorFromMatchesSource = locationTokenMatchesCity(anchorFrom || '', sourceKey);
  const anchorFromMatchesDestination = locationTokenMatchesCity(anchorFrom || '', destinationKey);
  const anchorToMatchesSource = locationTokenMatchesCity(anchorTo || '', sourceKey);
  const anchorToMatchesDestination = locationTokenMatchesCity(anchorTo || '', destinationKey);

  const anchorRepresentsRouteMovement =
    !sameCityRoute &&
    hasConcreteAnchorLeg &&
    (
      (anchorFromMatchesSource && anchorToMatchesDestination) ||
      (anchorFromMatchesDestination && anchorToMatchesSource)
    );

  if (sameCityRoute) {
    return false;
  }

  if (hasConcreteAnchorLeg && !anchorRepresentsRouteMovement) {
    return false;
  }

  return isAvailableHotspotForRoutePair(
    hotspot,
    sourceCity,
    destinationCity,
  );
};

export const filterAvailableHotspotsForAnchor = (
  hotspots: AvailableHotspot[],
  sourceCity: string,
  destinationCity: string,
  anchorFrom?: string | null,
  anchorTo?: string | null,
): AvailableHotspot[] => {
  return hotspots.filter((hotspot) => {
    if (!isRouteMovementAvailableHotspot(hotspot)) return true;

    const keep = isAvailableHotspotForAnchorOrRoutePair(
      hotspot,
      sourceCity,
      destinationCity,
      anchorFrom,
      anchorTo,
    );

    if (!keep) {
      console.log('[AddHotspotModal] hiding_route_movement_hotspot_wrong_anchor', {
        hotspotId: Number(hotspot?.id || 0),
        hotspotName: hotspot?.name,
        hotspotLocation: getHotspotFromLocationText(hotspot),
        hotspotToLocation: getHotspotToLocationText(hotspot),
        routeSourceName: sourceCity,
        routeDestinationName: destinationCity,
        anchorFromName: String(anchorFrom || '').trim() || null,
        anchorToName: String(anchorTo || '').trim() || null,
      });
    }

    return keep;
  });
};

export const parseDisplayMinutes = (value?: string | null, edge: 'start' | 'end' = 'start'): number | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const timeText = raw.includes(' - ')
    ? raw.split(' - ')[edge === 'start' ? 0 : 1]?.trim()
    : raw;

  if (!timeText) return null;

  const hms = parseDisplayTimeToHms(timeText);
  const [hours = 0, minutes = 0] = hms.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

export const formatMinutesToDisplay = (totalMinutes: number): string => {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const formatManualPolicyTime = (value?: string | null): string => {
  if (!value) return '';

  const [hhRaw, mmRaw] = String(value).split(':');
  const hh = Number(hhRaw);
  const mm = Number(mmRaw || 0);

  if (!Number.isFinite(hh)) return String(value);

  const suffix = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;

  return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`;
};

export const getManualTimingPolicyFromPreview = (preview) => {
  return (
    preview?.manualTimingPolicy
    || preview?.validation?.manualTimingPolicy
    || preview?.resolution?.manualTimingPolicy
    || preview?.manualInsertionFit?.manualTimingPolicy
    || preview?.resolution?.manualInsertionFit?.manualTimingPolicy
    || null
  );
};

export const isManualRelaxedRouteFitPolicy = (preview): boolean => {
  const policy = getManualTimingPolicyFromPreview(preview);
  return (
    policy?.mode === 'MANUAL_HOTSPOT'
    && policy?.allowOffRouteWhenTimePermits === true
  );
};

export const hasManualOpeningOrTimingConflict = (validation): boolean => {
  if (!validation) return false;

  const selectedManualConflictCount = Number(validation?.selectedManualConflictCount || 0);
  const openingHourConflictCount = Number(validation?.openingHourConflictCount || 0);
  const unscheduledManualCount = Number(validation?.unscheduledManualCount || 0);
  const reason = String(validation?.reason || '').toLowerCase();

  return (
    selectedManualConflictCount > 0
    || openingHourConflictCount > 0
    || (
      unscheduledManualCount > 0
      && (
        reason.includes('opening')
        || reason.includes('timing')
        || reason.includes('time window')
        || reason.includes('could not be scheduled')
        || reason.includes('does not fit')
      )
    )
  );
};

export const formatPreviewDuration = (value): string => {
  if (!value) return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hours = value.getUTCHours();
    const minutes = value.getUTCMinutes();
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} Hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0) parts.push(`${minutes} Min`);
    return parts.join(' ') || '';
  }

  const raw = String(value || '').trim();
  if (!raw) return '';

  const hmsMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hmsMatch) {
    const hours = Number(hmsMatch[1] || 0);
    const minutes = Number(hmsMatch[2] || 0);
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} Hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0) parts.push(`${minutes} Min`);
    return parts.join(' ') || '';
  }

  const isoDate = new Date(raw);
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !Number.isNaN(isoDate.getTime())) {
    const hours = isoDate.getUTCHours();
    const minutes = isoDate.getUTCMinutes();
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} Hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0) parts.push(`${minutes} Min`);
    return parts.join(' ') || '';
  }

  const localDateLabelMatch = raw.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (
    localDateLabelMatch &&
    /(?:sun|mon|tue|wed|thu|fri|sat)\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(raw)
  ) {
    const hours = Number(localDateLabelMatch[1] || 0);
    const minutes = Number(localDateLabelMatch[2] || 0);
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} Hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0) parts.push(`${minutes} Min`);
    return parts.join(' ') || '';
  }

  return raw;
};

export const extractCheckinHotelName = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return 'Hotel';

  const withoutPrefix = raw
    .replace(/^check-?in\s+(?:to|at)\s+/i, '')
    .replace(/^hotel\s*:\s*/i, '')
    .trim();

  if (!withoutPrefix) return 'Hotel';
  if (/^hotel$/i.test(withoutPrefix)) return 'Hotel';
  return withoutPrefix;
};

export const normalizeConfirmedTimelineToSegments = (
  rows: any[],
  context?: {
    existingSegments?: ItinerarySegment[];
    availableHotspots?: AvailableHotspot[];
  },
): ItinerarySegment[] => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row): ItinerarySegment | null => {
      const type = String(row?.type || '').toLowerCase();
      const itemType = Number(row?.item_type || 0);

      if (type === 'start' || type === 'refreshment' || itemType === 1) {
        return {
          type: 'start',
          title: String(row?.text || row?.title || 'Start Your Day'),
          timeRange: String(row?.timeRange || ''),
        };
      }

      if (type === 'travel' || itemType === 3 || itemType === 5) {
        return {
          type: 'travel',
          from: String(row?.from || row?.fromName || row?.displayFromName || ''),
          to: String(row?.to || row?.toName || row?.displayToName || row?.text || ''),
          timeRange: String(row?.timeRange || ''),
          distance: String(row?.distance || row?.hotspot_travelling_distance || ''),
          duration: String(row?.duration || ''),
          isConflict: row?.isConflict === true,
          conflictReason: row?.conflictReason || null,
        };
      }

      if (type === 'attraction' || itemType === 4) {
        const hotspotId = Number(row?.hotspotId || row?.hotspot_ID || row?.locationId || 0) || 0;
        const existingSegment = (context?.existingSegments || []).find((seg) => {
          if (String(seg?.type || '').toLowerCase() !== 'attraction') return false;
          const attraction = seg as AttractionSegment;
          return Number(attraction?.hotspotId ?? attraction?.locationId ?? 0) === hotspotId;
        }) as AttractionSegment | undefined;
        const availableHotspot = (context?.availableHotspots || []).find((hotspot) => (
          Number(hotspot.id || 0) === hotspotId
        ));

        return {
          type: 'attraction',
          name: String(
            row?.name ||
            row?.hotspot_name ||
            row?.text ||
            existingSegment?.name ||
            availableHotspot?.name ||
            '',
          ),
          description: String(
            row?.description ||
            row?.hotspot_description ||
            row?.hotspotDescription ||
            existingSegment?.description ||
            availableHotspot?.description ||
            '',
          ),
          visitTime: String(row?.visitTime || row?.timeRange || ''),
          duration: formatPreviewDuration(
            row?.duration ||
            row?.hotspot_traveling_time ||
            availableHotspot?.timeSpend ||
            '',
          ),
          priority: Number(
            row?.priority ||
            row?.hotspot_priority ||
            availableHotspot?.priority ||
            availableHotspot?.hotspotPriority ||
            0,
          ) || undefined,
          amount: Number(row?.amount || row?.hotspot_amout || availableHotspot?.amount || 0) || null,
          timings: String(row?.timings || availableHotspot?.timings || ''),
          image: row?.image || existingSegment?.image || availableHotspot?.image || null,
          galleryImages: Array.isArray(row?.galleryImages)
            ? row.galleryImages
            : (Array.isArray(existingSegment?.galleryImages)
              ? existingSegment.galleryImages
              : (Array.isArray(availableHotspot?.galleryImages) ? availableHotspot.galleryImages : [])),
          videoUrl: row?.videoUrl || existingSegment?.videoUrl || availableHotspot?.videoUrl || null,
          planOwnWay: row?.planOwnWay === true || row?.isManual === true || existingSegment?.planOwnWay === true,
          isManual: row?.isManual === true || row?.planOwnWay === true || existingSegment?.isManual === true,
          hotspotId: hotspotId || undefined,
          routeHotspotId: Number(
            row?.routeHotspotId ||
            row?.route_hotspot_ID ||
            existingSegment?.routeHotspotId ||
            0,
          ) || undefined,
          locationId: hotspotId || null,
          isConflict: row?.isConflict === true,
          conflictReason: row?.conflictReason || null,
        };
      }

      if (type === 'hotel' || type === 'checkin' || itemType === 6) {
        return {
          type: 'checkin',
          hotelName: extractCheckinHotelName(row?.hotelName || row?.text || 'Hotel'),
          hotelAddress: String(row?.hotelAddress || ''),
          time: String(row?.time || row?.timeRange || ''),
        };
      }

      return null;
    })
    .filter(Boolean) as ItinerarySegment[];
};

export const formatMinutesDuration = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours > 0 && remainder > 0) return `${hours} Hours ${remainder} Min`;
  if (hours > 0) return `${hours} Hours`;
  return `${remainder} Min`;
};

export const parseDistanceKmValue = (distanceText?: string | null): number | null => {
  const raw = String(distanceText ?? '').trim().toLowerCase();
  if (!raw) return null;

  const value = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value) || value <= 0) return null;

  if (raw.includes('km')) return value;
  if (raw.includes('m')) return value / 1000;
  return value;
};

export const estimateHotelTravelMinutesFromDistance = (distanceText?: string | null): number | null => {
  const distanceKm = parseDistanceKmValue(distanceText);
  if (distanceKm === null) return null;

  // Keep this conservative for city traffic conditions.
  const assumedCitySpeedKmH = 25;
  const estimated = Math.round((distanceKm / assumedCitySpeedKmH) * 60);
  return Math.max(10, estimated);
};

export const parseDurationMinutesValue = (durationValue: unknown): number | null => {
  if (durationValue == null) return null;
  if (typeof durationValue === 'number' && Number.isFinite(durationValue) && durationValue > 0) {
    return Math.max(1, Math.round(durationValue));
  }

  const text = String(durationValue).trim().toLowerCase();
  if (!text) return null;

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*m/);

  const hours = hourMatch ? Number.parseFloat(hourMatch[1]) : 0;
  const minutes = minMatch ? Number.parseFloat(minMatch[1]) : 0;
  const total = (Number.isFinite(hours) ? hours * 60 : 0) + (Number.isFinite(minutes) ? minutes : 0);
  if (total > 0) return Math.max(1, Math.round(total));

  const numeric = Number.parseFloat(text.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.max(1, Math.round(numeric));
};

export const normalizeDurationAgainstDistance = (
  distanceValue: unknown,
  durationValue: unknown,
  maxPlausibleSpeedKmH = 140,
): number | null => {
  const distanceKm = typeof distanceValue === 'number'
    ? (Number.isFinite(distanceValue) && distanceValue > 0 ? distanceValue : null)
    : parseDistanceKmValue(String(distanceValue ?? ''));
  if (distanceKm === null) return parseDurationMinutesValue(durationValue);

  const baseDurationMin = parseDurationMinutesValue(durationValue);
  if (baseDurationMin === null) {
    return estimateHotelTravelMinutesFromDistance(`${distanceKm} km`);
  }

  const impliedSpeed = distanceKm / (baseDurationMin / 60);
  if (Number.isFinite(impliedSpeed) && impliedSpeed <= maxPlausibleSpeedKmH) {
    return baseDurationMin;
  }

  return estimateHotelTravelMinutesFromDistance(`${distanceKm} km`) || baseDurationMin;
};

export const normalizeDateToYmd = (input?: string | null): string => {
  const raw = String(input || '').trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
};
