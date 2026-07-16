type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export const getQuoteNumberFromValue = (value?: string): number => {
  const match = String(value || '').match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
};

export type NormalizedRouteOption = { quoteId: string; label: string };

export const normalizeRouteOptionList = (rawOptions: unknown[]): NormalizedRouteOption[] => {
  const options = rawOptions.map((optionValue, index) => {
    const option = asRecord(optionValue);
    const rawQuoteId = typeof optionValue === 'string'
      ? optionValue
      : option.quoteId || option.routeQuoteId || option.quotationNo || option.quotation_no ||
        option.itinerary_quote_ID || option.itinerary_quote_id || option.quote_id || '';
    return {
      quoteId: String(rawQuoteId || '').trim(),
      label: String(option.label || option.routeName || `Route ${index + 1}`),
    };
  }).filter((option) => option.quoteId && option.quoteId.startsWith('DVI'));
  return Array.from(new Map(options.map((option) => [option.quoteId, option])).values())
    .sort((a, b) => getQuoteNumberFromValue(a.quoteId) - getQuoteNumberFromValue(b.quoteId))
    .map((option, index) => ({ ...option, label: `Route ${index + 1}` }));
};
