/**
 * Read-only comparison of itinerary Additional Margin.
 * The details API is authoritative for the selected vendor. Other columns
 * can only be extrapolated when the quote is a single-base, uniform-rate case.
 * An em dash (null) is preferable to an invented vendor-specific quotation.
 */
export type MarginVendorQuote = {
  vendorEligibleId?: number | null;
  selling: number | null;
};

export type ComparisonMarginSnapshot = {
  selectedVendorEligibleId: number | null;
  additionalMargin: number | null;
  baseBeforeMargin: number | null;
  dayCount: number | null;
  defaultPercent: number | null;
  dayLimit: number | null;
  /** True only after the rules endpoint has confirmed there are no active rules. */
  noActiveVendorRules: boolean;
};

const moneyPaise = (value: number | null): number | null => {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  const paise = Math.round(value * 100);
  return Number.isSafeInteger(paise) ? paise : null;
};

/** Round positive percentages with paise precision; accept saved decimal rates. */
export const calculatePercentageMargin = (
  selling: number | null,
  percentage: number | null,
): number | null => {
  const paise = moneyPaise(selling);
  if (paise === null || percentage === null || !Number.isFinite(percentage) ||
      percentage < 0 || percentage > 1000) return null;
  const scaledRate = Math.round(percentage * 10_000);
  if (!Number.isSafeInteger(scaledRate)) return null;
  const divisor = 1_000_000n;
  const marginPaise = (BigInt(paise) * BigInt(scaledRate) + divisor / 2n) / divisor;
  if (marginPaise > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(marginPaise) / 100;
};

/**
 * Never reinterpret a fixed amount or an itinerary-wide amount as a percent
 * on every vendor's price. The selected value always comes from the API.
 */
export const resolveComparisonAdditionalMargins = (
  vendors: MarginVendorQuote[],
  selectedVendorEligibleId: number | null | undefined,
  snapshot: ComparisonMarginSnapshot | null,
): Array<number | null> => {
  const none = vendors.map(() => null);
  const selectedId = Number(selectedVendorEligibleId);
  if (!snapshot || !Number.isSafeInteger(selectedId) || selectedId <= 0 ||
      snapshot.selectedVendorEligibleId !== selectedId) return none;

  const selected = vendors.find((vendor) => Number(vendor.vendorEligibleId) === selectedId);
  const authoritativePaise = moneyPaise(snapshot.additionalMargin);
  if (!selected || authoritativePaise === null) return none;

  const basePaise = moneyPaise(snapshot.baseBeforeMargin);
  const selectedSellingPaise = moneyPaise(selected.selling);
  const days = snapshot.dayCount;
  const limit = snapshot.dayLimit;
  const defaultPercent = snapshot.defaultPercent;
  const rate = days !== null && limit !== null && Number.isInteger(days) &&
    Number.isInteger(limit) && days >= 0 && limit >= 0 &&
    defaultPercent !== null && Number.isFinite(defaultPercent)
      ? (days <= limit ? defaultPercent : 0)
      : null;

  // Only extrapolate a uniform rate when ALL evidence says the itinerary's
  // margin base is exactly this vendor's quoted selling price and the backend
  // itself reproduces the configured rate. Custom rules make this unsafe.
  const selectedExpected = calculatePercentageMargin(selected.selling, rate);
  const canExtrapolate = snapshot.noActiveVendorRules &&
    basePaise !== null && selectedSellingPaise !== null &&
    basePaise === selectedSellingPaise &&
    selectedExpected !== null &&
    moneyPaise(selectedExpected) === authoritativePaise;

  return vendors.map((vendor) => {
    const id = Number(vendor.vendorEligibleId);
    if (id === selectedId) return authoritativePaise / 100;
    if (!canExtrapolate || !Number.isSafeInteger(id) || id <= 0) return null;
    return calculatePercentageMargin(vendor.selling, rate);
  });
};
