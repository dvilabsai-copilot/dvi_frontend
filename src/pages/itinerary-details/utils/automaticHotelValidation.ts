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
): T => {
  // `current` is the reconciliation response that opened the dialog. Its
  // changeSummary/preview metadata is one-shot state and must not survive
  // the read-after-write merge, otherwise the summary effect immediately
  // reopens the already acknowledged popup.
  const {
    changeSummary: _staleChangeSummary,
    previewId: _stalePreviewId,
    reconciliationEnabled: _staleReconciliationEnabled,
    ...currentWithoutPreviewState
  } = (current || {}) as T & {
    changeSummary?: unknown;
    previewId?: unknown;
    reconciliationEnabled?: unknown;
  };
  return {
    ...currentWithoutPreviewState,
    ...accepted,
    changeSummary: undefined,
    previewId: undefined,
    reconciliationEnabled: false,
    hotelAvailability: {
      ...(accepted.hotelAvailability || {}),
      ...(current?.hotelAvailability || {}),
      sharedHotelInventory: current?.hotelAvailability?.sharedHotelInventory || [],
    },
  } as T;
};
