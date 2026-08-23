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

export const replaceHotelProviderBrandForDisplay = (value: unknown): string =>
  String(value ?? '')
    .replace(/\bTBO\b/gi, 'VSR')
    .replace(/\bAxisRooms\b/gi, 'AX')
    .replace(/\bResAvenue\b/gi, 'RS')
    .replace(/\bSTAAH\b/gi, 'ST');
