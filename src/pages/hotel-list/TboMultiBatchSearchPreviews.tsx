import { useEffect, useRef, useState } from "react";
import { ItineraryService } from "@/services/itinerary";
import type { HotelListProps } from "./hotelList.types";
import { getVerifiedTboSupplierOffer } from "./tboSupplierBatchOffer.util";
import {
  canChooseTboStay,
  getTboStayBlocks, shouldShowUnselectedTboStays, unpricedUnselectedTboStayRoutes,
} from "./tboMultiDestinationStay.util";

type PreviewProps = Pick<
  HotelListProps,
  "quoteId" | "roomCount" | "hotels" | "hotelTabs" | "hotelIndex" | "hotelAvailability" | "hotelSelectionState"
> & {
  readOnly?: boolean;
  activeGroupType?: number | null;
  /** Search inventory is shared; a draft group may have no search cache yet. */
  sourceSearchGroupType?: number;
  onRefreshAvailability?: () => Promise<unknown>;
  onChooseStay?: (selected: {
    routeId: number; hotelCode: string; hotelName: string;
    roomType: string; mealPlan: string; checkInDate: string;
  }) => Promise<void>;
};
type HotelRow = HotelListProps["hotels"][number];
type DetailedRow = HotelRow & { __requestedStayRouteId: number };
const shortDate = (date: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
};

/**
 * Search results for 7–25 rooms in the same tabular hotel-list layout.
 * These are supplier search offers, NOT draft selections or confirmed bookings.
 * The ordinary HotelListTable remains unchanged for 1–6 rooms.
 */
export function TboMultiBatchSearchPreviews({
  quoteId, roomCount, hotels, hotelTabs, hotelIndex, hotelAvailability, hotelSelectionState = [],
  activeGroupType, sourceSearchGroupType, readOnly, onChooseStay, onRefreshAvailability,
}: PreviewProps) {
  const requestedRooms = Number(roomCount || 0);
  const selectedGroup = Number(activeGroupType || hotelTabs[0]?.groupType || 1);
  const inventorySourceGroup = Number(sourceSearchGroupType || selectedGroup);
  const allBlocks = getTboStayBlocks(
    hotelAvailability?.stayRoutes || [], hotelSelectionState || [], selectedGroup,
  );
  const stayBlocks = allBlocks.filter((block) => block.selectionStatus !== "COMPLETE" || block.replaceableAutoOffline);
  // A successful selection can change availabilityState from FRESH to
  // NOT_CHECKED/PARTIAL after reloading the itinerary. That must not hide the
  // *other* destination's supplier Hotel List. Saved selections are never
  // treated as supplier search offers.
  const showSearchRows = shouldShowUnselectedTboStays(requestedRooms, Boolean(readOnly), allBlocks);
  const stayRouteKey = stayBlocks.map((block) => block.firstRouteId).join(",");
  const cacheKey = `${quoteId}:${selectedGroup}:${inventorySourceGroup}:${stayRouteKey}:${String(hotelAvailability?.searchRunId || "")}`;

  const [detailedRows, setDetailedRows] = useState<DetailedRow[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const [cacheLoadedKey, setCacheLoadedKey] = useState("");
  const [isRecoveringAvailability, setIsRecoveringAvailability] = useState(false);
  const recoveryAttempts = useRef<Set<string>>(new Set());
  const [choosingKey, setChoosingKey] = useState<string | null>(null);
  const [chooseError, setChooseError] = useState<string | null>(null);

  useEffect(() => {
    if (!showSearchRows || !quoteId || !stayRouteKey) {
      setDetailedRows([]);
      setCacheLoadedKey("");
      setIsLoadingDetails(false);
      return;
    }
    let active = true;
    setIsLoadingDetails(true);
    setCacheLoadedKey("");
    setDetailsError(false);
    const routeIds = stayRouteKey.split(",").map(Number).filter((routeId) => routeId > 0);
    void Promise.all(routeIds.map(async (routeId) => {
      const result = await ItineraryService.getPersistedHotelDetails(quoteId, 1, 100, inventorySourceGroup, routeId, true);
      return (Array.isArray(result.hotels) ? result.hotels : []).map((hotel) => ({
        ...hotel,
        __requestedStayRouteId: routeId,
      }));
    }))
      .then((groups) => { if (active) setDetailedRows(groups.flat()); })
      .catch(() => { if (active) { setDetailedRows([]); setDetailsError(true); } })
      .finally(() => { if (active) { setIsLoadingDetails(false); setCacheLoadedKey(cacheKey); } });
    return () => { active = false; };
  }, [showSearchRows, quoteId, selectedGroup, inventorySourceGroup, stayRouteKey, hotelAvailability?.searchRunId]);

  // Read the persisted cache for *each* unsaved destination first. If the
  // selected Mangalore stay left Udupi without a retained supplier offer, do
  // one bounded, ordinary availability check. Do not reset hotel selections,
  // fabricate rates, or keep looping if a supplier has no matching inventory.
  const verifiedStayRouteIds = stayBlocks.filter((block) => {
    const candidates = [
      ...hotels.filter((row) => block.routeIds.includes(Number(row.itineraryRouteId || 0))),
      ...detailedRows.filter((row) => row.__requestedStayRouteId === block.firstRouteId),
    ];
    return candidates.some((row) => String(row.provider || "").toLowerCase() === "tbo" &&
      Boolean(getVerifiedTboSupplierOffer(row, requestedRooms)));
  }).map((block) => block.firstRouteId);
  const missingStayRoutes = unpricedUnselectedTboStayRoutes(stayBlocks, verifiedStayRouteIds);
  const recoveryKey = `dvi-tbo-multidest-v2:${quoteId}:${selectedGroup}:${stayRouteKey}:` +
    allBlocks.map((block) => `${block.firstRouteId}:${block.selectionStatus}`).join("|");

  useEffect(() => {
    if (!showSearchRows || !onRefreshAvailability || !quoteId ||
        isLoadingDetails || cacheLoadedKey !== cacheKey || detailsError ||
        missingStayRoutes.length === 0) return;
    if (recoveryAttempts.current.has(recoveryKey)) return;
    // A session guard survives itinerary re-mounts after selection/reload.
    // The user can still click Check Availability again explicitly.
    try {
      if (window.sessionStorage.getItem(recoveryKey)) return;
      window.sessionStorage.setItem(recoveryKey, "attempted");
    } catch { /* Private mode can disable storage; the ref guard still works. */ }
    recoveryAttempts.current.add(recoveryKey);
    setIsRecoveringAvailability(true);
    void onRefreshAvailability().catch(() => {
      setDetailsError(true);
    }).finally(() => { setIsRecoveringAvailability(false); });
  }, [showSearchRows, onRefreshAvailability, quoteId, isLoadingDetails,
    cacheLoadedKey, cacheKey, detailsError, missingStayRoutes.join(","), recoveryKey]);

  if (!showSearchRows || stayBlocks.length === 0) return null;

  const supplierBatchSizes = Array.from(
    { length: Math.ceil(requestedRooms / 6) },
    (_, index) => Math.min(6, requestedRooms - index * 6),
  );

  return (
    <section aria-label="VSR/TBO hotel search details" className="mb-4 rounded-lg border border-slate-300 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">HOTEL LIST — {requestedRooms} rooms</h3>
        <span className="text-xs font-medium text-slate-600">VSR / TBO · {supplierBatchSizes.join(" + ")} supplier rooms</span>
      </div>
      {isLoadingDetails && <p className="mb-2 text-sm">Loading saved supplier room rates for each unselected destination…</p>}
      {isRecoveringAvailability && <p role="status" className="mb-2 text-sm text-amber-800">The selected hotel is preserved. Refreshing supplier offers for the remaining destination(s)…</p>}
      {detailsError && <p className="mb-2 text-sm text-amber-700">Saved supplier rate details unavailable. Refresh hotel availability.</p>}
      {stayBlocks.map((block) => {
        // One logical property per stay, regardless of how many supplier batches
        // and itinerary day/group projections were returned by the API.
        // Do NOT use a catalogue-only entry as evidence that all rooms are bookable.
        const candidateRows = [
          ...hotels.filter((row) =>
            block.routeIds.includes(Number(row.itineraryRouteId || 0)),
          ),
          ...detailedRows.filter((row) =>
            Number(row.__requestedStayRouteId) === block.firstRouteId,
          ),
        ].filter((row) => String(row.provider || "").toLowerCase() === "tbo");

        const hotelMap = new Map<string, { hotelCode: string; hotelName: string }>();
        // Show every discovered property, including one that failed the
        // complete 6+N supplier-rate verification. It remains unselectable.
        for (const row of hotelIndex || []) {
          if (
            String(row.provider || "").toLowerCase() !== "tbo" ||
            Number(row.groupType || 1) !== 1 ||
            Number(row.routeId || 0) !== block.firstRouteId
          ) continue;
          const code = String(row.hotelCode || "").trim();
          const name = String(row.hotelName || code).trim();
          if (code && !hotelMap.has(code)) {
            hotelMap.set(code, { hotelCode: code, hotelName: name });
          }
        }
        // API versions without hotelIndex still show genuine rate candidates.
        for (const row of candidateRows) {
          const code = String(row.hotelCode || "").trim();
          const name = String(row.hotelName || code).trim();
          if (code && !hotelMap.has(code)) {
            hotelMap.set(code, { hotelCode: code, hotelName: name });
          }
        }

        const rows = Array.from(hotelMap.values()).flatMap((property) => {
          const options = new Map<string, {
            roomType: string;
            mealPlan: string;
            fare: number | null;
            facilities: string[];
          }>();
          for (const candidate of candidateRows) {
            if (String(candidate.hotelCode || "").trim() !== property.hotelCode) continue;
            const supplierOffer = getVerifiedTboSupplierOffer(candidate, requestedRooms);
            const fare = supplierOffer?.fullStayFare ?? null;
            if (fare === null || !supplierOffer) continue;
            const roomType = supplierOffer.roomType;
            // The itinerary preview can contain a synthesized CP/MAP fallback
            // while each actual supplier BookingCode is EP (Room_Only).
            // Never send the fallback label to server supplier revalidation.
            const mealPlan = supplierOffer.mealPlan;
            const extra = candidate as unknown as { facilities?: unknown };
            const facilities = Array.isArray(extra.facilities)
              ? extra.facilities.filter((item: unknown): item is string =>
                  typeof item === "string" && item.trim().length > 0,
                )
              : [];
            const key = `${roomType}|${mealPlan}`;
            const previous = options.get(key);
            if (!previous || previous.fare === null || fare < previous.fare) {
              options.set(key, { roomType, mealPlan, fare, facilities });
            }
          }
          if (options.size === 0) {
            return [{ ...property, roomType: "", mealPlan: "", fare: null, facilities: [] as string[] }];
          }
          return Array.from(options.values()).map((option) => ({ ...property, ...option }));
        });
        const verifiedCount = rows.filter((row) => row.fare !== null).length;
        return (
          <div key={block.firstRouteId} id={"vsr-rates-" + block.firstRouteId} className="mb-4 scroll-mt-4 last:mb-0">
            {block.replaceableAutoOffline && (
              <p className="mb-2 text-xs text-slate-600">Choose a VSR rate to replace the auto-selected offline hotel for this stay.</p>
            )}
            {block.selectionStatus === "PARTIAL" && (
              <p role="alert" className="mb-2 text-sm text-red-700">
                Only some nights of this stay are selected. Reconcile the saved selection before choosing another hotel; no supplier booking is permitted here.
              </p>
            )}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-slate-700">
              <span>{block.destination} · {shortDate(block.checkInDate)} – {shortDate(block.checkOutDate)} · {block.routeIds.length} night(s)</span>
              <span className="text-xs text-slate-500">{hotelMap.size} hotels · {verifiedCount} complete room offers</span>
            </div>
            {!isLoadingDetails && verifiedCount === 0 && (
              <div className="mb-2 text-xs text-amber-800">
                No complete supplier batch offer is retained for this destination. This does not prove that hotels are sold out.
                {isRecoveringAvailability ? " An availability check is running." : " You can recheck without resetting the selected hotel."}
                {onRefreshAvailability && (
                  <button type="button" className="ml-2 underline" onClick={() => void onRefreshAvailability()}>
                    Check Availability
                  </button>
                )}
              </div>
            )}
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[740px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th scope="col" className="px-3 py-2">Hotel</th>
                    <th scope="col" className="px-3 py-2">Room type / facilities</th>
                    <th scope="col" className="px-3 py-2">Meal plan</th>
                    <th scope="col" className="px-3 py-2">Rooms</th>
                    <th scope="col" className="px-3 py-2">Supplier search fare</th>
                    <th scope="col" className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row, index) => (
                    <tr key={`${block.firstRouteId}-${row.hotelCode}-${row.roomType}-${row.mealPlan}-${index}`}>
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-slate-900">{row.hotelName}</div>
                        <div className="text-xs text-slate-500">VSR · Hotel {row.hotelCode}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div>{row.roomType || "Room rate not verified for all requested rooms"}</div>
                        {row.facilities.length > 0 && (
                          <div className="mt-1 text-xs text-slate-500">{row.facilities.slice(0, 3).join(" · ")}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">{row.mealPlan === "EP" ? "EP · Room only" : row.mealPlan || "—"}</td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">{supplierBatchSizes.join(" + ")}</td>
                      <td className="px-3 py-3 align-top whitespace-nowrap font-medium">
                        {row.fare !== null
                          ? `₹${row.fare.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "Not verified"}
                        <div className="text-xs font-normal text-slate-500">{row.fare !== null ? "Whole stay · not quotation total" : "No complete matching supplier-batch fare"}</div>
                      </td>
                      <td className="px-3 py-3 align-top text-amber-800">
                        {row.fare !== null ? "All supplier batches found · PreBook required" : "Room availability unverified"}
                        {row.fare !== null && onChooseStay && !readOnly && canChooseTboStay(block) && (
                          <button
                            type="button"
                            className="mt-2 block rounded border border-violet-500 px-3 py-1 text-xs font-semibold text-violet-800 disabled:opacity-50"
                            disabled={choosingKey !== null}
                            onClick={async () => {
                              const key = `${block.firstRouteId}:${row.hotelCode}:${row.roomType}:${row.mealPlan}`;
                              if (row.mealPlan.toUpperCase() === "EP" &&
                                  !window.confirm(
                                    "TBO is offering ROOM ONLY (EP) for all rooms. " +
                                    "Breakfast is NOT included in the supplier rate, even if the itinerary requested CP. " +
                                    "Choose this room-only rate and exclude breakfast from this hotel selection?"
                                  )) return;
                              setChoosingKey(key);
                              setChooseError(null);
                              try {
                                await onChooseStay({ routeId: block.firstRouteId,
                                  hotelCode: row.hotelCode, hotelName: row.hotelName,
                                  roomType: row.roomType, mealPlan: row.mealPlan,
                                  checkInDate: block.checkInDate });
                              } catch (error) {
                                setChooseError(error instanceof Error ? error.message : "Hotel selection failed. Refresh supplier rates.");
                              } finally { setChoosingKey(null); }
                            }}
                          >
                            {choosingKey === `${block.firstRouteId}:${row.hotelCode}:${row.roomType}:${row.mealPlan}`
                              ? "Validating…" : row.mealPlan.toUpperCase() === "EP" ? "Choose room-only rate" : "Choose this hotel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && !isLoadingDetails && (
                    <tr><td colSpan={6} className="px-3 py-3 text-amber-800">
                      No complete supplier offers are available in the retained search snapshot for this stay.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {chooseError && <p role="alert" className="mt-2 text-sm text-red-700">{chooseError}</p>}
      <p className="mt-2 text-xs text-amber-800">
        These are actual supplier batch meal plans, not synthesized CP/MAP labels. EP means room-only:
        breakfast is not included. Search fares are estimates, not reservations. Choose validates the
        complete same-hotel stay and saves every supplier batch. PreBook and final supplier
        confirmation must still succeed separately.
      </p>
    </section>
  );
}
