export type HotelCardQuote = {
  basis: 'ROUTE_NIGHT'; routeId: number; date: string; roomCount: number;
  currency: string; payableAmount: number; baseAmount: number;
};

type HotelPriceRow = Record<string, any>;
type PriceScope = { routeId: number; date: string; roomCount: number };
const amount = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
};

/** A route quote is already for the entire occupancy. Never divide by nights. */
export function getHotelRoutePayable(row?: HotelPriceRow | null, persisted = false, scope?: PriceScope): number | null {
  if (!row) return null;
  if (Object.prototype.hasOwnProperty.call(row, 'cardQuote')) {
    const quote = row.cardQuote as HotelCardQuote | null;
    if (!quote || quote.basis !== 'ROUTE_NIGHT') return null;
    if (scope && (quote.routeId !== scope.routeId || quote.date !== scope.date || quote.roomCount !== scope.roomCount)) return null;
    return amount(quote.payableAmount);
  }
  // Only selected rows and authoritative preview selections may use these
  // legacy fields. An unquoted inventory card must not invent a saving.
  if (!persisted) return null;
  return amount(row.selectedPricePerNight ?? row.selected_price_per_night ?? row.pricePerNight ??
    row.totalHotelCost ?? row.totalPrice ?? row.totalAmountAfterTax ?? row.totalAmount);
}

export function getHotelCardPricing(candidate: HotelPriceRow, current: HotelPriceRow | null | undefined, scope: PriceScope) {
  const payable = getHotelRoutePayable(candidate, false, scope);
  const selected = getHotelRoutePayable(current, true, scope);
  const currency = (row: HotelPriceRow) => String(row.cardQuote?.currency || row.selectedCurrency || row.currency || 'INR').toUpperCase();
  const compatible = current && currency(candidate) === currency(current);
  return {
    startingFromAmount: payable === null ? null : payable / scope.roomCount,
    startingFromBaseAmount: candidate.cardQuote?.baseAmount ? candidate.cardQuote.baseAmount / scope.roomCount : 0,
    priceDifference: payable !== null && selected !== null && compatible
      ? (Math.round(payable * 100) - Math.round(selected * 100)) / 100 : null,
  };
}

/** Constructed only from select-intent-preview's server-authoritative route. */
export function quoteFromHotelPreview(selection: HotelPriceRow, routeId: number, date: string, rooms: number): HotelCardQuote {
  return {
    basis: 'ROUTE_NIGHT', routeId, date: date.slice(0, 10), roomCount: Math.max(rooms, 1),
    currency: String(selection.currency || 'INR').toUpperCase(),
    payableAmount: Number(selection.totalPrice), baseAmount: Number(selection.baseTotalPrice || 0),
  };
}
