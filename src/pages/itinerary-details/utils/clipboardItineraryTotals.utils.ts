type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export type ClipboardEntryTicket = {
  dayNumber: number;
  locationName: string;
  amount: number;
};

export const formatClipboardMoney = (value?: number | string | null): string => {
  const amount = Number(value || 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
};

export const formatClipboardMoneyWithSymbol = (value?: number | string | null): string =>
  `₹ ${formatClipboardMoney(value)}`;

export const getClipboardHotelPaxCount = (itinerary: unknown): number => {
  const plan = asRecord(itinerary);
  const costBreakdown = asRecord(plan.costBreakdown);
  const paxFromCostBreakdown = Number(costBreakdown.hotelPaxCount || 0);
  const paxFromItinerary = Number(plan.adults || 0) + Number(plan.children || 0);
  return Math.max(paxFromCostBreakdown || paxFromItinerary || 1, 1);
};

export const getActivityAmountFromItineraryDays = (daysValue: unknown): number => {
  const days = Array.isArray(daysValue) ? daysValue : [];
  return days.reduce<number>((total, dayValue) => {
    const day = asRecord(dayValue);
    const segments = Array.isArray(day.segments) ? day.segments : [];
    return total + segments.reduce<number>((dayTotal, segmentValue) => {
      const segment = asRecord(segmentValue);
      if (segment.type !== 'attraction') return dayTotal;
      const activities = Array.isArray(segment.activities) ? segment.activities : [];
      return dayTotal + activities.reduce<number>((sum, activityValue) => {
        return sum + Number(asRecord(activityValue).amount || 0);
      }, 0);
    }, 0);
  }, 0);
};

export const getEntryTicketBreakdownFromItineraryDays = (
  daysValue: unknown,
): ClipboardEntryTicket[] => {
  const grouped = new Map<string, ClipboardEntryTicket>();
  const days = Array.isArray(daysValue) ? daysValue : [];

  for (const dayValue of days) {
    const day = asRecord(dayValue);
    const dayNumber = Number(day.dayNumber || 0);
    const segments = Array.isArray(day.segments) ? day.segments : [];
    for (const segmentValue of segments) {
      const segment = asRecord(segmentValue);
      if (segment.type !== 'attraction') continue;
      const amount = Number(segment.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const locationName = String(segment.name || 'Sightseeing Location').trim() || 'Sightseeing Location';
      const key = `${dayNumber}|${locationName.toLowerCase()}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.amount += amount;
      } else {
        grouped.set(key, { dayNumber, locationName, amount });
      }
    }
  }

  return Array.from(grouped.values())
    .map((row) => ({ ...row, amount: Number(row.amount.toFixed(2)) }))
    .sort((a, b) => a.dayNumber !== b.dayNumber
      ? a.dayNumber - b.dayNumber
      : a.locationName.localeCompare(b.locationName));
};
