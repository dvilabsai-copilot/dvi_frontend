export const claimAutomaticHotelValidation = (
  startedQuotes: Set<string>,
  quoteId: string | undefined,
  hasPersistedHotelDetails: boolean,
  enabled: boolean,
): boolean => {
  if (!enabled || !quoteId || !hasPersistedHotelDetails || startedQuotes.has(quoteId)) return false;
  startedQuotes.add(quoteId);
  return true;
};

type HotelDetailsWithInventory = {
  hotelAvailability?: {
    sharedHotelInventory?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/** Replace persisted selections/totals while retaining the mounted fresh inventory. */
export const mergeAcknowledgedHotelDetails = <T extends HotelDetailsWithInventory>(
  current: T | null | undefined,
  accepted: T,
): T => ({
  ...(current || {}),
  ...accepted,
  hotelAvailability: {
    ...(accepted.hotelAvailability || {}),
    ...(current?.hotelAvailability || {}),
    sharedHotelInventory: current?.hotelAvailability?.sharedHotelInventory || [],
  },
} as T);
