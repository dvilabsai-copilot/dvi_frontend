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
 * Returns the provider label used on a hotel card. Priority VSR hotels are
 * marked for users without changing the internal provider identity.
 */
export const getHotelCardProviderDisplayName = (
  provider: unknown,
  providerDisplayName?: unknown,
  isPriority?: unknown,
): string => {
  const rawProvider = String(provider ?? '').trim().toLowerCase();
  if (rawProvider === 'tbo' && Boolean(isPriority)) return 'VSR*';
  return getHotelProviderDisplayName(provider, providerDisplayName);
};

export const replaceHotelProviderBrandForDisplay = (value: unknown): string =>
  String(value ?? '')
    .replace(/\bTBO\b/gi, 'VSR')
    .replace(/\bAxisRooms\b/gi, 'AX')
    .replace(/\bResAvenue\b/gi, 'RS')
    .replace(/\bSTAAH\b/gi, 'ST');
