import { useMemo } from "react";

interface EntryTicketDay {
  dayNumber?: number;
  segments?: Array<{ type?: string; amount?: number | string | null; name?: string | null }>;
}

export interface EntryTicketSummaryRow {
  dayNumber: number;
  locationName: string;
  amount: number;
}

/** Derives location-level entry-ticket costs from attraction segments. */
export const useEntryTicketSummary = (days?: EntryTicketDay[] | null) => {
  const entryTicketBreakdownByLocation = useMemo(() => {
    const grouped = new Map<string, EntryTicketSummaryRow>();
    for (const day of days || []) {
      const dayNumber = Number(day?.dayNumber || 0);
      for (const segment of day?.segments || []) {
        if (segment.type !== "attraction") continue;
        const amount = Number(segment.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const locationName = String(segment.name || "Sightseeing Location").trim() || "Sightseeing Location";
        const key = `${dayNumber}|${locationName.toLowerCase()}`;
        const existing = grouped.get(key);
        if (existing) existing.amount += amount;
        else grouped.set(key, { dayNumber, locationName, amount });
      }
    }
    return Array.from(grouped.values())
      .map((row) => ({ ...row, amount: Number(row.amount.toFixed(2)) }))
      .sort((a, b) => a.dayNumber !== b.dayNumber ? a.dayNumber - b.dayNumber : a.locationName.localeCompare(b.locationName));
  }, [days]);

  const entryTicketLocationWiseTotal = useMemo(
    () => Number(entryTicketBreakdownByLocation.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
    [entryTicketBreakdownByLocation],
  );

  return { entryTicketBreakdownByLocation, entryTicketLocationWiseTotal };
};

