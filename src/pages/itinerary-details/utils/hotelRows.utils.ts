import type { ItineraryHotelRow } from "../itinerary-details.types";

/** Removes duplicate hotel rows while preserving the first row for each route/stay identity. */
export function dedupeItineraryHotelRows(rows: ItineraryHotelRow[]): ItineraryHotelRow[] {
  const seen = new Set<string>();
  const unique: ItineraryHotelRow[] = [];
  rows.forEach((row) => {
    const key = [
      Number(row.groupType || 0),
      Number(row.itineraryRouteId || 0),
      String(row.date || row.checkInDate || ""),
      String(row.hotelCode || ""),
      String(row.bookingCode || ""),
      String(row.roomType || ""),
      String(row.hotelName || ""),
    ].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(row);
  });
  return unique;
}
