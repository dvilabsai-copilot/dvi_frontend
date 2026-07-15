import type { EntryTicketBreakdown } from '../itinerary-details.types';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export type ClipboardEntryTicket = EntryTicketBreakdown;

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
