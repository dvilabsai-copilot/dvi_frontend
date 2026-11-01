/**
 * Converts internal hotel-provider keys into labels safe to show to users.
 * Provider keys remain unchanged for booking and filtering.
 */
export const getHotelProviderDisplayName = (
  provider: unknown,
  providerDisplayName?: unknown,
): string => {
  const rawProvider = String(provider ?? '').trim().toLowerCase();
  const displayNameByProvider: Record<string, string> = {
    tbo: 'VSR',
    offline: 'Offline',
    axisrooms: 'AX',
    staah: 'ST',
    resavenue: 'RS',
    hobse: 'HB',
    external: 'Self-arranged stay',
    'self-arranged': 'Self-arranged stay',
  };

  if (displayNameByProvider[rawProvider]) return displayNameByProvider[rawProvider];

  const explicitLabel = String(providerDisplayName ?? '').trim();
  return explicitLabel || (rawProvider ? 'Partner Hotel' : '');
};

/**
 * A direct API marker is meaningful only for TBO/VSR cards. Synthetic MAP
 * options retain the supplier's live fields, so the explicit fallback marker
 * must take precedence over priceSource/isLiveRate.
 */
export const isDirectApiTboRate = (...sources: Array<Record<string, unknown> | null | undefined>): boolean => {
  const provider = String(
    sources.map((source) => source?.provider).find((value) => value != null) || '',
  ).trim().toLowerCase();
  if (provider !== 'tbo') return false;
  if (sources.some((source) => source?.tboMapFallbackApplied === true)) return false;

  return sources.some((source) =>
    source?.isLiveRate === true ||
    String(source?.priceSource || '').trim().toUpperCase() === 'LIVE_API',
  );
};

/** A holdable badge is meaningful only for VSR/TBO supplier rates. */
export const isHoldableVsrRate = (
  provider: unknown,
  ...sources: Array<Record<string, unknown> | null | undefined>
): boolean => {
  const rawProvider = String(provider ?? '').trim().toLowerCase();
  if (rawProvider !== 'tbo') return false;

  const isTruthyRefundable = (value: unknown): boolean =>
    value === true || value === 1 || String(value ?? '').trim().toLowerCase() === 'true';

  // TBO/VSR can expose the refundable flag either on the selected rate or on
  // the hotel wrapper's nested inventory. Inspect only the known rate
  // containers so unrelated metadata cannot accidentally mark a card as
  // holdable.
  const hasRefundableRate = (
    source: Record<string, unknown> | null | undefined,
    depth = 0,
  ): boolean => {
    if (!source || depth > 2) return false;

    if (isTruthyRefundable(source.isRefundable) || isTruthyRefundable(source.IsRefundable)) {
      return true;
    }

    const nestedKeys = [
      'rateOptions',
      'roomTypes',
      'selectedRateOption',
      'selectedRate',
      'rateOption',
      'currentRateOption',
      'pendingAvailabilityChange',
      'option',
    ];

    return nestedKeys.some((key) => {
      const nested = source[key];
      if (Array.isArray(nested)) {
        return nested.some((item) =>
          item && typeof item === 'object'
            ? hasRefundableRate(item as Record<string, unknown>, depth + 1)
            : false,
        );
      }
      return nested && typeof nested === 'object'
        ? hasRefundableRate(nested as Record<string, unknown>, depth + 1)
        : false;
    });
  };

  return sources.some((source) => hasRefundableRate(source));
};

/**
 * Returns the provider label used on a hotel card. Priority VSR hotels are
 * marked for users without changing the internal provider identity.
 */
export const getHotelCardProviderDisplayName = (
  provider: unknown,
  providerDisplayName?: unknown,
  isPriority?: unknown,
  isDirectApiRate?: unknown,
): string => {
  const rawProvider = String(provider ?? '').trim().toLowerCase();
  if (rawProvider === 'tbo') {
    const prioritySuffix = isPriority ? '*' : '';
    const directApiSuffix = isDirectApiRate ? '#' : '';
    return `VSR${prioritySuffix}${directApiSuffix}`;
  }
  return getHotelProviderDisplayName(provider, providerDisplayName);
};

export const replaceHotelProviderBrandForDisplay = (value: unknown): string =>
  String(value ?? '')
    .replace(/\bTBO\b/gi, 'VSR')
    .replace(/\bAxisRooms\b/gi, 'AX')
    .replace(/\bResAvenue\b/gi, 'RS')
    .replace(/\bSTAAH\b/gi, 'ST');
