import { useCallback, type Dispatch, type SetStateAction } from "react";

export interface HotelSelectionChange {
  provider: string;
  hotelCode: string;
  bookingCode: string;
  roomType: string;
  netAmount: number;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  groupType: number;
  mealPlan?: string;
  searchReference?: string;
  roomId?: string;
  rateId?: string;
  multiNightBooking?: boolean;
  stayKey?: string;
  routeId?: number;
  routeIds?: number[];
  nights?: number;
  nightlyRates?: Array<{
    date: string;
    amountAfterTax: number;
    baseAmount?: number;
    extraAdultCount?: number;
    extraChildCount?: number;
    extraAdultRate?: number;
    extraChildRate?: number;
  }>;
  totalAmountAfterTax?: number;
}

export type HotelSelectionChangeMap = Record<number, HotelSelectionChange | null>;

type PersistedHotelSelection = Omit<HotelSelectionChange, "groupType"> & { groupType?: number; routeId?: number };

interface HotelSelectionsChangeMutationOptions {
  setSelectedHotelBookings: Dispatch<SetStateAction<Record<number, PersistedHotelSelection>>>;
}

/** Merges HotelList selections and collapses multi-night child routes into canonical parents. */
export function mergeHotelSelections(
  previous: Record<number, PersistedHotelSelection>,
  selections: HotelSelectionChangeMap,
) {
      const next: Record<number, PersistedHotelSelection> = { ...previous };

      Object.entries(selections).forEach(([routeIdRaw, value]) => {
        const routeIdNum = Number(routeIdRaw);
        if (!Number.isFinite(routeIdNum) || routeIdNum <= 0) return;

        if (value === null) {
          delete next[routeIdNum];
          return;
        }

        // A room/rate update is a complete replacement for the affected stay.
        // Do not carry booking/search/nightly fields from the previous rate.
        next[routeIdNum] = {
          ...value,
          routeId: Number(value.routeId || routeIdNum),
        };
      });

      const canonicalParents = new Map<number, PersistedHotelSelection>();
      Object.entries(next).forEach(([routeIdRaw, booking]) => {
        const routeIdNum = Number(routeIdRaw);
        const routeIds = Array.isArray(booking.routeIds)
          ? booking.routeIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
          : [];

        if (!booking.multiNightBooking || !routeIdNum || routeIds.length <= 1) return;

        const canonicalRouteId = routeIds[0];
        const currentParent = canonicalParents.get(canonicalRouteId);
        const normalizedBooking = { ...booking, routeId: canonicalRouteId, routeIds };

        if (!currentParent || routeIdNum === canonicalRouteId) {
          canonicalParents.set(canonicalRouteId, normalizedBooking);
        }
      });

      canonicalParents.forEach((parentBooking, canonicalRouteId) => {
        const routeIds = Array.isArray(parentBooking.routeIds)
          ? parentBooking.routeIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
          : [];

        routeIds.forEach((routeId) => {
          if (routeId !== canonicalRouteId) delete next[routeId];
        });
        next[canonicalRouteId] = parentBooking;
      });

      return next;
}

export function useHotelSelectionsChangeMutation({
  setSelectedHotelBookings,
}: HotelSelectionsChangeMutationOptions) {
  return useCallback((selections: HotelSelectionChangeMap) => {
    setSelectedHotelBookings((previous) => mergeHotelSelections(previous, selections));
    console.log("Hotel selections updated from HotelList:", selections);
  }, [setSelectedHotelBookings]);
}

export default useHotelSelectionsChangeMutation;
