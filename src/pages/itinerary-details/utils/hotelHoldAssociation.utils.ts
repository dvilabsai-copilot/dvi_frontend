type HoldRequest = Record<string, unknown>;

export type HotelHoldAssociation = {
  statusRequest?: HoldRequest;
  previousCancelledRequest?: HoldRequest;
};

const normalizeHotelName = (value: unknown): string => String(value || "")
  .trim()
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const getSelectionIds = (request: HoldRequest): number[] => {
  const ids = request.selectionIds ?? request.selection_ids;
  return Array.isArray(ids) ? ids.map(Number).filter((id) => Number.isInteger(id) && id > 0) : [];
};

const getRequestHotelName = (request: HoldRequest): string => String(request.hotelName ?? request.hotel_name ?? "");
const isCancelledOfflineHold = (request: HoldRequest): boolean => (
  String(request.status || "").trim().toUpperCase() === "CANCELLED"
  && (
    normalizeProvider(request.provider) === "offline"
    || String(request.confirmationChannel ?? request.confirmation_channel ?? "").trim().toUpperCase() === "OFFLINE_HOLD"
  )
);
const normalizeProvider = (value: unknown): string => {
  const provider = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (provider === "vsr" || provider === "tbo") return "tbo";
  if (["axis", "ax", "axisroom", "axisrooms"].includes(provider)) return "axisrooms";
  if (["offline", "manualapproval"].includes(provider)) return "offline";
  return provider;
};

/**
 * Hotel changes and removed offline holds may reuse the itinerary detail row
 * ID. A cancelled offline hold is complete when the user confirms removal in
 * the hotelier-contact dialog, so it must not block placing a new hold.
 */
export const resolveHotelHoldAssociation = (
  requests: readonly HoldRequest[],
  hotelName: string,
  hotelDetailsIds: readonly number[],
  currentProvider?: string,
): HotelHoldAssociation => {
  const currentName = normalizeHotelName(hotelName);
  const normalizedCurrentProvider = normalizeProvider(currentProvider);
  const currentIds = new Set(hotelDetailsIds.map(Number).filter((id) => Number.isInteger(id) && id > 0));
  const related = requests.filter((request) => {
    const requestIds = getSelectionIds(request);
    const idMatch = requestIds.some((id) => currentIds.has(id));
    const nameMatch = normalizeHotelName(getRequestHotelName(request)) === currentName;
    return idMatch || ((!currentIds.size || !requestIds.length) && nameMatch);
  });

  const currentHotelRequests = related
    .filter((request) => {
      const status = String(request.status || "").trim().toUpperCase();
      if (status === "SUPERSEDED") return false;
      if (isCancelledOfflineHold(request) || (status === "CANCELLED" && (
        request.releaseConfirmedByHotelier === true
        || String(request.releaseStatus ?? request.release_status ?? "").trim().toUpperCase() === "ACKNOWLEDGED"
      ))) return false;
      const requestName = normalizeHotelName(getRequestHotelName(request));
      const requestProvider = normalizeProvider(request.provider);
      const sameHotel = !requestName || !currentName || requestName === currentName;
      const sameProvider = !normalizedCurrentProvider || !requestProvider || requestProvider === normalizedCurrentProvider;
      return sameHotel && sameProvider;
    });
  let statusRequest = currentHotelRequests
    .sort((left, right) => Number(String(left.status || "").toUpperCase() === "CANCELLED")
      - Number(String(right.status || "").toUpperCase() === "CANCELLED"))[0];

  const previousCancelledRequest = related
    .filter((request) => String(request.status || "").trim().toUpperCase() === "CANCELLED")
    .filter((request) => {
      const requestName = normalizeHotelName(getRequestHotelName(request));
      const hotelChanged = Boolean(requestName && currentName && requestName !== currentName);
      const releaseConfirmed = request.releaseConfirmedByHotelier === true
        || String(request.releaseStatus ?? request.release_status ?? "").trim().toUpperCase() === "ACKNOWLEDGED";
      return hotelChanged || (releaseConfirmed && !isCancelledOfflineHold(request));
    })
    .sort((left, right) => {
      const timestamp = (request: HoldRequest) => Date.parse(String(
        request.cancelledAt ?? request.cancelled_at ?? request.updatedAt ?? request.updated_at
        ?? request.createdAt ?? request.created_at ?? "",
      ));
      const leftTimestamp = timestamp(left);
      const rightTimestamp = timestamp(right);
      if (Number.isFinite(leftTimestamp) && Number.isFinite(rightTimestamp)) return rightTimestamp - leftTimestamp;
      return Number(right.id || 0) - Number(left.id || 0);
    })[0];

  return { statusRequest, previousCancelledRequest };
};
