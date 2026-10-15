/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { SharedDatePicker } from "@/components/SharedDatePicker";
import {
  DEFAULT_OFFLINE_GST_PERCENTAGE,
  DEFAULT_OFFLINE_GST_TYPE,
} from "./priceBook.utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const parseYmdDate = (value: string): Date | undefined => {
  const [year, month, day] = String(value || "")
    .split("-")
    .map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const formatYmdDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const OFFLINE_GST_PERCENTAGE_OPTIONS = ["0", "5", "12", "18", "28"] as const;

const resolveOfflineGstPercentage = (draftValue: unknown, savedValue: unknown): string => {
  const draft = String(draftValue ?? "").trim();
  const saved = String(savedValue ?? "").trim();
  const candidate = draft || saved;
  return OFFLINE_GST_PERCENTAGE_OPTIONS.includes(candidate as (typeof OFFLINE_GST_PERCENTAGE_OPTIONS)[number])
    ? candidate
    : DEFAULT_OFFLINE_GST_PERCENTAGE;
};

export function PriceBookStepView({ context }: { context: Record<string, any> }) {
  const [selectedRangeRatePlan, setSelectedRangeRatePlan] = useState("ALL");
  const [dateAlertOpen, setDateAlertOpen] = useState(false);
  const {
    OCCUPANCY_FIELDS,
    amenitiesEndDate,
    amenitiesEndRef,
    amenitiesError,
    amenitiesRangeDates,
    amenitiesRangeRows,
    amenitiesStartDate,
    amenitiesStartRef,
    amenitiesSuccess,
    amenityCharges,
    amenityMut,
    availEndDate,
    availEndRef,
    availError,
    availFreeRooms,
    availMut,
    availRoomId,
    availSelectedRoom,
    availStartDate,
    availStartRef,
    availSuccess,
    availViewByDate,
    availViewDates,
    breakfastCost,
    canLoadAmenitiesRangeView,
    canLoadAvailView,
    canLoadMealRangeView,
    canLoadRangeView,
    dinnerCost,
    formatCurrency,
    formatDateLabel,
    getOfflineRoomDraft,
    getRoomOccupancyDraft,
    hotelDetailsError,
    hotelDetailsMut,
    hotelDetailsSuccess,
    isOfflineHotel,
    hotelMargin,
    hotelMarginGstPercentage,
    hotelMarginGstType,
    lunchCost,
    mealEndDate,
    mealEndRef,
    mealError,
    mealMut,
    mealRangeDates,
    mealRangeRows,
    mealStartDate,
    mealStartRef,
    mealSuccess,
    normalizedAvailEnd,
    normalizedAvailStart,
    occupancyGridRows,
    rangeSummary,
    renderAmenityCell,
    renderMealCell,
    renderedRangeDates,
    roomDateValidationMessage,
    roomDropdownLabel,
    roomEndDate,
    roomEndDateError,
    roomEndRef,
    roomError,
    roomMut,
    roomRatePlansByRoom,
    roomStartDate,
    roomStartDateError,
    roomStartRef,
    roomSuccess,
    selectedRoomIds,
    setAmenitiesEndDate,
    setAmenitiesError,
    setAmenitiesStartDate,
    setAmenitiesSuccess,
    setAmenityCharges,
    setAvailEndDate,
    setAvailError,
    setAvailFreeRooms,
    setAvailRoomId,
    setAvailStartDate,
    setAvailSuccess,
    setBreakfastCost,
    setDinnerCost,
    setHotelDetailsError,
    setHotelDetailsSuccess,
    setHotelMargin,
    setHotelMarginGstPercentage,
    setHotelMarginGstType,
    setLunchCost,
    setMealEndDate,
    setMealError,
    setMealStartDate,
    setMealSuccess,
    setOccupancyDrafts,
    setOfflineRoomField,
    setRoomDateValidationMessage,
    setRoomEndDate,
    setRoomEndDateError,
    setRoomError,
    setRoomField,
    setRoomStartDate,
    setRoomStartDateError,
    setRoomSuccess,
    setSelectedRoomIds,
    stickyBodyBase,
    stickyHeaderBase,
    toMaybeNum,
    uiErrorMessage,
    validateAmenitiesSection,
    validateMealSection,
    yn,
    amenityOptions,
    refetchRangeView,
    rooms,
    roomRatePlansLoading,
    refetchAvailView,
    onPrev,
    onNext,
  } = context;

  const bulkUpdateButtonRef = useRef<HTMLButtonElement | null>(null);
  const handleRoomPriceFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== "NumpadEnter") return;
    event.preventDefault();

    const rStart = roomStartDate || roomStartRef.current?.value || "";
    const rEnd = roomEndDate || roomEndRef.current?.value || "";

    if (!rStart || !rEnd) {
      setDateAlertOpen(true);
      return;
    }

    bulkUpdateButtonRef.current?.click();
  };

  const roomHasEnteredPrice = useCallback(
    (roomId: number) => {
      if (isOfflineHotel) {
        return [
          "ROOM_PRICE",
          "EXTRABED",
          "CHILD_WITH_BED",
          "CHILD_WITHOUT_BED",
        ].some(
          (field) => String(getOfflineRoomDraft(roomId)[field] ?? "").trim() !== "",
        );
      }

      return (roomRatePlansByRoom[roomId] || []).some((plan: any) =>
        OCCUPANCY_FIELDS.some(
          (occupancyKey: string) =>
            String(
              getRoomOccupancyDraft(roomId, plan.rateplanId)[occupancyKey] ?? "",
            ).trim() !== "",
        ),
      );
    },
    [
      OCCUPANCY_FIELDS,
      getOfflineRoomDraft,
      getRoomOccupancyDraft,
      isOfflineHotel,
      roomRatePlansByRoom,
    ],
  );

  const effectiveSelectedRoomIds = useMemo(() => {
    const autoSelectedRoomIds = rooms
      .map((room: any) => Number(room.room_ID))
      .filter((roomId: number) => roomHasEnteredPrice(roomId));

    return Array.from(new Set([...selectedRoomIds, ...autoSelectedRoomIds]));
  }, [roomHasEnteredPrice, rooms, selectedRoomIds]);

  const bulkSelectableRoomIds = rooms
    .filter(
      (room: any) =>
        isOfflineHotel || (
          roomRatePlansByRoom[
            Number(room.room_ID)
          ] || []
        ).length > 0
    )
    .map((room: any) => Number(room.room_ID));

  const allBulkRoomsSelected =
    bulkSelectableRoomIds.length > 0 &&
    bulkSelectableRoomIds.every((roomId: number) =>
      effectiveSelectedRoomIds.includes(roomId)
    );
  const rangeRatePlanLabel = useCallback(
    (row: any) => {
      if (isOfflineHotel) return "OFFLINE";
      return (
        roomRatePlansByRoom[Number(row.roomId)]?.find(
          (plan: any) => plan.rateplanId === String(row.rateplanId),
        )?.ratePlanCode || row.rateplanId || "N/A"
      );
    },
    [isOfflineHotel, roomRatePlansByRoom],
  );
  const rangeRatePlanOptions = useMemo(() => {
    const options = new Map<string, string>();

    occupancyGridRows.forEach((row: any) => {
      const rateplanId = String(row.rateplanId || "").trim();
      if (!rateplanId) return;
      options.set(rateplanId, rangeRatePlanLabel(row));
    });

    return Array.from(options.entries()).sort(([, left], [, right]) =>
      left.localeCompare(right),
    );
  }, [occupancyGridRows, rangeRatePlanLabel]);
  const filteredOccupancyGridRows = useMemo(
    () =>
      selectedRangeRatePlan === "ALL"
        ? occupancyGridRows
        : occupancyGridRows.filter(
            (row: any) => String(row.rateplanId || "").trim() === selectedRangeRatePlan,
          ),
    [occupancyGridRows, selectedRangeRatePlan],
  );

  useEffect(() => {
    if (
      selectedRangeRatePlan !== "ALL" &&
      !rangeRatePlanOptions.some(([rateplanId]) => rateplanId === selectedRangeRatePlan)
    ) {
      setSelectedRangeRatePlan("ALL");
    }
  }, [rangeRatePlanOptions, selectedRangeRatePlan]);

  return (
    <>
      <AlertDialog open={dateAlertOpen} onOpenChange={setDateAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Please select dates</AlertDialogTitle>
            <AlertDialogDescription>
              Select both the room start date and end date before updating room prices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDateAlertOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <h3 className="text-pink-600 font-semibold mb-4">
        Hotel Price Book{isOfflineHotel ? " (Offline)" : ""}
      </h3>

 {/* ====== Hotel Margin ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">
            Hotel Margin
          </h5>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHotelDetailsError("");
                setHotelDetailsSuccess("");
                hotelDetailsMut.mutate();
              }}
              className="px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-pink-500 to-purple-600"
            >
              {hotelDetailsMut.isPending ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        {hotelDetailsError && (
          <div className="mb-3 text-sm text-red-600">{hotelDetailsError}</div>
        )}
        {hotelDetailsSuccess && (
          <div className="mb-3 text-sm text-green-600">{hotelDetailsSuccess}</div>
        )}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Hotel Margin (%)
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter Hotel Margin"
              value={hotelMargin}
              onChange={(e) => setHotelMargin(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Margin GST Type
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={hotelMarginGstType}
              onChange={(e) =>
                setHotelMarginGstType(e.target.value as "Included" | "Excluded")
              }
            >
              <option value="">Select GST Type</option>
              <option value="Included">Included</option>
              <option value="Excluded">Excluded</option>
            </select>
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Margin GST Percentage
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={hotelMarginGstPercentage}
              onChange={(e) => setHotelMarginGstPercentage(e.target.value)}
            >
              <option value="">Select GST %</option>
              {["0", "5", "12", "18", "28"].map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

 {/* ====== Meal Details ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text/base">
            Meal Details
          </h5>

          <div className="flex items-center gap-2">
            <SharedDatePicker
              label="Start Date"
              value={mealStartDate}
              triggerClassName="h-10 w-[160px]"
              parseValue={parseYmdDate}
              formatValue={formatYmdDate}
              onChange={(nextStart) => {
                setMealStartDate(nextStart);
                if (mealEndDate && nextStart && mealEndDate < nextStart) {
                  setMealEndDate("");
                }
              }}
            />
            <SharedDatePicker
              label="End Date"
              value={mealEndDate}
              minDate={parseYmdDate(mealStartDate)}
              triggerClassName="h-10 w-[160px]"
              parseValue={parseYmdDate}
              formatValue={formatYmdDate}
              onChange={setMealEndDate}
            />
            <button
              type="button"
              onClick={() => {
                const msg = validateMealSection();
                if (msg) {
                  setMealError(msg);
                  return;
                }
                const mealStart = mealStartDate || mealStartRef.current?.value || "";
                const mealEnd = mealEndDate || mealEndRef.current?.value || "";
                setMealError("");
                setMealSuccess("");
                mealMut.mutate({
                  startDate: mealStart,
                  endDate: mealEnd,
                  breakfastCost: toMaybeNum(breakfastCost),
                  lunchCost: toMaybeNum(lunchCost),
                  dinnerCost: toMaybeNum(dinnerCost),
                } as any);
              }}
              disabled={mealMut.isPending}
              className={`px-4 py-2 rounded-lg text-white text-sm
                bg-gradient-to-r from-pink-500 to-purple-600
                disabled:opacity-50`}
            >
              {mealMut.isPending ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        {mealError && <div className="mb-3 text-sm text-red-600">{mealError}</div>}
  {mealSuccess && <div className="mb-3 text-sm text-green-600">{mealSuccess}</div>}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Breakfast Cost ({"\u20B9"})
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter Breakfast Cost"
              value={breakfastCost}
              onChange={(e) => setBreakfastCost(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Lunch Cost ({"\u20B9"})
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter Lunch Cost"
              value={lunchCost}
              onChange={(e) => setLunchCost(e.target.value)}
            />
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-xs font-medium mb-1">
              Dinner Cost ({"\u20B9"})
            </label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Enter Dinner Cost"
              value={dinnerCost}
              onChange={(e) => setDinnerCost(e.target.value)}
            />
          </div>
        </div>

        {canLoadMealRangeView && (
          <div className="mt-6">
            <h5 className="mb-3 font-semibold text-gray-800 text-sm md:text-base">
              Hotel Meal Plan Details
            </h5>
            <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
              <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${180 + mealRangeDates.length * 190}px` }}>
                <thead>
                  <tr>
                    <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, minWidth: 180, zIndex: 5 }}>Meal Type</th>
                    {mealRangeDates.map((date) => (
                      <th key={`meal-${date}`} style={{ background: "linear-gradient(to bottom, rgb(114,49,207), rgb(195,60,166), rgb(238,63,206))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                        {formatDateLabel(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mealRangeRows.length === 0 || mealRangeDates.length === 0 ? (
                    <tr>
                      <td style={{ padding: "6px 10px", border: "1px solid #ddd", background: "#f4f4f4", color: "#666", textAlign: "center" }} colSpan={1 + Math.max(mealRangeDates.length, 1)}>
                        No data found
                      </td>
                    </tr>
                  ) : (
                    mealRangeRows.map((row) => (
                      <tr key={`meal-row-${row.mealType}`}>
                        <td style={{ ...stickyBodyBase, position: "sticky", left: 0, minWidth: 180, zIndex: 4 }}>{row.mealType}</td>
                        {mealRangeDates.map((date) => (
                          <td key={`meal-${row.mealType}-${date}`} style={{ padding: "4px 16px", border: "1px solid #ddd", background: "#f9f9f9", color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
                            {renderMealCell(row.values?.[date])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

 {/* ====== Amenities Details ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">
            Amenities Details
          </h5>

          <div className="flex items-center gap-2">

            <SharedDatePicker
              label="Start Date"
              value={amenitiesStartDate}
              triggerClassName="h-10 w-[160px]"
              parseValue={parseYmdDate}
              formatValue={formatYmdDate}
              onChange={(nextStart) => {
                setAmenitiesStartDate(nextStart);
                if (amenitiesEndDate && nextStart && amenitiesEndDate < nextStart) {
                  setAmenitiesEndDate("");
                }
              }}
            />
            <SharedDatePicker
              label="End Date"
              value={amenitiesEndDate}
              minDate={parseYmdDate(amenitiesStartDate)}
              triggerClassName="h-10 w-[160px]"
              parseValue={parseYmdDate}
              formatValue={formatYmdDate}
              onChange={setAmenitiesEndDate}
            />
            <button
              type="button"
              onClick={() => {
                const msg = validateAmenitiesSection();
                if (msg) {
                  setAmenitiesError(msg);
                  return;
                }
                const aStart = amenitiesStartDate || amenitiesStartRef.current?.value || "";
                const aEnd = amenitiesEndDate || amenitiesEndRef.current?.value || "";
                setAmenitiesStartDate(aStart);
                setAmenitiesEndDate(aEnd);
                setAmenitiesError("");
                setAmenitiesSuccess("");
                amenityMut.mutate();
              }}
              disabled={amenityMut.isPending}
              className={`px-4 py-2 rounded-lg text-white text-sm
                bg-gradient-to-r from-pink-500 to-purple-600
                disabled:opacity-50`}
            >
              {amenityMut.isPending ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        {amenitiesError && (
          <div className="mb-3 text-sm text-red-600">{amenitiesError}</div>
        )}
        {amenitiesSuccess && (
          <div className="mb-3 text-sm text-green-600">{amenitiesSuccess}</div>
        )}

        <div className="grid grid-cols-12 gap-4">
          {amenityOptions.length === 0 ? (
            <div className="col-span-12 text-sm text-gray-500">No more amenities found.</div>
          ) : (
            amenityOptions.map((a, index) => {
              const val = amenityCharges[a.id] || { hours: "", day: "" };
              return (
                <div key={a.id} className={`col-span-12 md:col-span-6 grid grid-cols-12 gap-3 ${index % 2 === 0 ? "md:pr-6 md:border-r md:border-gray-200" : "md:pl-6"}`}>
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-xs font-medium mb-1">Amenities Title</label>
                    <div className="text-pink-600 font-semibold text-sm mt-2">{a.name}</div>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-medium mb-1">Hours Charge</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Hours Charge"
                      value={val.hours || ""}
                      onChange={(e) =>
                        setAmenityCharges((prev) => ({
                          ...prev,
                          [a.id]: { ...(prev[a.id] || {}), hours: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs font-medium mb-1">Day Charge ({"\u20B9"})</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Day Charge"
                      value={val.day || ""}
                      onChange={(e) =>
                        setAmenityCharges((prev) => ({
                          ...prev,
                          [a.id]: { ...(prev[a.id] || {}), day: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {canLoadAmenitiesRangeView && (
          <div className="mt-6">
            <h5 className="mb-3 font-semibold text-gray-800 text-sm md:text-base">
              Hotel Amenities Price Details
            </h5>
            <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
              <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${320 + amenitiesRangeDates.length * 190}px` }}>
                <thead>
                  <tr>
                    <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, minWidth: 170, zIndex: 5 }}>Amenities Name</th>
                    <th style={{ ...stickyHeaderBase, position: "sticky", left: 170, minWidth: 120, zIndex: 5 }}>Price Type</th>
                    {amenitiesRangeDates.map((date) => (
                      <th key={`amenity-${date}`} style={{ background: "linear-gradient(to bottom, rgb(114,49,207), rgb(195,60,166), rgb(238,63,206))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                        {formatDateLabel(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {amenitiesRangeRows.length === 0 || amenitiesRangeDates.length === 0 ? (
                    <tr>
                      <td style={{ padding: "6px 10px", border: "1px solid #ddd", background: "#f4f4f4", color: "#666", textAlign: "center" }} colSpan={2 + Math.max(amenitiesRangeDates.length, 1)}>
                        No data found
                      </td>
                    </tr>
                  ) : (
                    amenitiesRangeRows.map((row) => (
                      <tr key={`amenity-row-${row.amenityName}-${row.priceType}`}>
                        <td style={{ ...stickyBodyBase, position: "sticky", left: 0, minWidth: 170, zIndex: 4 }}>{row.amenityName}</td>
                        <td style={{ ...stickyBodyBase, position: "sticky", left: 170, minWidth: 120, zIndex: 4 }}>{row.priceType}</td>
                        {amenitiesRangeDates.map((date) => (
                          <td key={`amenity-${row.amenityName}-${row.priceType}-${date}`} style={{ padding: "4px 16px", border: "1px solid #ddd", background: "#f9f9f9", color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
                            {renderAmenityCell(row.values?.[date])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

  {/* ====== Room Details ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 border-b pb-3 mb-3">
          <div>
            <h5 className="font-semibold text-gray-800 text-sm md:text-base">
              Room Details
            </h5>
            <p className="mt-1 text-xs text-gray-500">
              Rates for all rooms are shown below. Select rooms only when you
              want to update multiple rooms together.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <div>
              <div className="flex items-center gap-2">
                <SharedDatePicker
                  label="Start Date"
                  value={roomStartDate}
                  triggerClassName="h-10 w-[160px]"
                  parseValue={parseYmdDate}
                  formatValue={formatYmdDate}
                  onChange={(nextStart) => {
                    setRoomStartDate(nextStart);

                    if (
                      roomEndDate &&
                      nextStart &&
                      roomEndDate < nextStart
                    ) {
                      setRoomEndDate("");
                    }

                    if (roomStartDateError) {
                      setRoomStartDateError("");
                    }

                    if (roomDateValidationMessage) {
                      setRoomDateValidationMessage("");
                    }
                  }}
                />

                <SharedDatePicker
                  label="End Date"
                  value={roomEndDate}
                  minDate={parseYmdDate(roomStartDate)}
                  triggerClassName="h-10 w-[160px]"
                  parseValue={parseYmdDate}
                  formatValue={formatYmdDate}
                  onChange={(nextEnd) => {
                    setRoomEndDate(nextEnd);

                    if (roomEndDateError) {
                      setRoomEndDateError("");
                    }

                    if (roomDateValidationMessage) {
                      setRoomDateValidationMessage("");
                    }
                  }}
                />
              </div>

              {roomDateValidationMessage && (
                <div className="mt-1 text-sm text-red-600">
                  {roomDateValidationMessage}
                </div>
              )}
            </div>

            <button
              type="button"
              ref={bulkUpdateButtonRef}
              onClick={() => {
                const rStart =
                  roomStartDate ||
                  roomStartRef.current?.value ||
                  "";

                const rEnd =
                  roomEndDate ||
                  roomEndRef.current?.value ||
                  "";

                setRoomStartDate(rStart);
                setRoomEndDate(rEnd);
                setRoomError("");
                setRoomSuccess("");
                setRoomStartDateError("");
                setRoomEndDateError("");
                setRoomDateValidationMessage("");

                if (!rStart && !rEnd) {
                  setRoomStartDateError(
                    "Start date should be required."
                  );
                  setRoomEndDateError(
                    "End date should be required."
                  );
                  setRoomDateValidationMessage(
                    "Start date and End date should be required."
                  );
                  setRoomError(
                    "Please fill in all required fields."
                  );
                  return;
                }

                if (!rStart) {
                  setRoomStartDateError(
                    "Start date should be required."
                  );
                  setRoomDateValidationMessage(
                    "Start date should be required."
                  );
                  setRoomError(
                    "Please fill in all required fields."
                  );
                  return;
                }

                if (!rEnd) {
                  setRoomEndDateError(
                    "End date should be required."
                  );
                  setRoomDateValidationMessage(
                    "End date should be required."
                  );
                  setRoomError(
                    "Please fill in all required fields."
                  );
                  return;
                }

                if (effectiveSelectedRoomIds.length === 0) {
                  setRoomError(
                    "Please select at least one room for bulk update."
                  );
                  return;
                }

                const allSelectedRoomsHavePrices =
                  effectiveSelectedRoomIds.every(
                    (roomId: number) => {
                      if (isOfflineHotel) {
                        return Object.values(getOfflineRoomDraft(roomId)).some(
                          (value) => String(value ?? "").trim() !== "",
                        );
                      }
                      return (roomRatePlansByRoom[roomId] || []).some((plan: any) =>
                        Object.values(getRoomOccupancyDraft(roomId, plan.rateplanId)).some(
                          (value) => String(value ?? "").trim() !== "",
                        ),
                      );
                    },
                  );

                if (!allSelectedRoomsHavePrices) {
                  setRoomError(
                    "Please enter at least one price for each selected room."
                  );
                  return;
                }

                roomMut.mutate(
                  [...effectiveSelectedRoomIds],
                  {
                    onSuccess: () => {
                      setRoomError("");
                      setRoomSuccess(
                        "Room price book saved successfully."
                      );

                      setOccupancyDrafts((prev) => {
                        const next = { ...prev };

                        effectiveSelectedRoomIds.forEach((roomId: number) => {
                          (roomRatePlansByRoom[roomId] || []).forEach((plan: any) => {
                            delete next[`${roomId}:${plan.rateplanId}`];
                          });
                        });

                        return next;
                      });

                      refetchRangeView();
                    },
                    onError: (e: any) => {
                      setRoomSuccess("");
                      setRoomError(
                        uiErrorMessage(
                          e,
                          "Room pricebook failed. Please try again."
                        )
                      );
                    },
                  }
                );
              }}
              disabled={roomMut.isPending}
              className="px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50"
            >
              {roomMut.isPending
                ? "Saving..."
                : "Bulk Update"}
            </button>
          </div>
        </div>

        {roomError && (
          <div className="mb-3 text-sm text-red-600">
            {roomError}
          </div>
        )}

        {roomSuccess && (
          <div className="mb-3 text-sm text-green-600">
            {roomSuccess}
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="text-sm text-gray-500">
            No rooms found.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gray-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={allBulkRoomsSelected}
                  onChange={(e) =>
                    setSelectedRoomIds(
                      e.target.checked
                        ? bulkSelectableRoomIds
                        : []
                    )
                  }
                />
                Select all rooms for bulk update
              </label>

              <span className="text-xs text-gray-500">
                {effectiveSelectedRoomIds.length} room
                {effectiveSelectedRoomIds.length === 1 ? "" : "s"} selected
              </span>
            </div>

            <div className="space-y-4">
              {rooms.map((room: any) => {
                const roomId =
                  Number(room.room_ID);

                const roomRatePlans =
                  roomRatePlansByRoom[roomId] || [];

                const isSelected =
                  effectiveSelectedRoomIds.includes(roomId);

                return (
                  <div
                    key={roomId}
                    className={`rounded-xl border p-4 ${
                      isSelected
                        ? "border-pink-300 bg-pink-50/40"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={
                            !isOfflineHotel && roomRatePlans.length === 0
                          }
                          onChange={(e) => {
                            setSelectedRoomIds(
                              (prev: number[]) =>
                                e.target.checked
                                  ? Array.from(
                                      new Set([
                                        ...prev,
                                        roomId,
                                      ])
                                    )
                                  : prev.filter(
                                      (id: number) =>
                                        id !== roomId
                                    )
                            );
                          }}
                        />

                        <span className="font-semibold text-gray-800">
                          {roomDropdownLabel(room)}
                        </span>
                      </label>

                      <span className="text-xs text-gray-500">
                        {isSelected
                          ? "Selected for bulk update"
                          : "View / edit rates"}
                      </span>
                    </div>

                    {isOfflineHotel ? (
                      <div className="grid grid-cols-12 gap-4">
                        {[
                          ["ROOM_PRICE", "Room Price"],
                          ["EXTRABED", "Extra Bed Charge"],
                          ["CHILD_WITH_BED", "Child with Bed"],
                          ["CHILD_WITHOUT_BED", "Child Without Bed"],
                        ].map(([field, label]) => {
                          const offlineDraft = getOfflineRoomDraft(roomId);
                          return (
                            <div key={`${roomId}-${field}`} className="col-span-12 lg:col-span-2">
                              <label className="block text-xs font-medium mb-1">
                                {label} (₹)
                              </label>
                              <input
                                type="number"
                                className="w-full rounded-lg px-3 py-2 text-sm border"
                                placeholder={`Enter ${label}`}
                                value={offlineDraft[field] || ""}
                                onKeyDown={handleRoomPriceFieldKeyDown}
                                onChange={(e) => setOfflineRoomField(roomId, field, e.target.value)}
                              />
                            </div>
                          );
                        })}

                        <div className="col-span-12 lg:col-span-2">
                          <label className="block text-xs font-medium mb-1">GST Type</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            value={getOfflineRoomDraft(roomId).GST_TYPE || (Number(room.gst_type) === 2 ? "Excluded" : DEFAULT_OFFLINE_GST_TYPE)}
                            onChange={(e) => setOfflineRoomField(roomId, "GST_TYPE", e.target.value)}
                          >
                            <option value="Included">Included</option>
                            <option value="Excluded">Excluded</option>
                          </select>
                        </div>

                        <div className="col-span-12 lg:col-span-2">
                          <label className="block text-xs font-medium mb-1">GST Percentage</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            value={resolveOfflineGstPercentage(
                              getOfflineRoomDraft(roomId).GST_PERCENTAGE,
                              room.gst_percentage,
                            )}
                            onChange={(e) => setOfflineRoomField(roomId, "GST_PERCENTAGE", e.target.value)}
                          >
                            {OFFLINE_GST_PERCENTAGE_OPTIONS.map((percentage) => (
                              <option key={percentage} value={percentage}>{percentage} % GST - %{percentage}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {roomRatePlans.length === 0 ? (
                          <div className="text-sm text-gray-500">
                            {roomRatePlansLoading
                              ? "Loading rate plans..."
                              : "No rate plans found for this room."}
                          </div>
                        ) : (
                          roomRatePlans.map((plan: any) => {
                            const currentPlanDraft = getRoomOccupancyDraft(
                              roomId,
                              plan.rateplanId,
                            );
                            const planCode = plan.ratePlanCode || plan.rateplanId;
                            return (
                              <div
                                key={`${roomId}-${plan.rateplanId}`}
                                className="grid grid-cols-12 gap-4 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                              >
                                <div className="col-span-12 lg:col-span-2 flex flex-col justify-center">
                                  <div className="font-semibold text-gray-800">
                                    {planCode}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {plan.ratePlanName}
                                  </div>
                                </div>

                                {OCCUPANCY_FIELDS.map((occupancyKey: string) => (
                                  <div
                                    key={`${roomId}-${plan.rateplanId}-${occupancyKey}`}
                                    className="col-span-12 lg:col-span-2"
                                  >
                                    <label className="block text-xs font-medium mb-1">
                                      {occupancyKey} ({"\u20B9"})
                                    </label>
                                    <input
                                      type="number"
                                      className="w-full rounded-lg px-3 py-2 text-sm border"
                                      placeholder={`Enter ${occupancyKey}`}
                                      value={currentPlanDraft[occupancyKey] || ""}
                                      onKeyDown={handleRoomPriceFieldKeyDown}
                                      onChange={(e) =>
                                        setRoomField(
                                          roomId,
                                          plan.rateplanId,
                                          occupancyKey,
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

 {/* ====== Range-based Occupancy Grid ====== */}
      {canLoadRangeView && (
        <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h5 className="mb-0 font-semibold text-gray-800 text-sm md:text-base">
              {isOfflineHotel ? "Hotel Room Price Details" : "Hotel Occupancy Details"}
            </h5>
            <div className="text-xs text-gray-600 text-right">
              <div className="font-medium">Selected Range</div>
              <div>{rangeSummary}</div>
            </div>
          </div>
          <div className="mb-3 flex items-center gap-3">
            <label
              htmlFor="hotel-occupancy-rate-plan-filter"
              className="text-sm font-medium text-gray-700"
            >
              Rate Plan
            </label>
            <select
              id="hotel-occupancy-rate-plan-filter"
              aria-label="Filter occupancy details by rate plan"
              value={selectedRangeRatePlan}
              onChange={(event) => setSelectedRangeRatePlan(event.target.value)}
              className="h-10 min-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">All Rate Plans</option>
              {rangeRatePlanOptions.map(([rateplanId, label]) => (
                <option key={rateplanId} value={rateplanId}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
            <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${720 + renderedRangeDates.length * 140}px` }}>
              <thead>
                <tr>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", zIndex: 7, boxSizing: "border-box", boxShadow: "2px 0 0 #ddd" }}>Room Name</th>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 180, width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", zIndex: 7, boxSizing: "border-box", boxShadow: "2px 0 0 #ddd" }}>Room Type</th>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 360, width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", zIndex: 7, boxSizing: "border-box", boxShadow: "2px 0 0 #ddd" }}>Rate Plan</th>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 540, width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", zIndex: 7, boxSizing: "border-box", boxShadow: "2px 0 0 #ddd" }}>Occupancy Type</th>
                  {renderedRangeDates.map((date) => (
                    <th key={`occ-header-${date}`} style={{ background: "linear-gradient(to bottom, rgb(114,49,207), rgb(195,60,166), rgb(238,63,206))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                      {formatDateLabel(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOccupancyGridRows.length === 0 || renderedRangeDates.length === 0 ? (
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #ddd", background: "#f4f4f4", color: "#666", textAlign: "center" }} colSpan={4 + Math.max(renderedRangeDates.length, 1)}>
                      No occupancy prices found for the displayed rooms, rate plans, and date range.
                    </td>
                  </tr>
                ) : (
                  filteredOccupancyGridRows.map((row) => (
                    <tr key={`occ-range-${row.roomId}-${row.rateplanId}-${row.occupancyType}`}>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 0, width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", zIndex: 6, boxSizing: "border-box", boxShadow: "2px 0 0 #ddd" }}>{row.roomName || "N/A"}</td>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 180, width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", zIndex: 6, boxSizing: "border-box", boxShadow: "2px 0 0 #ddd" }}>{row.roomType || "N/A"}</td>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 360, width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", zIndex: 6, boxSizing: "border-box", boxShadow: "2px 0 0 #ddd" }}>{rangeRatePlanLabel(row)}</td>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 540, width: 180, minWidth: 180, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", zIndex: 6, boxSizing: "border-box", boxShadow: "2px 0 0 #ddd" }}>{isOfflineHotel && row.occupancyType === "ROOM_PRICE" ? "Room Price" : row.occupancyType || "N/A"}</td>
                      {renderedRangeDates.map((date) => (
                        <td key={`${row.roomId}-${row.occupancyType}-${date}`} style={{ padding: "4px 16px", border: "1px solid #ddd", background: "#f9f9f9", color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
                          {row.values?.[date] === undefined
                            ? (isOfflineHotel ? "" : formatCurrency(0))
                            : formatCurrency(Number(row.values[date]))}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

 {/* ====== Room Availability ====== */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">

 {/* Header mirrors Room Details header style */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">Room Availability</h5>

          <div className="flex items-center gap-2 flex-wrap">
            <SharedDatePicker
              label="Start Date"
              value={availStartDate}
              triggerClassName="h-10 w-[160px]"
              parseValue={parseYmdDate}
              formatValue={formatYmdDate}
              onChange={(nextStart) => {
                setAvailStartDate(nextStart);
                if (availEndDate && nextStart && availEndDate < nextStart) setAvailEndDate("");
                setAvailError("");
                setAvailSuccess("");
              }}
            />
            <SharedDatePicker
              label="End Date"
              value={availEndDate}
              minDate={parseYmdDate(availStartDate)}
              triggerClassName="h-10 w-[160px]"
              parseValue={parseYmdDate}
              formatValue={formatYmdDate}
              onChange={(nextEnd) => {
                setAvailEndDate(nextEnd);
                setAvailError("");
                setAvailSuccess("");
              }}
            />
            <button
              type="button"
              onClick={() => {
                setAvailError(""); setAvailSuccess("");
                if (!availRoomId) { setAvailError("Please select a room."); return; }
                if (!availStartDate) { setAvailError("Start date is required."); return; }
                if (!availEndDate) { setAvailError("End date is required."); return; }
                if (availFreeRooms === "") { setAvailError("Free Rooms count is required."); return; }
                availMut.mutate(undefined, {
                  onSuccess: () => {
                    setAvailError("");
                    setAvailSuccess("Room availability saved successfully.");
                    setAvailFreeRooms("");
                    refetchAvailView();
                  },
                  onError: (e: any) => {
                    setAvailSuccess("");
                    setAvailError(e?.message || "Failed to save availability.");
                  },
                });
              }}
              disabled={availMut.isPending}
              className="px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-50"
            >
              {availMut.isPending ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        {availError && <div className="mb-3 text-sm text-red-600">{availError}</div>}
        {availSuccess && <div className="mb-3 text-sm text-green-600">{availSuccess}</div>}

 {/* Body room dropdown + free rooms input, mirrors occupancy body grid */}
        {rooms.length === 0 ? (
          <div className="text-sm text-gray-500">No rooms found.</div>
        ) : (
          <div className="grid grid-cols-12 gap-4 mb-4">
 {/* Room selector */}
            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-medium mb-1">Choose Room</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={availRoomId ?? ""}
                onChange={(e) => {
                  setAvailRoomId(e.target.value ? Number(e.target.value) : null);
                  setAvailError(""); setAvailSuccess(""); setAvailFreeRooms("");
                }}
              >
                {rooms.map((room) => (
                  <option key={room.room_ID} value={room.room_ID}>
                    {roomDropdownLabel(room)}
                  </option>
                ))}
              </select>
            </div>

 {/* Free Rooms input */}
            <div className="col-span-12 md:col-span-3">
              <label className="block text-xs font-medium mb-1">Free Rooms</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. 5"
                value={availFreeRooms}
                onChange={(e) => { setAvailFreeRooms(e.target.value); setAvailError(""); setAvailSuccess(""); }}
              />
            </div>

 {/* Hint */}
            <div className="col-span-12 md:col-span-5 flex items-end">
              <p className="text-xs text-gray-500">
                {availStartDate && availEndDate
                  ? <>Availability for <strong>{formatDateLabel(normalizedAvailStart)}</strong> {"\u2192"} <strong>{formatDateLabel(normalizedAvailEnd)}</strong>. Enter free rooms count and click <strong>Update</strong>.</>
                  : "Select a date range above, then enter the number of free rooms available and click Update."}
              </p>
            </div>
          </div>
        )}

 {/* Read-back table auto-loads when room + dates selected */}
        {canLoadAvailView && (
          <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
            <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${200 + availViewDates.length * 150}px` }}>
              <thead>
                <tr>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, minWidth: 200, zIndex: 5 }}>Room</th>
                  {availViewDates.map((date) => (
                    <th key={`avail-h-${date}`} style={{ background: "linear-gradient(to bottom, rgb(22,163,74), rgb(16,185,129))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                      {formatDateLabel(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...stickyBodyBase, position: "sticky", left: 0, minWidth: 200, zIndex: 4, fontWeight: "600" }}>
                    {availSelectedRoom ? roomDropdownLabel(availSelectedRoom) : "Free Rooms"}
                  </td>
                  {availViewDates.map((date) => {
                    const dayView = availViewByDate[date];
                    const freeRooms = dayView?.free;
                    const restrictions = dayView?.restrictions;

                    const isSet = freeRooms !== null && freeRooms !== undefined;

                    return (
                      <td key={`avail-d-${date}`} style={{
                        padding: "6px 12px",
                        border: "1px solid #ddd",
                        background: isSet ? "#f0fdf4" : "#fef2f2",
                        color: isSet ? "#166534" : "#dc2626",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                        fontWeight: "600",
                        fontSize: "0.78rem",
                        lineHeight: "1.35",
                      }}>
                        {isSet ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div>{freeRooms} rooms</div>
                            <div style={{ color: "#374151", fontWeight: 700 }}>
                              CTA:{yn(restrictions?.cta)} | CTD:{yn(restrictions?.ctd)}
                            </div>
                            <div style={{ color: "#374151", fontWeight: 700 }}>
                              STOPSELL:{yn(restrictions?.stopsell)}
                            </div>
                          </div>
                        ) : (
                          "Not Set"
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>


 {/* ====== Footer ====== */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onPrev}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm"
        >
          Continue
        </button>
      </div>
    </>
  );
}
