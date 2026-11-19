import { ItineraryService } from "@/services/itinerary";

type HoldGroupInput = Parameters<typeof ItineraryService.holdHotelGroup>[0];
type HoldRecord = Record<string, unknown>;

export type HoldPriceChange = {
  hotelName: string;
  selectionIds: number[];
  token: string;
  previousAmount: number;
  newAmount: number;
  currency: string;
};

export type ReviewHoldPrices = (changes: HoldPriceChange[]) => Promise<boolean>;

function readPriceChange(outcome: HoldRecord): HoldPriceChange | null {
  if (outcome.status !== "PRICE_APPROVAL_REQUIRED" || !Array.isArray(outcome.selectionIds)) return null;
  const approval = outcome.priceApproval as Partial<HoldPriceChange> | undefined;
  const selectionIds = outcome.selectionIds.filter((id): id is number => Number.isInteger(id) && id > 0);
  if (!selectionIds.length || typeof approval?.token !== "string"
    || typeof approval.previousAmount !== "number" || typeof approval.newAmount !== "number"
    || !Number.isFinite(approval.previousAmount) || !Number.isFinite(approval.newAmount)) return null;
  return {
    hotelName: String(outcome.hotelName || "VSR hotel"),
    selectionIds,
    token: approval.token,
    previousAmount: approval.previousAmount,
    newAmount: approval.newAmount,
    currency: /^[A-Z]{3}$/.test(approval.currency || "") ? approval.currency! : "INR",
  };
}

export async function holdGroupWithPriceApproval(data: HoldGroupInput, reviewPrices?: ReviewHoldPrices) {
  let request = data;
  const result = {
    requests: [] as HoldRecord[],
    outcomes: [] as HoldRecord[],
    contactRequired: 0,
    supplierBookingCalls: 0,
    cancelledPriceReview: false,
  };
  for (;;) {
    const response = await ItineraryService.holdHotelGroup(request) as HoldRecord;
    if (Array.isArray(response.requests)) result.requests.push(...response.requests);
    result.contactRequired += Number(response.contactRequired || 0);
    result.supplierBookingCalls += Number(response.supplierBookingCalls || 0);
    const changes: HoldPriceChange[] = [];
    for (const outcome of Array.isArray(response.outcomes) ? response.outcomes : []) {
      const change = readPriceChange(outcome);
      if (change && reviewPrices) changes.push(change);
      else result.outcomes.push(outcome);
    }
    if (!changes.length || !reviewPrices) return result;
    if (!await reviewPrices(changes)) {
      result.cancelledPriceReview = true;
      return result;
    }
    request = {
      ...data,
      hotelDetailsIds: [...new Set(changes.flatMap((change) => change.selectionIds))],
      tboHoldBookings: data.tboHoldBookings?.flatMap((booking) => {
        const change = changes.find((item) => item.selectionIds.some((id) => booking.hotelDetailsIds?.includes(id)));
        return change ? [{ ...booking, priceApprovalToken: change.token }] : [];
      }),
    };
  }
}
