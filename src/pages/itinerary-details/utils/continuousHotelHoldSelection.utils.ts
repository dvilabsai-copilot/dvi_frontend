import { getHotelHoldEligibility, normalizeHoldProvider } from "./hotelHoldEligibility.utils";

type ContinuousHotelRow = {
  hotel: string;
  routeDate?: string;
  hotelDetailsIds?: readonly number[];
  hotelEntry?: Record<string, unknown>;
};

type HoldMetadataRow = ContinuousHotelRow & {
  status: string;
  holdUntil?: string;
  holdRequestId?: number;
  cutoffAt?: string;
  maxCutoffAt?: string;
  canExtendHold?: boolean;
  canResendHold?: boolean;
  releaseStatus?: string;
  releaseEmailStatus?: string;
  previousCancelledHotelName?: string;
  canAcknowledgeRelease?: boolean;
  holdProvider?: string;
  holdConfirmationChannel?: string;
  paidConfirmedAt?: string;
};

const normalizeHotel = (value: unknown): string => String(value || "")
  .trim()
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const dateNumber = (value: unknown): number | null => {
  const date = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp / 86_400_000 : null;
};

/**
 * Return persisted hotel-detail IDs for the consecutive nights of the same
 * property/provider. Hotel-blocking groups those rows into one continuous stay.
 */
export const resolveContinuousHotelHoldSelectionIds = <T extends ContinuousHotelRow>(
  current: T,
  rows: readonly T[],
): number[] => {
  const currentDate = dateNumber(current.routeDate);
  const currentHotel = normalizeHotel(current.hotel);
  const currentProvider = normalizeHoldProvider(getHotelHoldEligibility(current.hotelEntry || {}).provider);
  if (currentDate === null || !currentHotel || !currentProvider) {
    return Array.from(new Set((current.hotelDetailsIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  }

  const candidates = rows.flatMap((row) => {
    if (normalizeHotel(row.hotel) !== currentHotel) return [];
    const provider = normalizeHoldProvider(getHotelHoldEligibility(row.hotelEntry || {}).provider);
    const date = dateNumber(row.routeDate);
    if (provider !== currentProvider || date === null) return [];
    const ids = (row.hotelDetailsIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0);
    return ids.length ? [{ date, ids }] : [];
  });

  const dates = new Set(candidates.map(({ date }) => date));
  if (!dates.has(currentDate)) {
    return Array.from(new Set((current.hotelDetailsIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  }

  const continuousDates = new Set([currentDate]);
  for (let date = currentDate - 1; dates.has(date); date -= 1) continuousDates.add(date);
  for (let date = currentDate + 1; dates.has(date); date += 1) continuousDates.add(date);

  return Array.from(new Set(candidates
    .filter(({ date }) => continuousDates.has(date))
    .flatMap(({ ids }) => ids)));
};

const activeHoldStatuses = new Set([
  "CONTACT_REQUIRED",
  "REQUESTED",
  "CONFIRMATION_AWAITED",
  "BLOCKED",
  "HOLD",
  "HOTEL_CONFIRMED_PAYMENT_PENDING",
]);

/** Apply one active hold's status to other rows in the same continuous stay. */
export const propagateContinuousHotelHoldStatus = <T extends HoldMetadataRow>(rows: readonly T[]): T[] => (
  rows.map((row) => {
    if (row.holdRequestId || !["Not Started", "Available"].includes(row.status)) return row;
    const rowIds = new Set((row.hotelDetailsIds || []).map(Number));
    if (rowIds.size === 0) return row;
    const continuousIds = new Set(resolveContinuousHotelHoldSelectionIds(row, rows));
    const activeHold = rows.find((candidate) => (
      candidate.holdRequestId
      && activeHoldStatuses.has(String(candidate.status || "").toUpperCase())
      && (candidate.hotelDetailsIds || []).some((id) => continuousIds.has(Number(id)) && !rowIds.has(Number(id)))
    ));
    if (!activeHold) return row;
    return {
      ...row,
      status: activeHold.status,
      holdUntil: activeHold.holdUntil,
      holdRequestId: activeHold.holdRequestId,
      cutoffAt: activeHold.cutoffAt,
      maxCutoffAt: activeHold.maxCutoffAt,
      canExtendHold: activeHold.canExtendHold,
      canResendHold: activeHold.canResendHold,
      releaseStatus: activeHold.releaseStatus,
      releaseEmailStatus: activeHold.releaseEmailStatus,
      previousCancelledHotelName: activeHold.previousCancelledHotelName,
      canAcknowledgeRelease: activeHold.canAcknowledgeRelease,
      holdProvider: activeHold.holdProvider,
      holdConfirmationChannel: activeHold.holdConfirmationChannel,
      paidConfirmedAt: activeHold.paidConfirmedAt,
    };
  })
);
