/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ItineraryService } from "@/services/itinerary";
import { DefaultRoutesSuggestions } from "@/components/DefaultRoutesSuggestions";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { SaveRouteConfirmDialog } from "./SaveRouteConfirmDialog";
import { ItineraryPlanBlock } from "../ItineraryPlanBlock";
import { RouteDetailsBlock } from "../RouteDetailsBlock";
import { VehicleBlock } from "../VehicleBlock";
import { ViaRouteDialog } from "../ViaRouteDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculateDaysBetweenDates,
  safeDateFromISO,
} from "./createItinerary.utils";
import { splitViaString } from "./itineraryUtils";

export const CreateItineraryView = ({ context }: { context: Record<string, any> }) => {
  const {
    agents, agentId, setAgentId, isAgentLogin, isVehicleAgentLogin, loggedInAgentId, locations,
    arrivalLocation, setArrivalLocation, departureLocation, setDepartureLocation,
    calendarLocationNames,
    itineraryTypes, itineraryTypeSelect, setItineraryTypeSelect,
    itineraryPreference, setItineraryPreference, travelTypes, arrivalType, setArrivalType,
    departureType, setDepartureType, entryTicketOptions, entryTicketRequired,
    setEntryTicketRequired, budget, setBudget, rooms, setRooms, addRoom, removeRoom,
    defaultRoomTemplate, setDefaultRoomTemplate,
    guideOptions, guideRequired, setGuideRequired, nationalities, nationality, setNationality,
   foodPreferences, foodPreference, setFoodPreference, mealPlanOptions, mealPlanCode,
setMealPlanCode, tripStartDate, setTripStartDate, tripEndDate, setTripEndDate,
startTime, setStartTime, endTime, setEndTime, hotelCategoryOptions, hotelFacilityOptions,

continueFromPlanId,
continuationSource,
    specialInstructions, setSpecialInstructions, validationErrors, selectedHotelCategoryIds,
    setSelectedHotelCategoryIds, selectedHotelFacilityIds, setSelectedHotelFacilityIds,
    requiresTransportEarlyArrivalPreference, transportEarlyArrivalOption,
    setTransportEarlyArrivalOption, transportEarlyArrivalHotelName,
    setTransportEarlyArrivalHotelName, transportEarlyArrivalRestMinutes,
    setTransportEarlyArrivalRestMinutes,
    noOfNights, noOfDays, isDefaultItineraryTypeSelected, activeDefaultRouteIndex,
    setSuggestedDefaultRoutes, setActiveDefaultRouteIndex, setRouteDetails, routeDetails,
    openViaRoutes, isViaRouteDisabled, deleteDay, refreshRouteDistance, deleteRouteDay, addDay,
    vehicleTypes, vehicles, setVehicles, selectedVehicleIds, addVehicle, removeVehicle,
    vehiclePaxValidationError,
    handleSaveClick, isSaving, showRouteConfirm, saveProgressPercent, estimatedSaveMs,
    saveErrorMessage,
    setSaveErrorMessage,
    pendingPayload, activeSaveType, FINAL_ITINERARY_LOADING_MESSAGES, transportLoadingMessageIndex,
    handleConfirmClose, handleSaveWithType, arrivalPolicyModal, setArrivalPolicyModal,
    isResolvingArrivalPolicy, getArrivalPolicyDecisionKey, runArrivalPolicyGate,
    setLastArrivalPolicyDecisionKey, applyArrivalPolicyDecision, setPendingPayload,
    continueToRouteConfirmation, viaDialogOpen, handleViaDialogOpenChange, viaRoutes,
    viaRoutesLoading, activeViaRouteRow, activeViaRouteIds, handleViaDialogSubmit,
  } = context;

  const continuationPlan = continuationSource?.plan ?? null;

const previousQuoteValue =
  continuationPlan?.itinerary_quote_ID ||
  continuationPlan?.itinerary_quote_id ||
  continuationPlan?.quoteId ||
  continuationPlan?.quote_id ||
  "";

const previousQuoteId = previousQuoteValue
  ? String(previousQuoteValue)
  : `Plan #${continueFromPlanId || ""}`;

const [previousDetailsOpen, setPreviousDetailsOpen] = useState(false);
const [previousDetails, setPreviousDetails] = useState<any | null>(null);
const [previousDetailsLoading, setPreviousDetailsLoading] = useState(false);

useEffect(() => {
  const quoteId = String(previousQuoteValue || "").trim();

  setPreviousDetailsOpen(false);
  setPreviousDetails(null);

  if (!continueFromPlanId || !quoteId) {
    return;
  }

  let cancelled = false;

  setPreviousDetailsLoading(true);

  ItineraryService.getDetails(quoteId)
    .then((data) => {
      if (!cancelled) {
        setPreviousDetails(data);
      }
    })
    .catch((error) => {
      console.error("Failed to load previous itinerary details", error);

      if (!cancelled) {
        setPreviousDetails(null);
      }
    })
    .finally(() => {
      if (!cancelled) {
        setPreviousDetailsLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, [continueFromPlanId, previousQuoteValue]);

const previousTripStartDate =
  continuationPlan?.trip_start_date_and_time
    ? safeDateFromISO(continuationPlan.trip_start_date_and_time)
    : "-";

const previousTripEndDate =
  continuationPlan?.trip_end_date_and_time
    ? safeDateFromISO(continuationPlan.trip_end_date_and_time)
    : "-";

const previousNights = Number(
  continuationPlan?.no_of_nights || 0
);

const previousDays = Number(
  continuationPlan?.no_of_days || 0
);

const previousAdults = Number(
  continuationPlan?.total_adult || 0
);

const previousChildren = Number(
  continuationPlan?.total_children || 0
);

const previousInfants = Number(
  continuationPlan?.total_infants || 0
);

const previousRoomCount = Number(
  continuationPlan?.preferred_room_count || 0
);

const previousExtraBed = Number(
  continuationPlan?.total_extra_bed || 0
);

const previousChildWithBed = Number(
  continuationPlan?.total_child_with_bed || 0
);

const previousChildWithoutBed = Number(
  continuationPlan?.total_child_without_bed || 0
);

const previousOverallCost = Number(
  previousDetails?.overallCost || 0
);

const previousDaysData = Array.isArray(previousDetails?.days)
  ? previousDetails.days
  : [];

const firstPreviousDay = previousDaysData[0] || null;
const remainingPreviousDays = previousDaysData.slice(1);

const previousFoodPreference =
  previousDetails?.guest_food_preference_name ||
  previousDetails?.guestFoodPreferenceName ||
  previousDetails?.guest_food_preference ||
  previousDetails?.guestFoodPreference ||
  previousDetails?.food_type_name ||
  previousDetails?.foodTypeName ||
  "";

const formatPreviousDate = (value: string) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPreviousShortDate = (value: string) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const previousEndDateValue = continuationPlan?.trip_end_date_and_time
  ? new Date(continuationPlan.trip_end_date_and_time)
  : null;

const isPreviousExpired =
  previousEndDateValue &&
  !Number.isNaN(previousEndDateValue.getTime()) &&
  previousEndDateValue.getTime() < new Date().setHours(0, 0, 0, 0);

  const allowedVehicleMatch = saveErrorMessage?.match(/Allowed vehicle types:\s*([\s\S]*)$/i);
  const allowedVehicleTypes = allowedVehicleMatch?.[1]
    ?.replace(/\.$/, '')
    .split(/,\s*/)
    .map((name: string) => name.trim())
    .filter(Boolean) || [];
const messageWithoutAllowedVehicles = allowedVehicleMatch && typeof allowedVehicleMatch.index === 'number'
  ? saveErrorMessage?.slice(0, allowedVehicleMatch.index).trim()
  : saveErrorMessage;

const isRoomOccupancyError = Boolean(
  saveErrorMessage &&
  /room .* (bed|occupancy|adult|child|infant)|maximum of 3 beds|only one child with bed|extra bed/i.test(
    saveErrorMessage,
  ),
);

const vehicleValidationMessage =
  vehiclePaxValidationError || validationErrors.vehicleType;
return (
  <div className="p-4 space-y-4">
{continueFromPlanId && continuationPlan && (
  <section className="overflow-hidden rounded-2xl border border-[#f1e1ed] bg-white shadow-sm">

    {/* Previous itinerary summary - always visible */}
    <div
      className="flex cursor-pointer select-none flex-col gap-4 bg-[#fef7fc] p-4 transition-colors hover:bg-[#faeff8] md:flex-row md:items-center md:justify-between"
      onClick={() => setPreviousDetailsOpen((current) => !current)}
    >
      {/* LEFT */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-xl font-bold tracking-wide text-[#b82580]">
            {previousQuoteId}
          </span>

          <span className="text-slate-300">|</span>

          <span className="font-medium text-slate-700">
            {previousTripStartDate} to {previousTripEndDate}
          </span>

          {(previousNights > 0 || previousDays > 0) && (
            <span className="text-xs font-medium text-slate-500">
              ({previousNights} N, {previousDays} D)
            </span>
          )}

          <span className="rounded-full border border-fuchsia-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#b82580]">
            ↻ Previous Leg
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span>Room Count</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700">
              {previousRoomCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Extra Bed</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700">
              {previousExtraBed}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Child with bed</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700">
              {previousChildWithBed}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Child without bed</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700">
              {previousChildWithoutBed}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col gap-2 md:items-end">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span>Adults</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700">
              {previousAdults}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Child</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700">
              {previousChildren}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Infants</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-700">
              {previousInfants}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {previousOverallCost > 0 && (
            <div className="text-sm font-semibold text-slate-700">
              Overall Trip Cost :{" "}
              <span className="text-lg font-extrabold text-[#b82580]">
                ₹ {previousOverallCost.toFixed(2)}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreviousDetailsOpen((current) => !current);
            }}
            className="flex items-center gap-1 rounded-md border border-[#edd2e5] bg-white px-2.5 py-1 text-xs font-semibold text-[#b82580] hover:bg-fuchsia-50"
          >
            {previousDetailsOpen ? "Hide Details" : "View Details"}

            <span
              className={`inline-block transition-transform duration-300 ${
                previousDetailsOpen ? "rotate-180" : ""
              }`}
            >
              ⌄
            </span>
          </button>
        </div>
      </div>
    </div>

    {/* Expand previous itinerary */}
    {previousDetailsOpen && (
      <div className="space-y-4 border-t border-[#f4e6f1] bg-white p-5">

        {previousDetailsLoading && (
          <div className="py-4 text-center text-xs text-slate-500">
            Loading previous itinerary...
          </div>
        )}

        {!previousDetailsLoading && previousDetails && (
          <>
            {/* Same archived message from senior HTML,
                but only when the itinerary is actually expired */}
            {isPreviousExpired && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600">
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Archived
                </span>

                <span>
                  This itinerary has expired. Persisted database details are
                  shown for reference; editing and quotation confirmation are
                  disabled.
                </span>
              </div>
            )}

            {/* Senior HTML shows first day in full */}
            {firstPreviousDay && (
              <div className="overflow-hidden rounded-xl border border-slate-200">

                {/* Day heading */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="font-bold text-slate-800">
                      DAY {firstPreviousDay.dayNumber}

                      <span className="ml-2 font-normal text-slate-500">
                        — {formatPreviousDate(firstPreviousDay.date)}
                      </span>
                    </div>

                    <div className="font-medium text-slate-600">
                      {firstPreviousDay.departure || "-"}
                      <span className="mx-2 text-slate-400">→</span>
                      {firstPreviousDay.arrival || "-"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
                      {firstPreviousDay.startTime || "-"}
                      <span className="mx-1">→</span>
                      {firstPreviousDay.endTime || "-"}
                    </div>

                    {firstPreviousDay.distance && (
                      <span className="rounded-full bg-[#b82580] px-2.5 py-1 text-[11px] font-bold text-white">
                        {firstPreviousDay.distance}
                      </span>
                    )}
                  </div>
                </div>

                {/* Food preference */}
                {previousFoodPreference && (
                  <div className="border-b border-slate-100 bg-white px-4 py-2 text-xs text-slate-600">
                    Food Preference:{" "}
                    <strong className="text-slate-800">
                      {previousFoodPreference}
                    </strong>
                  </div>
                )}

                {/* Previous itinerary timeline */}
                <div className="space-y-3 bg-white p-4 text-xs">
                  {(Array.isArray(firstPreviousDay.segments)
                    ? firstPreviousDay.segments
                    : []
                  ).map((segment: any, index: number) => {

                    if (segment.type === "start") {
                      return (
                        <div
                          key={`previous-start-${index}`}
                          className="flex items-center gap-3 pl-1 text-slate-600"
                        >
                          <span>🚗</span>

                          <span className="font-semibold text-slate-800">
                            {segment.title || "Start your Journey"}
                          </span>

                          {segment.timeRange && (
                            <span className="text-slate-400">
                              ({segment.timeRange})
                            </span>
                          )}
                        </div>
                      );
                    }

                    if (segment.type === "travel") {
                      return (
                        <div
                          key={`previous-travel-${index}`}
                          className="flex flex-col justify-between gap-2 rounded-lg border border-sky-100 bg-sky-50/60 p-2.5 text-[11px] text-slate-600 md:flex-row md:items-center"
                        >
                          <div>
                            🚙 Travelling from{" "}
                            <strong className="text-slate-700">
                              {segment.from}
                            </strong>{" "}
                            to{" "}
                            <strong className="text-slate-700">
                              {segment.to}
                            </strong>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-slate-500">
                            {segment.timeRange && (
                              <span>◷ {segment.timeRange}</span>
                            )}

                            {segment.distance && (
                              <span>⌁ {segment.distance}</span>
                            )}

                            {segment.duration && (
                              <span>⌛ {segment.duration}</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (segment.type === "attraction") {
                      return (
                        <div
                          key={`previous-attraction-${index}`}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-800">
                              {segment.name}
                            </div>

                            {segment.description && (
                              <p className="text-xs text-slate-500">
                                {segment.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                              {segment.visitTime && (
                                <span className="font-semibold text-[#b82580]">
                                  ◷ {segment.visitTime}
                                </span>
                              )}

                              {segment.duration && (
                                <span>◉ {segment.duration}</span>
                              )}

                              {segment.timings && (
                                <span>{segment.timings}</span>
                              )}
                            </div>
                          </div>

                          {segment.image && (
                            <div className="h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                              <img
                                src={segment.image}
                                alt={segment.name || "Previous itinerary"}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (segment.type === "break") {
                      return (
                        <div
                          key={`previous-break-${index}`}
                          className="rounded-lg border border-amber-100 bg-amber-50/60 p-2.5 text-[11px] text-slate-600"
                        >
                          <strong>{segment.location}</strong>

                          {segment.timeRange && (
                            <span className="ml-2">
                              {segment.timeRange}
                            </span>
                          )}

                          {segment.duration && (
                            <span className="ml-2">
                              {segment.duration}
                            </span>
                          )}
                        </div>
                      );
                    }

                    if (segment.type === "checkin") {
                      return (
                        <div
                          key={`previous-checkin-${index}`}
                          className="rounded-xl border border-sky-200 bg-sky-50 p-3"
                        >
                          <div className="font-semibold text-slate-800">
                            Check-in to {segment.hotelName}
                          </div>

                          {segment.hotelAddress && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {segment.hotelAddress}
                            </div>
                          )}

                          {segment.time && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              ◷ {segment.time}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (segment.type === "return") {
                      return (
                        <div
                          key={`previous-return-${index}`}
                          className="flex items-center gap-2 text-slate-600"
                        >
                          <span>🚗</span>

                          <span className="font-semibold text-slate-800">
                            Return to Origin and Relax
                          </span>

                          {segment.time && (
                            <span className="text-slate-400">
                              {segment.time}
                            </span>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Senior HTML keeps remaining days compact */}
            {remainingPreviousDays.length > 0 && (
              <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                {remainingPreviousDays.map((day: any) => (
                  <div
                    key={day.id || day.dayNumber}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div>
                      <div className="font-bold text-slate-700">
                        DAY {day.dayNumber} •{" "}
                        {formatPreviousShortDate(day.date)}
                      </div>

                      <div className="mt-1 text-[11px] text-slate-500">
                        {day.departure || "-"}
                        <span className="mx-1">→</span>
                        {day.arrival || "-"}
                      </div>
                    </div>

                    <span className="text-emerald-500">
                      ●
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )}
  </section>
)}

    <ItineraryPlanBlock
      agents={agents}
        agentId={agentId}
        setAgentId={setAgentId}
        isAgentLocked={Boolean(isAgentLogin && loggedInAgentId)}
        isVehicleAgent={Boolean(isVehicleAgentLogin)}
        locations={locations}
        arrivalLocation={arrivalLocation}
        setArrivalLocation={setArrivalLocation}
        departureLocation={departureLocation}
        setDepartureLocation={setDepartureLocation}
        calendarLocationNames={calendarLocationNames}
        itineraryTypes={itineraryTypes}
        itineraryTypeSelect={itineraryTypeSelect}
        setItineraryTypeSelect={setItineraryTypeSelect}
        itineraryPreference={itineraryPreference}
        setItineraryPreference={setItineraryPreference}
        travelTypes={travelTypes}
        arrivalType={arrivalType}
        setArrivalType={setArrivalType}
        departureType={departureType}
        setDepartureType={setDepartureType}
        entryTicketOptions={entryTicketOptions}
        entryTicketRequired={entryTicketRequired}
        setEntryTicketRequired={setEntryTicketRequired}
        budget={budget}
        setBudget={setBudget}
        rooms={rooms}
        setRooms={setRooms}
        addRoom={addRoom}
        removeRoom={removeRoom}
        defaultRoomTemplate={defaultRoomTemplate}
        setDefaultRoomTemplate={setDefaultRoomTemplate}
        guideOptions={guideOptions}
        guideRequired={guideRequired}
        setGuideRequired={setGuideRequired}
        nationalities={nationalities}
        nationality={nationality}
        setNationality={setNationality}
        foodPreferences={foodPreferences}
        foodPreference={foodPreference}
        setFoodPreference={setFoodPreference}
        mealPlanOptions={mealPlanOptions}
        mealPlanCode={mealPlanCode}
        setMealPlanCode={setMealPlanCode}
        tripStartDate={tripStartDate}
        setTripStartDate={setTripStartDate}
        tripEndDate={tripEndDate}
        setTripEndDate={setTripEndDate}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        hotelCategoryOptions={hotelCategoryOptions}
        hotelFacilityOptions={hotelFacilityOptions}
        specialInstructions={specialInstructions}
        setSpecialInstructions={setSpecialInstructions}
        requiresTransportEarlyArrivalPreference={requiresTransportEarlyArrivalPreference}
        transportEarlyArrivalOption={transportEarlyArrivalOption}
        setTransportEarlyArrivalOption={setTransportEarlyArrivalOption}
        transportEarlyArrivalHotelName={transportEarlyArrivalHotelName}
        setTransportEarlyArrivalHotelName={setTransportEarlyArrivalHotelName}
        transportEarlyArrivalRestMinutes={transportEarlyArrivalRestMinutes}
        setTransportEarlyArrivalRestMinutes={setTransportEarlyArrivalRestMinutes}
        validationErrors={validationErrors}
        selectedHotelCategoryIds={selectedHotelCategoryIds}
        setSelectedHotelCategoryIds={setSelectedHotelCategoryIds}
        selectedHotelFacilityIds={selectedHotelFacilityIds}
        setSelectedHotelFacilityIds={setSelectedHotelFacilityIds}
        noOfNights={noOfNights}
        noOfDays={noOfDays}
      />

      <div
        data-field="firstRouteSource"
        className={
          validationErrors.firstRouteSource || validationErrors.firstRouteNext
            ? "border border-red-500 rounded-md p-2"
            : ""
        }
      >
       {/* Show suggested/default routes if itinerary type is Default/Suggested Routes */}
{itineraryTypeSelect && isDefaultItineraryTypeSelected() ? (
          <DefaultRoutesSuggestions
  arrivalLocation={arrivalLocation}
  departureLocation={departureLocation}
  noOfDays={calculateDaysBetweenDates(tripStartDate, tripEndDate)}
  startDate={tripStartDate}
  endDate={tripEndDate}
  activeRouteIndex={activeDefaultRouteIndex}
  onRoutesLoaded={(routes) => {
    setSuggestedDefaultRoutes(routes.length > 0 ? [routes[0]] : []);
    setActiveDefaultRouteIndex(0);
  }}
  onSelectedRoutesChange={(selectedRoutes) => {
    setSuggestedDefaultRoutes(selectedRoutes);
  }}
  onRouteSelect={(route, index) => {
    setActiveDefaultRouteIndex(index);
  }}
            onNoRoutesFound={() => {
              const customizeType = itineraryTypes.find((t) => t.label === "Customize");
              if (customizeType) {
                setItineraryTypeSelect(customizeType.id);
              }
            }}
            locations={locations}
            routeDetails={routeDetails}
            setRouteDetails={setRouteDetails}
            onOpenViaRoutes={openViaRoutes}
            onDeleteDay={deleteDay}
          />
        ) : (
<RouteDetailsBlock
  locations={locations}
  routeDetails={routeDetails}
  setRouteDetails={setRouteDetails}
  onOpenViaRoutes={openViaRoutes}
  isViaRouteDisabled={isViaRouteDisabled}
  onRefreshRouteDistance={refreshRouteDistance}
  departureLocation={departureLocation}
  hideIntercityKm={true}
  onDeleteDay={deleteDay}
  onDeleteRouteDay={deleteRouteDay}
  addDay={addDay}
/>
        )}
        {validationErrors.firstRouteSource && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.firstRouteSource}</p>
        )}
        {validationErrors.firstRouteNext && (
          <p className="mt-1 text-xs text-red-500">{validationErrors.firstRouteNext}</p>
        )}
      </div>

<div
  data-field="vehicleType"
  className={vehicleValidationMessage ? "border border-red-500 rounded-md p-2" : ""}
>
  <VehicleBlock
    vehicleTypes={vehicleTypes}
    vehicles={vehicles}
    setVehicles={setVehicles}
    selectedVehicleIds={selectedVehicleIds}
    addVehicle={addVehicle}
    removeVehicle={removeVehicle}
    itineraryPreference={itineraryPreference}
  />
  {vehicleValidationMessage && (
    <p className="mt-1 text-xs text-red-500">{vehicleValidationMessage}</p>
  )}
</div>

      <div className="flex justify-center pt-1">
        <Button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="min-w-[220px] rounded-full bg-gradient-to-r from-[#ff5aa5] to-[#7b3fe4] py-2 text-base font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save & Continue"}
        </Button>
      </div>

      <Dialog
        open={Boolean(saveErrorMessage)}
        onOpenChange={(open) => {
          if (!open) setSaveErrorMessage(null);
        }}
      >
        <DialogContent className={`max-w-xl ${isRoomOccupancyError ? "border-amber-300" : "border-red-200"}`} onClose={() => setSaveErrorMessage(null)}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isRoomOccupancyError ? "text-amber-800" : "text-red-700"}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${isRoomOccupancyError ? "bg-amber-100" : "bg-red-100"}`}>!</span>
              {isRoomOccupancyError ? "Room occupancy not allowed" : "Vehicle route restriction"}
            </DialogTitle>
          <DialogDescription>
              {isRoomOccupancyError
                ? "The itinerary was not saved because one room exceeds the allowed bed or occupancy rules."
                : saveErrorMessage && /This is a vehicle-type restriction|Changing the departure time will not remove this restriction/i.test(saveErrorMessage)
                ? "This itinerary cannot be saved because the selected vehicle is not permitted on this route."
                : saveErrorMessage && /This restriction applies to every vehicle/i.test(saveErrorMessage)
                  ? "This itinerary cannot be saved because every vehicle is restricted during this time window."
                  : "The requested timeline cannot be saved with the selected vehicle and departure time."}
            </DialogDescription>
          </DialogHeader>
          <div role="alert" className={`rounded-md px-4 py-3 text-sm leading-6 ${isRoomOccupancyError ? "border border-amber-300 bg-amber-50 text-amber-950" : "border border-red-200 bg-red-50 text-red-900"}`}>
            {messageWithoutAllowedVehicles}
          </div>
          {!isRoomOccupancyError && allowedVehicleTypes.length > 0 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-900">Allowed vehicle types</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {allowedVehicleTypes.map((vehicleType: string) => (
                  <span key={vehicleType} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm">
                    {vehicleType}
                  </span>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveErrorMessage(null)}>
              {isRoomOccupancyError
                ? "Review room occupancy"
                : saveErrorMessage && /This is a vehicle-type restriction|Changing the departure time will not remove this restriction/i.test(saveErrorMessage)
                ? "Choose another vehicle"
                : saveErrorMessage && /This restriction applies to every vehicle/i.test(saveErrorMessage)
                  ? "Change departure time or route"
                  : "Change vehicle or departure time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaveRouteConfirmDialog
        open={showRouteConfirm}
        suggestedRouteSelected={isDefaultItineraryTypeSelected()}
        isSaving={isSaving}
        progressPercent={saveProgressPercent}
        estimatedSeconds={Math.round((estimatedSaveMs || 0) / 1000)}
        dayCount={Math.max(1, Number(pendingPayload?.plan?.no_of_days ?? noOfDays ?? 1))}
                saveType={activeSaveType}
        transportLoadingMessage={
          FINAL_ITINERARY_LOADING_MESSAGES[
            transportLoadingMessageIndex % FINAL_ITINERARY_LOADING_MESSAGES.length
          ]
        }
        onClose={handleConfirmClose}
        onSaveSameRoute={() => handleSaveWithType("itineary_basic_info")}
        onOptimizeRoute={() => handleSaveWithType("itineary_basic_info_with_optimized_route")}
      />

      <ArrivalHotelDecisionModal
        open={arrivalPolicyModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setArrivalPolicyModal({
              open: false,
              arrivalDate: "",
              previousDayDate: "",
              request: null,
            });
          }
        }}
        arrivalDate={arrivalPolicyModal.arrivalDate}
        previousDayDate={arrivalPolicyModal.previousDayDate}
        isLoading={isResolvingArrivalPolicy}
        onConfirmPreviousDayBilling={async () => {
          if (!arrivalPolicyModal.request) return;
          const decisionKey = getArrivalPolicyDecisionKey(arrivalPolicyModal.request);
          const canProceed = await runArrivalPolicyGate({
            ...arrivalPolicyModal.request,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          });
          if (!canProceed) return;

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }

          applyArrivalPolicyDecision({
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          });

          setPendingPayload((prev: any) => prev ? {
            ...prev,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: true,
          } : prev);

          setArrivalPolicyModal({
            open: false,
            arrivalDate: "",
            previousDayDate: "",
            request: null,
          });
          continueToRouteConfirmation();
        }}
        onDeclinePreviousDayBilling={async () => {
          if (!arrivalPolicyModal.request) return;
          const decisionKey = getArrivalPolicyDecisionKey(arrivalPolicyModal.request);
          const canProceed = await runArrivalPolicyGate({
            ...arrivalPolicyModal.request,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          });
          if (!canProceed) return;

          if (decisionKey) {
            setLastArrivalPolicyDecisionKey(decisionKey);
          }

          applyArrivalPolicyDecision({
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          });

          setPendingPayload((prev: any) => prev ? {
            ...prev,
            previousDayBillingDecisionProvided: true,
            previousDayBillingConfirmed: false,
          } : prev);

          setArrivalPolicyModal({
            open: false,
            arrivalDate: "",
            previousDayDate: "",
            request: null,
          });
          continueToRouteConfirmation();
        }}
      />

      <ViaRouteDialog
        open={viaDialogOpen}
        onOpenChange={handleViaDialogOpenChange}
        routes={viaRoutes}
        loading={viaRoutesLoading}
        activeRoute={
          activeViaRouteRow
            ? {
                day: activeViaRouteRow.day,
                date: activeViaRouteRow.date,
                source: activeViaRouteRow.source,
                next: activeViaRouteRow.next,
                initialSelected: splitViaString(activeViaRouteRow.via),
              }
            : null
        }
        initialIds={activeViaRouteIds}
        maxRoutes={2}
        onSubmit={handleViaDialogSubmit}
      />

    </div>
  );
};
