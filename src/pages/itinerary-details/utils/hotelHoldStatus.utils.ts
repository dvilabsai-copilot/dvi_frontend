export const getDisplayHotelHoldStatus = (statusValue: unknown, paidConfirmedAt: unknown): string => {
  const status = String(statusValue || "").trim().toUpperCase();
  const paidAt = String(paidConfirmedAt || "").trim();
  return status === "CONFIRMED" && !paidAt
    ? "HOTEL_CONFIRMED_PAYMENT_PENDING"
    : status;
};

export const getDisplayHotelHoldLabel = (statusValue: unknown): string => {
  const status = String(statusValue || "").trim().toUpperCase();
  const labels: Record<string, string> = {
    CONTACT_REQUIRED: "Contact Required",
    REQUESTED: "Request Sent",
    CONFIRMATION_AWAITED: "Awaiting Confirmation",
    BLOCKED: "Blocked",
    HOLD: "HOLD",
    HOLD_EXPIRED: "Hold expired",
    WAITLISTED: "Waitlist",
    UNAVAILABLE: "Unavailable",
    CONFIRMED: "Confirmed",
    HOTEL_CONFIRMED_PAYMENT_PENDING: "Hotel confirmed · payment pending",
    CANCELLED: "Cancelled",
    EXPIRED: "Hold expired",
  };
  return labels[status] || String(statusValue || "");
};

export const getHotelReleaseEmailStatusLabel = (statusValue: unknown): string => {
  const status = String(statusValue || "").trim().toUpperCase();
  const labels: Record<string, string> = {
    PENDING: "Email queued",
    SENT: "Email sent · acknowledgement pending",
    FAILED: "Email delivery failed",
    MANUAL_REQUIRED: "Hotel email missing · staff follow-up required",
  };
  return labels[status] || "";
};

export const hasStaleHotelHoldForSelection = (
  selectedHotelDetailsIds: readonly number[],
  holdRequests: readonly Record<string, unknown>[],
  now = Date.now(),
  selectedHotels: readonly { hotelName: string; hotelDetailsIds: readonly number[] }[] = [],
): boolean => {
  const selectedIds = new Set(selectedHotelDetailsIds.map(Number).filter((id) => Number.isInteger(id) && id > 0));
  if (selectedIds.size === 0) return false;

  const selectedNamesById = new Map<number, Set<string>>();
  for (const hotel of selectedHotels) {
    const name = String(hotel.hotelName || "").trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!name) continue;
    for (const id of hotel.hotelDetailsIds) {
      const normalizedId = Number(id);
      if (!selectedIds.has(normalizedId)) continue;
      const names = selectedNamesById.get(normalizedId) || new Set<string>();
      names.add(name);
      selectedNamesById.set(normalizedId, names);
    }
  }

  const latestRequestBySelectionId = new Map<number, Record<string, unknown>>();
  for (const request of holdRequests) {
    const requestIds = request.selectionIds ?? request.selection_ids;
    if (!Array.isArray(requestIds)) continue;
    const status = String(request.status || "").trim().toUpperCase();
    if (status === "SUPERSEDED") continue;
    const requestId = Number(request.id || 0);
    const requestName = String(request.hotelName ?? request.hotel_name ?? "")
      .trim()
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    for (const rawId of requestIds) {
      const selectionId = Number(rawId);
      if (!selectedIds.has(selectionId)) continue;
      const selectedNames = selectedNamesById.get(selectionId);
      if (requestName && selectedNames?.size && !selectedNames.has(requestName)) continue;
      const previous = latestRequestBySelectionId.get(selectionId);
      if (!previous || requestId >= Number(previous.id || 0)) {
        latestRequestBySelectionId.set(selectionId, request);
      }
    }
  }

  return Array.from(latestRequestBySelectionId.values()).some((request) => {
    const paidAt = request.paidConfirmedAt ?? request.paid_confirmed_at;
    if (paidAt) return false;
    const status = String(request.status || "").trim().toUpperCase();
    if (["EXPIRED", "CANCELLED", "HOLD_EXPIRED"].includes(status)) return true;
    if (!["BLOCKED", "CONFIRMED", "HOLD"].includes(status)) return false;
    const cutoff = request.cutoffAt ?? request.cutoff_at ?? request.holdUntil ?? request.hold_until;
    const cutoffTime = cutoff ? new Date(String(cutoff)).getTime() : NaN;
    return Number.isFinite(cutoffTime) && cutoffTime <= now;
  });
};
