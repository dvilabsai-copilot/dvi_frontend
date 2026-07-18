/* eslint-disable @typescript-eslint/no-explicit-any */
export function PriceBookStepView({ context }: { context: Record<string, any> }) {
  const { OCCUPANCY_FIELDS, amenitiesEndDate, amenitiesEndRef, amenitiesError, amenitiesRangeDates, amenitiesRangeRows, amenitiesStartDate, amenitiesStartRef, amenitiesSuccess, amenityCharges, amenityMut, availEndDate, availEndRef, availError, availFreeRooms, availMut, availRoomId, availSelectedRoom, availStartDate, availStartRef, availSuccess, availViewByDate, availViewDates, breakfastCost, canLoadAmenitiesRangeView, canLoadAvailView, canLoadMealRangeView, canLoadRangeView, currentOccupancyDraft, dinnerCost, formatCurrency, formatDateLabel, hotelDetailsError, hotelDetailsMut, hotelDetailsSuccess, hotelMargin, hotelMarginGstPercentage, hotelMarginGstType, lunchCost, mealEndDate, mealEndRef, mealError, mealMut, mealRangeDates, mealRangeRows, mealStartDate, mealStartRef, mealSuccess, normalizedAvailEnd, normalizedAvailStart, occupancyGridRows, rangeSummary, renderAmenityCell, renderMealCell, renderedRangeDates, roomDateValidationMessage, roomDropdownLabel, roomEndDate, roomEndDateError, roomEndRef, roomError, roomMut, roomRatePlans, roomSelectionKey, roomStartDate, roomStartDateError, roomStartRef, roomSuccess, selectedRatePlan, selectedRatePlanId, selectedRoomId, setAmenitiesEndDate, setAmenitiesError, setAmenitiesStartDate, setAmenitiesSuccess, setAmenityCharges, setAvailEndDate, setAvailError, setAvailFreeRooms, setAvailRoomId, setAvailStartDate, setAvailSuccess, setBreakfastCost, setDinnerCost, setHotelDetailsError, setHotelDetailsSuccess, setHotelMargin, setHotelMarginGstPercentage, setHotelMarginGstType, setLunchCost, setMealEndDate, setMealError, setMealStartDate, setMealSuccess, setOccupancyDrafts, setRoomDateValidationMessage, setRoomEndDate, setRoomEndDateError, setRoomError, setRoomField, setRoomStartDate, setRoomStartDateError, setRoomSuccess, setSelectedRatePlanId, setSelectedRoomId, stickyBodyBase, stickyHeaderBase, toMaybeNum, uiErrorMessage, validateAmenitiesSection, validateMealSection, yn, amenityOptions, refetchRangeView, rooms, roomRatePlansLoading, refetchAvailView, onPrev, onNext } = context;
  return (
    <>
      <h3 className="text-pink-600 font-semibold mb-4">Hotel Price Book</h3>

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
<div
  className="relative"
  onMouseDown={(e) => {
    e.preventDefault();
    mealStartRef.current?.showPicker?.();
  }}
>
  <input
    type="text"
    readOnly
    className="border rounded-lg px-3 py-2 text-sm cursor-pointer"
    placeholder="Start Date"
    value={mealStartDate}
  />

  <input
    ref={mealStartRef}
    type="date"
    value={mealStartDate}
    onChange={(e) => setMealStartDate(e.target.value)}
    className="absolute inset-0 opacity-0 pointer-events-none"
  />
</div>
<div
  className="relative"
  onMouseDown={(e) => {
    e.preventDefault();
    mealEndRef.current?.showPicker?.();
  }}
>
  <input
    type="text"
    readOnly
    className="border rounded-lg px-3 py-2 text-sm cursor-pointer"
    placeholder="End Date"
    value={mealEndDate}
  />

  <input
    ref={mealEndRef}
    type="date"
    value={mealEndDate}
    onChange={(e) => setMealEndDate(e.target.value)}
    className="absolute inset-0 opacity-0 pointer-events-none"
  />
</div>
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

            <div
  className="relative"
  onMouseDown={(e) => {
    e.preventDefault();
    amenitiesStartRef.current?.showPicker?.();
  }}
>
  <input
    type="text"
    readOnly
    className="border rounded-lg px-3 py-2 text-sm cursor-pointer"
    placeholder="Start Date"
    value={amenitiesStartDate}
  />
  <input
    ref={amenitiesStartRef}
    type="date"
    value={amenitiesStartDate}
    onChange={(e) => setAmenitiesStartDate(e.target.value)}
    className="absolute inset-0 opacity-0 pointer-events-none"
  />
</div>

<div
  className="relative"
  onMouseDown={(e) => {
    e.preventDefault();
    amenitiesEndRef.current?.showPicker?.();
  }}
>
  <input
    type="text"
    readOnly
    className="border rounded-lg px-3 py-2 text-sm cursor-pointer"
    placeholder="End Date"
    value={amenitiesEndDate}
  />
  <input
    ref={amenitiesEndRef}
    type="date"
    value={amenitiesEndDate}
    onChange={(e) => setAmenitiesEndDate(e.target.value)}
    className="absolute inset-0 opacity-0 pointer-events-none"
  />
</div>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">
            Room Details
          </h5>

          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                
           <div
  className="relative"
  onMouseDown={(e) => {
    e.preventDefault();
    roomStartRef.current?.showPicker?.();
  }}
>
  <input
    type="text"
    readOnly
    className={`rounded-lg px-3 py-2 text-sm cursor-pointer ${
      roomStartDateError ? "border border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" : "border"
    }`}
    placeholder="Start Date"
    value={roomStartDate}
  />
  <input
    ref={roomStartRef}
    type="date"
    value={roomStartDate}
    onChange={(e) => {
      setRoomStartDate(e.target.value);
      if (roomStartDateError) setRoomStartDateError("");
      if (roomDateValidationMessage) setRoomDateValidationMessage("");
    }}
    className="absolute inset-0 opacity-0 pointer-events-none"
  />
</div>

<div
  className="relative"
  onMouseDown={(e) => {
    e.preventDefault();
    roomEndRef.current?.showPicker?.();
  }}
>
  <input
    type="text"
    readOnly
    className={`rounded-lg px-3 py-2 text-sm cursor-pointer ${
      roomEndDateError ? "border border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" : "border"
    }`}
    placeholder="End Date"
    value={roomEndDate}
  />
  <input
    ref={roomEndRef}
    type="date"
    value={roomEndDate}
    onChange={(e) => {
      setRoomEndDate(e.target.value);
      if (roomEndDateError) setRoomEndDateError("");
      if (roomDateValidationMessage) setRoomDateValidationMessage("");
    }}
    className="absolute inset-0 opacity-0 pointer-events-none"
  />
</div>

              </div>
              {roomDateValidationMessage && (
                <div className="mt-1 text-sm text-red-600">{roomDateValidationMessage}</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const rStart = roomStartDate || roomStartRef.current?.value || "";
                const rEnd = roomEndDate || roomEndRef.current?.value || "";
                const hasAnyOccupancyValue = Object.values(currentOccupancyDraft).some(
                  (value) => String(value ?? "").trim() !== ""
                );
                setRoomStartDate(rStart);
                setRoomEndDate(rEnd);
                setRoomError("");
                setRoomSuccess("");
                setRoomStartDateError("");
                setRoomEndDateError("");
                setRoomDateValidationMessage("");

                if (!rStart && !rEnd) {
                  setRoomStartDateError("Start date should be required.");
                  setRoomEndDateError("End date should be required.");
                  setRoomDateValidationMessage("Start date and End date should be required.");
                  setRoomError("Please fill in all required fields.");
                  return;
                }
                if (!rStart) {
                  setRoomStartDateError("Start date should be required.");
                  setRoomDateValidationMessage("Start date should be required.");
                  setRoomError("Please fill in all required fields.");
                  return;
                }
                if (!rEnd) {
                  setRoomEndDateError("End date should be required.");
                  setRoomDateValidationMessage("End date should be required.");
                  setRoomError("Please fill in all required fields.");
                  return;
                }

                if (!hasAnyOccupancyValue) {
                  setRoomError("Please fill in all required fields.");
                  return;
                }

                roomMut.mutate(undefined, {
                  onSuccess: () => {
                    setRoomError("");
                    setRoomSuccess("Room price book saved successfully.");
                    setOccupancyDrafts((prev) => ({
                      ...prev,
                      [roomSelectionKey]: {},
                    }));
                    refetchRangeView();
                  },
                  onError: (e: any) => {
                    setRoomSuccess("");
                    setRoomError(uiErrorMessage(e, "Room pricebook failed. Please try again."));
                  },
                });
              }}
              className="px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-pink-500 to-purple-600"
            >
              Update
            </button>
          </div>
        </div>

        {roomError && <div className="mb-3 text-sm text-red-600">{roomError}</div>}
        {roomSuccess && <div className="mb-3 text-sm text-green-600">{roomSuccess}</div>}

        {rooms.length === 0 ? (
          <div className="text-sm text-gray-500">No rooms found.</div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-medium mb-1">Choose Room</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={selectedRoomId ?? ""}
                onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : null)}
              >
                {rooms.map((room) => (
                  <option key={room.room_ID} value={room.room_ID}>
                    {roomDropdownLabel(room)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-medium mb-1">Choose Rate Plan</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={selectedRatePlanId}
                onChange={(e) => setSelectedRatePlanId(e.target.value)}
                disabled={roomRatePlansLoading || roomRatePlans.length === 0}
              >
                {roomRatePlans.map((plan) => (
                  <option key={plan.rateplanId} value={plan.rateplanId}>
                    {plan.ratePlanCode || plan.rateplanId} - {plan.ratePlanName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 md:col-span-4 rounded-xl border border-dashed border-pink-200 bg-pink-50 px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-pink-700 mb-1">
                Plan Meaning
              </div>
              <div className="text-sm text-gray-700">
                {selectedRatePlan?.description || "Select a room and rate plan to manage occupancy pricing."}
              </div>
              {selectedRatePlan && (
                <div className="mt-2 text-xs text-gray-500">
                  {selectedRatePlan.isFallback
                    ? "Legacy / fallback rate plan"
                    : `Includes${selectedRatePlan.includesBreakfast ? " Breakfast" : ""}${selectedRatePlan.includesLunch ? ", Lunch" : ""}${selectedRatePlan.includesDinner ? ", Dinner" : ""}`}
                </div>
              )}
            </div>

            {roomRatePlans.length === 0 && !roomRatePlansLoading ? (
              <div className="col-span-12 text-sm text-gray-500">
                No rate plans found for the selected room.
              </div>
            ) : (
              OCCUPANCY_FIELDS.map(({ occupancyKey }) => (
                <div key={occupancyKey} className="col-span-12 md:col-span-3 lg:col-span-2">
                  <label className="block text-xs font-medium mb-1">
                    {occupancyKey} ({"\u20B9"})
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg px-3 py-2 text-sm border"
                    placeholder={`Enter ${occupancyKey}`}
                    value={currentOccupancyDraft[occupancyKey] || ""}
                    onChange={(e) => setRoomField(occupancyKey, e.target.value)}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ====== Range-based Occupancy Grid ====== */}
      {canLoadRangeView && (
        <div className="border rounded-xl bg-white shadow-sm mb-4 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h5 className="mb-0 font-semibold text-gray-800 text-sm md:text-base">
              Hotel Occupancy Details
            </h5>
            <div className="text-xs text-gray-600 text-right">
              <div className="font-medium">Selected Range</div>
              <div>{rangeSummary}</div>
            </div>
          </div>
          <div style={{ width: "100%", overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#4b0082 #e0e0e0" }}>
            <table style={{ borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0,0,0,0.1)", minWidth: `${540 + renderedRangeDates.length * 140}px` }}>
              <thead>
                <tr>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 0, minWidth: 180, zIndex: 5 }}>Room Name</th>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 180, minWidth: 180, zIndex: 5 }}>Room Type</th>
                  <th style={{ ...stickyHeaderBase, position: "sticky", left: 360, minWidth: 180, zIndex: 5 }}>Occupancy Type</th>
                  {renderedRangeDates.map((date) => (
                    <th key={`occ-header-${date}`} style={{ background: "linear-gradient(to bottom, rgb(114,49,207), rgb(195,60,166), rgb(238,63,206))", color: "white", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 16px", border: "1px solid #ddd", whiteSpace: "nowrap", textAlign: "center" }}>
                      {formatDateLabel(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {occupancyGridRows.length === 0 || renderedRangeDates.length === 0 ? (
                  <tr>
                    <td style={{ padding: "6px 10px", border: "1px solid #ddd", background: "#f4f4f4", color: "#666", textAlign: "center" }} colSpan={3 + Math.max(renderedRangeDates.length, 1)}>
                      No occupancy prices found for the selected room, rate plan, and date range.
                    </td>
                  </tr>
                ) : (
                  occupancyGridRows.map((row) => (
                    <tr key={`occ-range-${row.roomId}-${row.rateplanId}-${row.occupancyType}`}>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 0, minWidth: 180, zIndex: 4 }}>{row.roomName || "N/A"}</td>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 180, minWidth: 180, zIndex: 4 }}>{row.roomType || "N/A"}</td>
                      <td style={{ ...stickyBodyBase, position: "sticky", left: 360, minWidth: 180, zIndex: 4 }}>{row.occupancyType || "N/A"}</td>
                      {renderedRangeDates.map((date) => (
                        <td key={`${row.roomId}-${row.occupancyType}-${date}`} style={{ padding: "4px 16px", border: "1px solid #ddd", background: "#f9f9f9", color: "#333", whiteSpace: "nowrap", textAlign: "center" }}>
                          {formatCurrency(Number(row.values?.[date] || 0))}
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

        {/* Header â€” mirrors Room Details header style */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3 mb-3">
          <h5 className="font-semibold text-gray-800 text-sm md:text-base">Room Availability</h5>

          <div className="flex items-center gap-2 flex-wrap">
            <div
  className="relative"
  onMouseDown={(e) => {
    e.preventDefault();
    availStartRef.current?.showPicker?.();
  }}
>
  <input
    type="text"
    readOnly
    className="rounded-lg px-3 py-2 text-sm border cursor-pointer"
    placeholder="Start Date"
    value={availStartDate}
  />
  <input
    ref={availStartRef}
    type="date"
    value={availStartDate}
    onChange={(e) => {
      setAvailStartDate(e.target.value);
      setAvailError("");
      setAvailSuccess("");
    }}
    className="absolute inset-0 opacity-0 pointer-events-none"
  />
</div>
            <div
  className="relative"
  onMouseDown={(e) => {
    e.preventDefault();
    availEndRef.current?.showPicker?.();
  }}
>
  <input
    type="text"
    readOnly
    className="rounded-lg px-3 py-2 text-sm border cursor-pointer"
    placeholder="End Date"
    value={availEndDate}
  />
  <input
    ref={availEndRef}
    type="date"
    value={availEndDate}
    onChange={(e) => {
      setAvailEndDate(e.target.value);
      setAvailError("");
      setAvailSuccess("");
    }}
    className="absolute inset-0 opacity-0 pointer-events-none"
  />
</div>
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

        {/* Body â€” room dropdown + free rooms input, mirrors occupancy body grid */}
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

        {/* Read-back table â€” auto-loads when room + dates selected */}
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
