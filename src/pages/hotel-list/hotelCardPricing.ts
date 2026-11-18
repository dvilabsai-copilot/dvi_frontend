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

export function getHotelCardPricing(candidate: HotelPriceRow, current: HotelPriceRow | null | undefined, scope: PriceScope, isCurrent = false) {
  const selected = getHotelRoutePayable(current, true, scope);
  const payable = isCurrent ? selected : getHotelRoutePayable(candidate, false, scope);
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

/** Sum only selected route quotes in the active package; merged stay rows may
 * repeat an aggregate price or contain unresolved nights. */
export function getHotelOperationDifference(selections: HotelPriceRow[], groups: HotelPriceRow[], groupType: number, rooms: number): number | null {
  if (!selections.length) return null;
  const routes = groups.find(group => Number(group.groupType) === groupType)?.routes || [];
  let differencePaise = 0;
  for (const selection of selections) {
    const route = routes.find((candidate: HotelPriceRow) => Number(candidate.routeId) === Number(selection.routeId));
    if (route?.selectionStatus !== 'SELECTED' || !route.selected) return null;
    const scope = { routeId: Number(selection.routeId), date: String(selection.routeDate || '').slice(0, 10), roomCount: rooms };
    if (String(route.routeDate || '').slice(0, 10) !== scope.date) return null;
    const currency = (row: HotelPriceRow) => String(row.cardQuote?.currency || row.selectedCurrency || row.currency || 'INR').toUpperCase();
    if (currency(route.selected) !== currency(selection)) return null;
    const oldPrice = getHotelRoutePayable(route.selected, true, scope);
    const newPrice = getHotelRoutePayable(selection, true, scope);
    if (oldPrice === null || newPrice === null) return null;
    differencePaise += Math.round(newPrice * 100) - Math.round(oldPrice * 100);
  }
  return differencePaise / 100;
}
