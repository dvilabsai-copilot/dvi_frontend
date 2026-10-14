import type { ItineraryHotelRow } from "../itinerary-details.types";

export type ClipboardHotelRowsByGroup = Record<
  number,
  ItineraryHotelRow[]
>;

const hotelRowsByQuote = new Map<
  string,
  ClipboardHotelRowsByGroup
>();

export function publishClipboardHotelListRows(
  quoteId: string,
  rows: ClipboardHotelRowsByGroup,
): () => void {
  const key = String(quoteId || "").trim();

  if (!key) return () => {};

  hotelRowsByQuote.set(key, rows);

  return () => {
    // Do not remove a newer snapshot for the same quote.
    if (hotelRowsByQuote.get(key) === rows) {
      hotelRowsByQuote.delete(key);
    }
  };
}

export function getClipboardHotelListRows(
  quoteId: string,
): ClipboardHotelRowsByGroup | null {
  return (
    hotelRowsByQuote.get(String(quoteId || "").trim()) ??
    null
  );
}