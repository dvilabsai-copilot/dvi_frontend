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
    axisrooms: 'Live Hotel',
    staah: 'Live Hotel',
    resavenue: 'Live Hotel',
    hobse: 'Live Hotel',
    external: 'Self-arranged stay',
    'self-arranged': 'Self-arranged stay',
  };

  if (displayNameByProvider[rawProvider]) return displayNameByProvider[rawProvider];

  const explicitLabel = String(providerDisplayName ?? '').trim();
  return explicitLabel || (rawProvider ? 'Partner Hotel' : '');
};

export const replaceHotelProviderBrandForDisplay = (value: unknown): string =>
  String(value ?? '').replace(/\bTBO\b/gi, 'VSR');
