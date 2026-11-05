type TravelLabelSegment = {
  type?: unknown;
};

/**
 * Resolve the destination shown for a travel leg that ends at a hotel.
 *
 * The persisted travel row can retain the previous hotel's name after a
 * hotel selection changes. The following check-in segment is the current
 * display contract, so use its resolved hotel name for that one leg only.
 */
export const resolveHotelBoundTravelDestination = ({
  rawDestination,
  nextSegment,
  currentHotelName,
  destinationHotelDisplayName,
}: {
  rawDestination: string;
  nextSegment?: TravelLabelSegment | null;
  currentHotelName?: string | null;
  destinationHotelDisplayName?: string | null;
}): string => {
  const raw = String(rawDestination || '').trim();
  const current = String(currentHotelName || '').trim();

  if (String(nextSegment?.type || '').toLowerCase() === 'checkin' && current) {
    return current;
  }

  if (/hotel/i.test(raw) && destinationHotelDisplayName) {
    return String(destinationHotelDisplayName).trim();
  }

  return raw;
};
