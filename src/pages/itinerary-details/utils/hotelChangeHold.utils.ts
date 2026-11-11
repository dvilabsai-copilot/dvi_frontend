type HotelHoldRequest = Record<string, unknown>;

const ACTIVE_HOLD_STATUSES = new Set([
  "CONTACT_REQUIRED",
  "REQUESTED",
  "CONFIRMATION_AWAITED",
  "BLOCKED",
  "HOLD",
  "WAITLISTED",
  "CONFIRMED",
  "HOTEL_CONFIRMED_PAYMENT_PENDING",
]);

/** Find a current hold tied to this stay; terminal history must not prompt removal. */
export const findActiveHotelHoldRequestForSelection = (
  requests: readonly HotelHoldRequest[],
  selectionIds: readonly number[],
): HotelHoldRequest | undefined => {
  const targetIds = new Set(selectionIds.map(Number).filter((id) => Number.isInteger(id) && id > 0));
  if (!targetIds.size) return undefined;

  return requests.find((request) => {
    const status = String(request.status || "").trim().toUpperCase();
    const rawIds = request.selectionIds ?? request.selection_ids;
    const ids = Array.isArray(rawIds) ? rawIds.map(Number) : [];
    return ACTIVE_HOLD_STATUSES.has(status) && ids.some((id) => targetIds.has(id));
  });
};
