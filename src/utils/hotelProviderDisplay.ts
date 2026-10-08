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
