import { useMemo } from "react";
import type {
  ItineraryHotelDetailsResponse,
  ItineraryHotelRow,
  ItineraryHotelSelectionGroupState,
} from "../itinerary-details.types";

const isExplicitlySelectedHotel = (hotel: ItineraryHotelRow): boolean =>
  hotel.isSelected === true ||
  String(hotel.selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED' ||
  String(hotel.selection?.selectionOrigin || '').trim().toUpperCase() === 'USER_SELECTED';

/** Returns one clipboard row per route, preferring the user's selected hotel. */
export const buildClipboardHotelRowsForGroup = (
  hotels: ItineraryHotelRow[],
  groupType: number,
  selectionState?: ItineraryHotelSelectionGroupState,
  stayResults?: ItineraryHotelDetailsResponse["hotelTabs"][number]["stayResults"],
  routeMetadata?: NonNullable<ItineraryHotelDetailsResponse["hotelAvailability"]>["stayRoutes"],
  sharedInventory?: ItineraryHotelRow[],
): ItineraryHotelRow[] => {
  const text = (value: unknown): string =>
    String(value ?? "").trim();

  const grouped = new Map<number, ItineraryHotelRow[]>();

  hotels
    .filter(
      (hotel) =>
        Number(hotel.groupType) === Number(groupType),
    )
    .forEach((hotel) => {
      const routeId = Number(
        hotel.itineraryRouteId || 0,
      );

      const rows = grouped.get(routeId) || [];

      rows.push(hotel);
      grouped.set(routeId, rows);
    });

  const rows = Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, routeRows]) => {
      const selectedRows =
        routeRows.filter(isExplicitlySelectedHotel);

      const candidates =
        selectedRows.length > 0
          ? selectedRows
          : routeRows;

      return candidates.reduce(
        (best, current) =>
          Number(current.totalHotelCost || 0) +
            Number(current.totalHotelTaxAmount || 0) <
          Number(best.totalHotelCost || 0) +
            Number(best.totalHotelTaxAmount || 0)
            ? current
            : best,
      );
    });

  const stayByRouteId = new Map(
    (stayResults || []).flatMap((stay) =>
      (stay.routeIds || [stay.parentRouteId]).map(
        (routeId) =>
          [Number(routeId), stay] as const,
      ),
    ),
  );

  const routeById = new Map(
    (routeMetadata || []).map(
      (route) =>
        [Number(route.routeId), route] as const,
    ),
  );

  const destinationByRouteId = new Map<number, string>();

  for (const row of [...hotels, ...(sharedInventory || [])]) {
    const routeId = Number(
      row.itineraryRouteId || 0,
    );

    const destination = text(row.destination);

    if (
      routeId > 0 &&
      destination &&
      !destinationByRouteId.has(routeId)
    ) {
      destinationByRouteId.set(
        routeId,
        destination,
      );
    }
  }

  const normalizeExistingRow = (
    row: ItineraryHotelRow,
    fallbackDayNumber: number,
  ): ItineraryHotelRow => {
    const routeId = Number(
      row.itineraryRouteId || 0,
    );

    const route = routeById.get(routeId);
    const stay = stayByRouteId.get(routeId);

    const parsedDay = Number(
      String(row.day || "").match(
        /day\s*(\d+)/i,
      )?.[1] || 0,
    );

    /*
     * A route ID was previously capable of becoming the
     * clipboard day number, e.g. "Day 12762".
     *
     * Do not treat a value equal to the route ID as a
     * legitimate itinerary day.
     */
    const safeParsedDay =
      parsedDay > 0 && parsedDay !== routeId
        ? parsedDay
        : 0;

    const dayNumber = Number(
      route?.dayNumber ||
        row.dayNumber ||
        safeParsedDay ||
        fallbackDayNumber,
    );

    const date =
      text(route?.date) ||
      text(row.date);

    /*
     * Hotel stay metadata is authoritative.
     * Do not allow a stale/source-location value on the
     * hotel row to override Munnar/Madurai/Rameswaram.
     */
    const destination =
      text(route?.destination) ||
      text(stay?.destination) ||
      text(destinationByRouteId.get(routeId)) ||
      text(row.destination);

    return {
      ...row,
      destination,
      date,
      dayNumber,
      day: `Day ${dayNumber}${
        date ? ` | ${date}` : ""
      }`,
    };
  };

  /*
   * Even when selectionState is unavailable, normalize
   * the rows with authoritative hotel stay metadata.
   */
  if (!selectionState?.routes?.length) {
    return rows.map((row, index) =>
      normalizeExistingRow(row, index + 1),
    );
  }

  const normalizedRows = rows.map(
    (row, index) =>
      normalizeExistingRow(row, index + 1),
  );

  const rowByRouteId = new Map(
    normalizedRows.map((row) => [
      Number(row.itineraryRouteId),
      row,
    ]),
  );

  const orderedSelectionRoutes =
    selectionState.routes
      .slice()
      .sort(
        (a, b) =>
          text(a.routeDate).localeCompare(
            text(b.routeDate),
          ) ||
          Number(a.routeId) -
            Number(b.routeId),
      );

  return orderedSelectionRoutes.map(
    (selectionRoute, routeIndex) => {
      const routeId = Number(
        selectionRoute.routeId,
      );

      const existing =
        rowByRouteId.get(routeId);

      const route =
        routeById.get(routeId);

      const stay =
        stayByRouteId.get(routeId);

      const dayNumber = Number(
        route?.dayNumber ||
          existing?.dayNumber ||
          routeIndex + 1,
      );

      const date =
        text(route?.date) ||
        text(selectionRoute.routeDate) ||
        text(existing?.date);

      const destination =
        text(route?.destination) ||
        text(stay?.destination) ||
        text(
          destinationByRouteId.get(routeId),
        ) ||
        text(existing?.destination);

      const day = `Day ${dayNumber}${
        date ? ` | ${date}` : ""
      }`;

      if (existing) {
        return {
          ...existing,
          destination,
          date,
          day,
          dayNumber,
        };
      }

      const selected =
        selectionRoute.selected;

      const selectedHotelName = text(
        selected?.hotelName,
      );

      const selectedRoomType = text(
        selected?.roomType,
      );

      const selectedMealPlan = text(
        selected?.mealPlan,
      );

      const isAvailable =
        selectionRoute.selectionStatus !==
          "UNAVAILABLE" &&
        Boolean(selectedHotelName);

      return {
        groupType: Number(groupType),
        itineraryRouteId: routeId,
        routeIds: [routeId],
        stayKey:
          `clipboard-selection-` +
          `${groupType}-${routeId}`,

        day,
        dayNumber,
        date,
        destination,

        hotelId: Number(
          selected?.canonicalHotelId || 0,
        ),

        canonicalHotelId:
          selected?.canonicalHotelId ?? null,

        providerHotelCode:
          selected?.providerHotelCode ?? null,

        hotelName: isAvailable
          ? selectedHotelName
          : "No hotel available",

        category:
          selected?.category ?? "",

        roomType: isAvailable
          ? selectedRoomType
          : "",

        mealPlan: isAvailable
          ? selectedMealPlan
          : "",

        totalHotelCost: 0,
        totalHotelTaxAmount: 0,

        provider:
          selected?.provider || "external",

        isBookable: isAvailable,
        isSelectable: isAvailable,

        availabilityState: isAvailable
          ? "AVAILABLE"
          : "UNAVAILABLE",

        selectionStatus: isAvailable
          ? "AVAILABLE"
          : "UNAVAILABLE",
      } as ItineraryHotelRow;
    });
};

/** Derives one cheapest recommendation row per hotel group for clipboard/para views. */
export const useParaRecommendations = (hotelDetails: ItineraryHotelDetailsResponse | null) => useMemo(() => {
  if (!hotelDetails?.hotelTabs?.length) return [];
  return hotelDetails.hotelTabs.slice(0, 4).map((tab) => ({
    label: tab.label || `Recommended #${Number(tab.groupType)}`,
    groupType: Number(tab.groupType),
    tabLabel: tab.label,
    hotels: buildClipboardHotelRowsForGroup(
      hotelDetails.hotels,
      Number(tab.groupType),
      hotelDetails.hotelSelectionState?.find((state) => Number(state.groupType) === Number(tab.groupType)),
      tab.stayResults,
      hotelDetails.hotelAvailability?.stayRoutes,
      hotelDetails.hotelAvailability?.sharedHotelInventory,
    ),
  }));
}, [hotelDetails]);

