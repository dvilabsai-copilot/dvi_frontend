/**
 * Converts internal hotel-provider keys into labels safe to show to users.
 * Provider keys remain unchanged for booking and filtering.
 */
export const getHotelProviderDisplayName = (
  provider: unknown,
  providerDisplayName?: unknown,
): string => {
  const explicitLabel = String(providerDisplayName ?? '').trim();
  if (explicitLabel) return explicitLabel;

  const rawProvider = String(provider ?? '').trim();
  if (rawProvider.toLowerCase() === 'tbo') return 'VSR';
  return rawProvider;
};

export const replaceHotelProviderBrandForDisplay = (value: unknown): string =>
  String(value ?? '').replace(/\bTBO\b/gi, 'VSR');
