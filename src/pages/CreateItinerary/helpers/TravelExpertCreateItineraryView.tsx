/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ItineraryService } from "@/services/itinerary";
import { DefaultRoutesSuggestions } from "@/components/DefaultRoutesSuggestions";
import { ArrivalHotelDecisionModal } from "@/components/hotels/ArrivalHotelDecisionModal";
import { SaveRouteConfirmDialog } from "./SaveRouteConfirmDialog";
import { ItineraryPlanBlock } from "../TravelExpertItineraryPlanBlock";
import { RouteDetailsBlock } from "../TravelExpertRouteDetailsBlock";
import { VehicleBlock } from "../TravelExpertVehicleBlock";
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
  addDaysToDDMMYYYY,
  calculateDaysBetweenDates,
  safeDateFromISO,
  safeTimeFromISO,
} from "./createItinerary.utils";
import { splitViaString } from "./itineraryUtils";
import { getAuthenticatedRoleId, getAuthenticatedUser } from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";
import { SmartBookingPackages } from "./SmartBookingPackages";
import "./travelExpertCabs.css";
import { getAuthenticatedUser as getHotelFlowUser, getAuthenticatedRoleId as getHotelFlowRoleId } from "@/services/accessControl";
import { USER_ROLES as HOTEL_FLOW_ROLES } from "@/constants/systemRoles";

export const CreateItineraryView = ({ context }: { context: Record<string, any> }) => {
  const {
    smartBookingImportedRoutes = [],
    pageMode,
    agents,
agentId,
setAgentId,
pendingNewAgent,
setPendingNewAgent,
isAgentLogin,
isVehicleAgentLogin,
loggedInAgentId,
locations,
arrivalLocation,
setArrivalLocation,
departureLocation,
setDepartureLocation,
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
setTransportEarlyArrivalHotelName,
transportEarlyArrivalLocationName,
setTransportEarlyArrivalLocationName,

transportOvernightLocationName,
setTransportOvernightLocationName,
transportEarlyArrivalRestMinutes, setTransportEarlyArrivalRestMinutes,
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
  // Hide the original itinerary/route editor only for the authorized
  // Travel Expert hotel-search view. Never change other roles or modes.
  const hotelFlowUser = getHotelFlowUser();
  const hotelFlowRole = getHotelFlowRoleId(hotelFlowUser);
  const hideLegacyItineraryForTravelExpertHotel =
    pageMode === "create-itinerary" &&
    itineraryPreference === "hotel" &&
    (hotelFlowRole === HOTEL_FLOW_ROLES.TRAVEL_EXPERT ||
      (hotelFlowRole === HOTEL_FLOW_ROLES.STAFF &&
        Number(hotelFlowUser?.permissionRoleId ?? 0) === 3 &&
        Number(hotelFlowUser?.staffId ?? hotelFlowUser?.staff_id ?? 0) > 0));

const [
  activeContinuationSource,
  setActiveContinuationSource,
] = useState<any | null>(null);

const [previousDetailsOpen, setPreviousDetailsOpen] =
  useState(false);

const [previousDetails, setPreviousDetails] =
  useState<any | null>(null);

// Selected hotel information for the currently viewed previous leg.
const [previousHotelDetails, setPreviousHotelDetails] =
  useState<any | null>(null);

const [previousHotelsLoading, setPreviousHotelsLoading] =
  useState(false);

const [previousHotelGroupType, setPreviousHotelGroupType] =
  useState(1);

const [
  previousDetailsLoading,
  setPreviousDetailsLoading,
] = useState(false);

const [
  previousHistoryLoading,
  setPreviousHistoryLoading,
] = useState(false);

const [previousLegSources, setPreviousLegSources] =
  useState<any[]>([]);

// Reset to the immediate previous itinerary whenever
// Continue Planning is opened for another plan.
const handlePreviousLegClick =
  async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    // First/root itinerary has no older leg.
    // In that case Previous Leg simply opens its details.
    if (!previousParentPlanId) {
      setPreviousDetailsOpen(true);
      return;
    }

    if (previousHistoryLoading) {
      return;
    }

    setPreviousHistoryLoading(true);

    try {
      const olderPrevious =
        await ItineraryService.getOne(
          previousParentPlanId,
        );

      if (olderPrevious?.plan) {
        setActiveContinuationSource(
          olderPrevious,
        );

        setPreviousDetailsOpen(true);
      }
    } catch (error) {
      console.error(
        "Failed to load older previous itinerary",
        error,
      );
    } finally {
      setPreviousHistoryLoading(false);
    }
  };

useEffect(() => {
  setActiveContinuationSource(
    continuationSource,
  );

  setPreviousDetailsOpen(false);
  setPreviousDetails(null);
}, [
  continueFromPlanId,
  continuationSource,
]);

// Load every previous leg, ordered from oldest to newest.
useEffect(() => {
  let cancelled = false;

  setPreviousLegSources([]);

  if (!continueFromPlanId || !continuationSource?.plan) {
    return;
  }

  const loadPreviousLegs = async () => {
    const sources: any[] = [continuationSource];
    const visited = new Set<number>();

    const currentId = Number(
      continuationSource.plan.itinerary_plan_ID || continueFromPlanId
    );

    if (currentId > 0) {
      visited.add(currentId);
    }

    let parentId = Number(
      continuationSource.plan.continued_from_plan_ID ||
      continuationSource.plan.continuedFromPlanId ||
      0
    );

    try {
      while (parentId > 0 && !visited.has(parentId)) {
        visited.add(parentId);

        const parentSource = await ItineraryService.getOne(parentId);

        if (!parentSource?.plan) {
          break;
        }

        sources.push(parentSource);

        parentId = Number(
          parentSource.plan.continued_from_plan_ID ||
          parentSource.plan.continuedFromPlanId ||
          0
        );
      }
    } catch (error) {
      console.error(
        "Failed to load complete continuation history",
        error
      );
    } finally {
      if (!cancelled) {
        setPreviousLegSources([...sources].reverse());
      }
    }
  };

  void loadPreviousLegs();

  return () => {
    cancelled = true;
  };
}, [continueFromPlanId, continuationSource]);

const continuationPlan =
  activeContinuationSource?.plan ??
  continuationSource?.plan ??
  null;

// IMPORTANT:
// Date restriction must always use the itinerary that
// Continue Planning was opened from.
//
// Do not use activeContinuationSource here because that
// changes when the user browses older Previous Legs.
const immediateContinuationPlan =
  continuationSource?.plan ?? null;

const continuationSourceEndDate =
  immediateContinuationPlan?.trip_end_date_and_time
    ? safeDateFromISO(
        immediateContinuationPlan.trip_end_date_and_time,
      )
    : "";

const continuationMinimumTripDate =
  continueFromPlanId && continuationSourceEndDate
    ? continuationSourceEndDate
    : "";

const continuationMinimumStartTime =
  continueFromPlanId &&
  immediateContinuationPlan?.trip_end_date_and_time
    ? safeTimeFromISO(
        immediateContinuationPlan.trip_end_date_and_time,
        "",
      )
    : "";

const activePreviousPlanId = Number(
  continuationPlan?.itinerary_plan_ID ||
    continueFromPlanId ||
    0,
);

useEffect(() => {
  setPreviousHotelGroupType(1);
}, [activePreviousPlanId]);

const previousParentPlanId = Number(
  continuationPlan?.continued_from_plan_ID ||
    0,
);

// IMPORTANT:
// Actual quote remains unique and is used for API calls.
const previousQuoteValue =
  continuationPlan?.itinerary_quote_ID ||
  continuationPlan?.itinerary_quote_id ||
  continuationPlan?.quoteId ||
  continuationPlan?.quote_id ||
  "";

// Root quote is display-only.
// This is how all continuation legs show the same DVI ID.
const previousQuoteId = String(
  continuationPlan?.continuation_root_quote_ID ||
    previousQuoteValue ||
    `Plan #${activePreviousPlanId || ""}`,
);

useEffect(() => {
  const quoteId =
    String(previousQuoteValue || "").trim();

  setPreviousDetails(null);

  if (!activePreviousPlanId || !quoteId) {
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
}, [
  activePreviousPlanId,
  previousQuoteValue,
]);

// Load hotel information independently for each previous leg.
// Uses the actual quote ID, not the common continuation/root quote ID.
useEffect(() => {
  const quoteId = String(previousQuoteValue || "").trim();

  setPreviousHotelDetails(null);

  if (!activePreviousPlanId || !quoteId) {
    setPreviousHotelsLoading(false);
    return;
  }

  let cancelled = false;

  setPreviousHotelsLoading(true);

  ItineraryService.getHotelDetails(quoteId)
    .then((data) => {
      if (!cancelled) {
        setPreviousHotelDetails(data);
      }
    })
    .catch((error) => {
      console.error(
        "Failed to load previous leg hotel details",
        error
      );

      if (!cancelled) {
        setPreviousHotelDetails(null);
      }
    })
    .finally(() => {
      if (!cancelled) {
        setPreviousHotelsLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, [activePreviousPlanId, previousQuoteValue]);

const previousTripStartDate =
  continuationPlan?.trip_start_date_and_time
    ? new Date(continuationPlan.trip_start_date_and_time).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        },
      )
    : "-";

const previousTripEndDate =
  continuationPlan?.trip_end_date_and_time
    ? new Date(continuationPlan.trip_end_date_and_time).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        },
      )
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

const previousBaseOverallCost = Number(
  previousDetails?.overallCost || 0,
);

const previousSavedProfit =
  typeof window !== "undefined" &&
  previousQuoteValue
    ? Number(
        window.localStorage.getItem(
          `public-itinerary-profit:${previousQuoteValue}`,
        ) || 0,
      )
    : 0;

const safePreviousProfit =
  Number.isFinite(previousSavedProfit) &&
  previousSavedProfit > 0
    ? previousSavedProfit
    : 0;

const previousCostBreakdown =
  previousDetails?.costBreakdown;

const previousItineraryPreference = Number(
  previousDetails?.itineraryPreference || 0,
);

/*
 * Agent + Hotel + Vehicle:
 *
 * Continue Planning must use the same live values
 * that the Cost Summary used on the itinerary page.
 *
 * Cost Summary stores:
 *
 * - vehicle total
 * - recommendation hotel totals
 * - Agent profit
 *
 * in localStorage.
 */
const previousStoredVehicleTotal =
  typeof window !== "undefined" &&
  previousQuoteValue
    ? Number(
        window.localStorage.getItem(
          `public-itinerary-vehicle-total:${previousQuoteValue}`,
        ) || 0,
      )
    : 0;

const previousStoredHotelTotals =
  (() => {
    if (
      typeof window === "undefined" ||
      !previousQuoteValue
    ) {
      return {} as Record<number, number>;
    }

    try {
      const raw =
        window.localStorage.getItem(
          `public-itinerary-hotel-totals:${previousQuoteValue}`,
        );

      if (!raw) {
        return {} as Record<number, number>;
      }

      const parsed = JSON.parse(raw);

      return Object.entries(
        parsed as Record<string, unknown>,
      ).reduce<Record<number, number>>(
        (result, [groupType, value]) => {
          const key = Number(groupType);
          const amount = Number(value);

          if (
            key > 0 &&
            Number.isFinite(amount) &&
            amount > 0
          ) {
            result[key] = amount;
          }

          return result;
        },
        {},
      );
    } catch {
      return {} as Record<number, number>;
    }
  })();

/*
 * Continue Planning opens from the currently created itinerary.
 *
 * Recommendation #1 is the persisted/default package when
 * there is no explicit recommendation information available.
 */
const previousStoredHotelAmount =
  Number(
    previousStoredHotelTotals[1] || 0,
  );

const previousBackendHotelAmount = Number(
  previousCostBreakdown?.totalHotelAmount ??
    previousCostBreakdown?.totalRoomCost ??
    0,
);

const previousBackendVehicleAmount = Number(
  previousCostBreakdown?.totalVehicleAmount ??
    previousCostBreakdown?.totalVehicleCost ??
    0,
);

const previousHotelAmount =
  previousStoredHotelAmount > 0
    ? previousStoredHotelAmount
    : previousBackendHotelAmount;

const previousVehicleAmount =
  previousStoredVehicleTotal > 0
    ? previousStoredVehicleTotal
    : previousBackendVehicleAmount;

const previousAdditionalMargin = Number(
  previousCostBreakdown?.additionalMargin ?? 0,
);

const hasPreviousHotelVehiclePricing =
  previousHotelAmount > 0 ||
  previousVehicleAmount > 0;

/*
 * Same formula as Agent Cost Summary:
 *
 * Hotel
 * + Vehicle
 * + Additional Margin
 * + Profit
 *
 * Final value is rounded exactly like Final Selling Price.
 */
const previousAgentHotelVehicleAmount =
  previousHotelAmount +
  previousVehicleAmount +
  previousAdditionalMargin +
  safePreviousProfit;

const previousOverallCost =
  isAgentLogin &&
  previousItineraryPreference === 3 &&
  hasPreviousHotelVehiclePricing
    ? Math.round(
        previousAgentHotelVehicleAmount,
      )
    : previousBaseOverallCost +
      safePreviousProfit;

const previousDaysData = Array.isArray(previousDetails?.days)
  ? previousDetails.days
  : [];

// Read-only vehicles belonging to the selected previous leg.
const previousVehicleRows = Array.isArray(previousDetails?.vehicles)
  ? previousDetails.vehicles
  : [];

const previousVehicleSelections = Array.isArray(
  previousDetails?.vehicleSelections
)
  ? previousDetails.vehicleSelections
  : [];

const previousSelectedVehicles = previousVehicleRows.filter(
  (vehicle: any) => {
    if (previousVehicleSelections.length > 0) {
      return previousVehicleSelections.some((selection: any) => {
        if (
          Number(selection.vehicleTypeId) !==
          Number(vehicle.vehicleTypeId)
        ) {
          return false;
        }

        const eligibleIds = [
          selection.selectedVendorEligibleId,
          ...(selection.assignedVendorEligibleIds || []),
        ].filter((id) => id != null);

        return eligibleIds.some(
          (id) =>
            Number(id) === Number(vehicle.vendorEligibleId)
        );
      });
    }

    return vehicle.isAssigned === true;
  }
);
// Existing API hotel rows.
const previousHotelRows = Array.isArray(previousHotelDetails?.hotels)
  ? previousHotelDetails.hotels
  : [];

// Read the persisted selected hotel state, not all recommendations.
const previousSelectionGroups = Array.isArray(
  previousHotelDetails?.hotelSelectionState
)
  ? previousHotelDetails.hotelSelectionState
  : [];

const selectedPreviousHotelRoutes = previousSelectionGroups
  .filter(
    (group: any) =>
      Number(group.groupType) === previousHotelGroupType
  )
  .flatMap((group: any) =>
    Array.isArray(group.routes)
      ? group.routes
          .filter(
            (route: any) =>
              route.selectionStatus === "SELECTED" &&
              route.selected?.hotelName
          )
          .map((route: any) => ({
            ...route,
            groupType: Number(group.groupType),
          }))
      : []
  );

// Only selected hotel records are displayed.
const previousSelectedHotels = selectedPreviousHotelRoutes.map(
  (route: any) => {
    const selected = route.selected;

    const matchedHotel = previousHotelRows.find((hotel: any) => {
     const sameGroup =
  Number(hotel.groupType) === previousHotelGroupType;

      const sameRoute =
        Number(hotel.itineraryRouteId) === Number(route.routeId) ||
        (Array.isArray(hotel.routeIds) &&
          hotel.routeIds.some(
            (id: number) => Number(id) === Number(route.routeId)
          ));

      const selectedCode = String(
        selected.providerHotelCode || selected.hotelCode || ""
      ).trim();

      const rowCode = String(
        hotel.providerHotelCode || hotel.hotelCode || ""
      ).trim();

      const sameHotel = selectedCode && rowCode
        ? selectedCode === rowCode
        : String(hotel.hotelName || "").trim().toLowerCase() ===
          String(selected.hotelName || "").trim().toLowerCase();

      return sameGroup && sameRoute && sameHotel;
    });

    return {
      key: `${route.groupType}-${route.routeId}`,
      date: route.routeDate,
      hotelName: selected.hotelName,
      destination: matchedHotel?.destination || "",
      roomType: selected.roomType || matchedHotel?.roomType || "",
      mealPlan: selected.mealPlan || matchedHotel?.mealPlan || "",
      provider: selected.provider || matchedHotel?.provider || "",
      image: matchedHotel?.primaryImageUrl || "",
    };
  }
);

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


const previousEndDateValue = continuationPlan?.trip_end_date_and_time
  ? new Date(continuationPlan.trip_end_date_and_time)
  : null;

const isPreviousExpired =
  previousEndDateValue &&
  !Number.isNaN(previousEndDateValue.getTime()) &&
  previousEndDateValue.getTime() < new Date().setHours(0, 0, 0, 0);
const renderPreviousDay = (day: any) => (
  <div
    key={
      day.id ||
      day.dayNumber ||
      day.date
    }
    className="overflow-hidden rounded-xl border border-slate-200"
  >
    {/* Day heading */}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-3.5 text-xs">
      <div className="flex flex-wrap items-center gap-4">
        <div className="font-bold text-slate-800">
          DAY {day.dayNumber}

          <span className="ml-2 font-normal text-slate-500">
            — {formatPreviousDate(day.date)}
          </span>
        </div>

        <div className="font-medium text-slate-600">
          {day.departure || "-"}

          <span className="mx-2 text-slate-400">
            →
          </span>

          {day.arrival || "-"}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
          {day.startTime || "-"}

          <span className="mx-1">
            →
          </span>

          {day.endTime || "-"}
        </div>

        {day.distance && (
          <span className="rounded-full bg-[#b82580] px-2.5 py-1 text-[11px] font-bold text-white">
            {day.distance}
          </span>
        )}
      </div>
    </div>

    {previousFoodPreference && (
      <div className="border-b border-slate-100 bg-white px-4 py-2 text-xs text-slate-600">
        Food Preference:{" "}
        <strong className="text-slate-800">
          {previousFoodPreference}
        </strong>
      </div>
    )}

    <div className="space-y-3 bg-white p-4 text-xs">
      {(Array.isArray(day.segments)
        ? day.segments
        : []
      ).map(
        (
          segment: any,
          index: number,
        ) => {
          const segmentKey =
            `previous-${day.dayNumber}-${segment.type}-${index}`;

          if (segment.type === "start") {
            return (
              <div
                key={segmentKey}
                className="flex items-center gap-3 pl-1 text-slate-600"
              >
                <span>🚗</span>

                <span className="font-semibold text-slate-800">
                  {segment.title ||
                    "Start your Journey"}
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
                key={segmentKey}
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
                    <span>
                      ◷ {segment.timeRange}
                    </span>
                  )}

                  {segment.distance && (
                    <span>
                      ⌁ {segment.distance}
                    </span>
                  )}

                  {segment.duration && (
                    <span>
                      ⌛ {segment.duration}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          if (
            segment.type ===
            "attraction"
          ) {
            return (
              <div
                key={segmentKey}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-800">
                    {segment.name}
                  </div>

                  {segment.description && (
                    <p className="text-xs text-slate-500">
                      {
                        segment.description
                      }
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                    {segment.visitTime && (
                      <span className="font-semibold text-[#b82580]">
                        ◷{" "}
                        {
                          segment.visitTime
                        }
                      </span>
                    )}

                    {segment.duration && (
                      <span>
                        ◉{" "}
                        {
                          segment.duration
                        }
                      </span>
                    )}

                    {segment.timings && (
                      <span>
                        {
                          segment.timings
                        }
                      </span>
                    )}
                  </div>
                </div>

                {segment.image && (
                  <div className="h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img
                      src={segment.image}
                      alt={
                        segment.name ||
                        "Previous itinerary"
                      }
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
                key={segmentKey}
                className="rounded-lg border border-amber-100 bg-amber-50/60 p-2.5 text-[11px] text-slate-600"
              >
                <strong>
                  {segment.location}
                </strong>

                {segment.timeRange && (
                  <span className="ml-2">
                    {
                      segment.timeRange
                    }
                  </span>
                )}

                {segment.duration && (
                  <span className="ml-2">
                    {
                      segment.duration
                    }
                  </span>
                )}
              </div>
            );
          }

          if (
            segment.type === "checkin"
          ) {
            return (
              <div
                key={segmentKey}
                className="rounded-xl border border-sky-200 bg-sky-50 p-3"
              >
                <div className="font-semibold text-slate-800">
                  Check-in to{" "}
                  {segment.hotelName}
                </div>

                {segment.hotelAddress && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    {
                      segment.hotelAddress
                    }
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

          if (
            segment.type === "return"
          ) {
            return (
              <div
                key={segmentKey}
                className="flex items-center gap-2 text-slate-600"
              >
                <span>🚗</span>

                <span className="font-semibold text-slate-800">
                  Return to Origin and
                  Relax
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
        },
      )}
    </div>
  </div>
);
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

const isVehicleRestrictionError = Boolean(
  saveErrorMessage &&
  /vehicle-type restriction|Changing the departure time|This restriction applies to every vehicle|Allowed vehicle types:/i.test(
    saveErrorMessage,
  ),
);

// DVI_CABS_LAYOUT_MOVE_V1: use the same Travel Expert eligibility as the navbar.
const layoutRole = getAuthenticatedRoleId();
const layoutUser = getAuthenticatedUser();
const isCabsLayout = itineraryPreference === "vehicle" &&
  window.location.pathname.startsWith("/create-itinerary") &&
  (
    layoutRole === USER_ROLES.TRAVEL_EXPERT ||
    (layoutRole === USER_ROLES.STAFF &&
      Number(layoutUser?.permissionRoleId ?? 0) === 3 &&
      Number(layoutUser?.staffId ?? layoutUser?.staff_id ?? 0) > 0)
  );
// Only the authenticated Travel Expert Cabs screen uses the vehicle-first gate.
// Staff accounts with the existing Travel Expert permission are included.
const isTravelExpertCabs =
  pageMode === "create-itinerary" &&
  itineraryPreference === "vehicle" &&
  window.location.pathname.startsWith("/create-itinerary") &&
  (layoutRole === USER_ROLES.TRAVEL_EXPERT ||
    (layoutRole === USER_ROLES.STAFF &&
      Number(layoutUser?.permissionRoleId ?? 0) === 3 &&
      Number(layoutUser?.staffId ?? layoutUser?.staff_id ?? 0) > 0));

const hasValidVehicleSelection =
  Array.isArray(vehicles) &&
  vehicles.length > 0 &&
  vehicles.every(
    (vehicle: { type?: string | number; count?: number }) =>
      String(vehicle.type ?? "").trim().length > 0 &&
      Number.isInteger(Number(vehicle.count)) &&
      Number(vehicle.count) >= 1,
  );
const routeLocked = isTravelExpertCabs && !hasValidVehicleSelection;

const vehicleValidationMessage =
  vehiclePaxValidationError || validationErrors.vehicleType;
return (
  <div className={`p-4 space-y-4 ${isTravelExpertCabs ? "dvi-te-cabs" : ""}`}>
{continueFromPlanId && continuationPlan && (
  <section className="rounded-2xl border border-[#f1e1ed] bg-white shadow-sm">

    {/* Previous itinerary summary - always visible */}
 <div
  className="sticky top-0 z-30 flex cursor-pointer select-none flex-col gap-4 rounded-2xl border-b border-[#f1e1ed] bg-[#fef7fc] p-4 shadow-sm transition-colors hover:bg-[#faeff8] md:flex-row md:items-center md:justify-between"
  onClick={() =>
    setPreviousDetailsOpen(
      (current) => !current,
    )
  }
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

<div className="flex flex-wrap items-center gap-2">
  {previousLegSources.length > 1 ? (
    previousLegSources.map((source: any, index: number) => {
      const sourcePlanId = Number(
        source.plan?.itinerary_plan_ID || 0
      );

      const isActive =
        activePreviousPlanId === sourcePlanId;

      return (
        <button
          key={sourcePlanId || index}
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            setActiveContinuationSource(source);
            setPreviousDetailsOpen(true);
          }}
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
            isActive
              ? "border-[#b82580] bg-[#b82580] text-white"
              : "border-fuchsia-200 bg-white text-[#b82580] hover:bg-fuchsia-50"
          }`}
        >
          ↻ Leg {index + 1}
        </button>
      );
    })
  ) : (
    <button
      type="button"
      onClick={handlePreviousLegClick}
      disabled={previousHistoryLoading}
      className="rounded-full border border-fuchsia-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#b82580] hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-60"
      title={
        previousParentPlanId
          ? "Open the previous itinerary leg"
          : "This is the first itinerary leg"
      }
    >
      {previousHistoryLoading
        ? "Loading..."
        : "↻ Leg 1"}
    </button>
  )}
</div>
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

<div className="space-y-4">
  {previousDaysData.map((day: any) =>
    renderPreviousDay(day)
  )}
</div>

{/* Selected hotel information for this previous leg */}
{(previousHotelsLoading || previousSelectedHotels.length > 0) && (
  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="mb-3 text-sm font-bold text-slate-800">
      Hotel Details
    </h3>

    {previousHotelsLoading ? (
      <div className="py-3 text-xs text-slate-500">
        Loading hotel information...
      </div>
    ) : (
      <div className="space-y-3">
<div className="overflow-x-auto">
  <table className="w-full text-left text-xs">
    <thead className="bg-slate-50 text-slate-600">
      <tr>
        <th className="p-3">Day</th>
        <th className="p-3">Destination</th>
        <th className="p-3">Hotel</th>
        <th className="p-3">Room Type</th>
        <th className="p-3">Meal Plan</th>
      </tr>
    </thead>

    <tbody>
      {previousSelectedHotels.map((hotel: any) => {
        const stayDate = String(hotel.date || "").slice(0, 10);

        const matchingDay = previousDaysData.find(
          (day: any) =>
            String(day.date || "").slice(0, 10) === stayDate
        );

        const stayDestination =
          matchingDay?.arrival ||
          hotel.destination ||
          "-";

        return (
          <tr
            key={hotel.key}
            className="border-t border-slate-100"
          >
            <td className="p-3">{hotel.date || "-"}</td>
            <td className="p-3">{stayDestination}</td>
            <td className="p-3 font-medium text-slate-800">
              {hotel.hotelName}
            </td>
            <td className="p-3">{hotel.roomType || "-"}</td>
            <td className="p-3">{hotel.mealPlan || "-"}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
      </div>
    )}
  </div>
)}

{/* Read-only vehicle details for this previous leg */}
{previousItineraryPreference !== 1 && (
  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="mb-3 text-sm font-bold text-slate-800">
      Vehicle List
    </h3>

    {previousDetailsLoading ? (
      <p className="text-xs text-slate-500">
        Loading vehicle details...
      </p>
    ) : previousSelectedVehicles.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3">Vehicle Type</th>
              <th className="p-3">Vendor Name</th>
              <th className="p-3">Branch</th>
              <th className="p-3">Origin</th>
              <th className="p-3">Qty</th>
              <th className="p-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {previousSelectedVehicles.map(
              (vehicle: any, index: number) => (
                <tr
                  key={`${vehicle.vendorEligibleId}-${vehicle.vehicleTypeId}-${index}`}
                  className="border-t border-slate-100"
                >
                  <td className="p-3">
                    {vehicle.vehicleTypeName || "-"}
                  </td>
                  <td className="p-3">
                    {vehicle.vendorName || "-"}
                  </td>
                  <td className="p-3">
                    {vehicle.branchName || "-"}
                  </td>
                  <td className="p-3">
                    {vehicle.vehicleOrigin || "-"}
                  </td>
                  <td className="p-3">
                    {vehicle.totalQty || "-"}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    ₹ {Number(vehicle.totalAmount || 0).toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2 }
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-xs text-slate-500">
        No saved vehicle assignment available for this leg.
      </p>
    )}
  </div>
)}
</>
          )}
        </div>
      )}
  </section>
)}

      {pageMode !== "smart-booking" &&
        Array.isArray(
          smartBookingImportedRoutes,
        ) &&
        smartBookingImportedRoutes.length >
          0 && (
          <div
            data-smart-booking-imported-routes
            className="mb-5 rounded-2xl border border-[#dbe6f3] bg-[#f7fbff] p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#102a56]">
                  Selected Smart Routes (
                  {
                    smartBookingImportedRoutes.length
                  }
                  )
                </h2>

                <p className="text-xs text-[#60738e]">
                  Imported from Smart Booking.
                  Complete the itinerary details
                  below, then Save & Continue.
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                Imported from Smart Booking
              </span>
            </div>

            <div className="space-y-2">
              {smartBookingImportedRoutes.map(
                (
                  item: any,
                  index: number,
                ) => (
                  <div
                    key={
                      item?.quoteId ||
                      index
                    }
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dce6f2] bg-white p-3"
                  >
                    <div className={item?.image ? "h-14 w-20 overflow-hidden rounded-lg bg-slate-100" : "hidden"}>
                      {item?.image ? (
                        <img
                          src={
                            item.image
                          }
                          alt={
                            item?.title ||
                            `Route ${index + 1}`
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-[#102a56]">
                        Route{" "}{index + 1}
                      </div>

                      <div className="mt-0.5 break-words text-xs leading-5 text-[#60738e]">
                        {item?.routeLabel ||
                          ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-[#60738e]">
                        {Math.max(
                          Number(
                            item?.displayDays ||
                              item?.noOfDays ||
                              (Array.isArray(item?.days)
                                ? item.days.length
                                : 1),
                          ) - 1,
                          0,
                        )}{" "}
                        Nights /{" "}
                        {Number(item?.displayDays || item?.noOfDays || (Array.isArray(item?.days) ? item.days.length : 0))}{" "}
                        Days
                      </div>

                      {Number(
                        item?.packageRate ||
                          0,
                      ) > 0 && (
                        <div className="mt-1 text-sm font-extrabold text-[#e40b2f]">
                          ₹
                          {Number(
                            item.packageRate,
                          ).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

<ItineraryPlanBlock
  travelExpertCabs={isTravelExpertCabs}
  pageMode={pageMode}
  agents={agents}
  agentId={agentId}
  setAgentId={setAgentId}
  pendingNewAgent={pendingNewAgent}
  setPendingNewAgent={setPendingNewAgent}
  isAgentLocked={Boolean(isAgentLogin)}
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
       minimumTripDate={continuationMinimumTripDate}
       minimumTripStartTime={continuationMinimumStartTime}
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

transportOvernightLocationName={transportOvernightLocationName}
setTransportOvernightLocationName={setTransportOvernightLocationName}
        transportEarlyArrivalLocationName={transportEarlyArrivalLocationName}
        setTransportEarlyArrivalLocationName={setTransportEarlyArrivalLocationName}
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

      {pageMode === "smart-booking" && (
        <SmartBookingPackages
          arrivalLocation={
            arrivalLocation
          }

          departureLocation={
            departureLocation
          }

          locations={locations}

          agentId={agentId}

          isAgentLogin={
            Boolean(
              isAgentLogin
            )
          }

          itineraryPreference={
            itineraryPreference
          }

          tripStartDate={
            tripStartDate
          }

          tripEndDate={
            tripEndDate
          }

          selectedHotelCategoryIds={
            selectedHotelCategoryIds
          }

          hotelCategoryOptions={
            hotelCategoryOptions
          }
        />
      )}



            {/* SMART BOOKING VIEW COMPACT START */}
      {pageMode !== "smart-booking" && !hideLegacyItineraryForTravelExpertHotel && (
        <>
<div className={isCabsLayout ? "flex flex-col-reverse gap-3" : "space-y-4"}><div
        data-field="firstRouteSource"
        className={
          validationErrors.firstRouteSource || validationErrors.firstRouteNext
            ? "border border-red-500 rounded-md p-2"
            : ""
        }
      >
        {routeLocked && (
          <p className="mb-2 text-[15px] font-semibold text-[#76598b]" role="status">
            Select a Vehicle Type and enter a valid Vehicle Count to enable Route Details.
          </p>
        )}
        <fieldset
          disabled={routeLocked}
          aria-disabled={routeLocked}
          className={routeLocked ? "pointer-events-none opacity-50" : ""}
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
  authoritativeRoutes={smartBookingImportedRoutes}
  onRoutesLoaded={(routes) => {
    if (smartBookingImportedRoutes.length === 0) {
      setSuggestedDefaultRoutes(routes.length > 0 ? [routes[0]] : []);
    }
    setActiveDefaultRouteIndex(0);
  }}
  onSelectedRoutesChange={(selectedRoutes) => {
    if (smartBookingImportedRoutes.length === 0) {
      setSuggestedDefaultRoutes(selectedRoutes);
    }
  }}
  onRouteSelect={(route, index) => {
    setActiveDefaultRouteIndex(index);
  }}
            onNoRoutesFound={() => {
              if (smartBookingImportedRoutes.length > 0) {
                return;
              }
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
  travelExpertCabs={isTravelExpertCabs}
  onDeleteDay={deleteDay}
  onDeleteRouteDay={deleteRouteDay}
  addDay={addDay}
/>
        )}
        </fieldset>
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
    travelExpertCabs={isTravelExpertCabs}
  />
  {vehicleValidationMessage && (
    <p className="mt-1 text-xs text-red-500">{vehicleValidationMessage}</p>
  )}
</div>
</div>


      <div className="flex justify-center pt-1">
        <Button
          onClick={handleSaveClick}
          disabled={isSaving || routeLocked}
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
              {isRoomOccupancyError
                ? "Room occupancy not allowed"
                : isVehicleRestrictionError
                  ? "Vehicle route restriction"
                  : "Unable to save itinerary"}
            </DialogTitle>
          <DialogDescription>
            {isRoomOccupancyError
              ? "The itinerary was not saved because one room exceeds the allowed bed or occupancy rules."
              : isVehicleRestrictionError
                ? "The selected vehicle or route cannot be saved with the current transport rules."
                : "The itinerary could not be saved. Review the validation message below."}
          </DialogDescription>
          </DialogHeader>
          <div role="alert" className={`rounded-md px-4 py-3 text-sm leading-6 ${isRoomOccupancyError ? "border border-amber-300 bg-amber-50 text-amber-950" : "border border-red-200 bg-red-50 text-red-900"}`}>
            {messageWithoutAllowedVehicles}
          </div>
          {isVehicleRestrictionError && allowedVehicleTypes.length > 0 && (
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
                : isVehicleRestrictionError
                  ? "Review vehicle / route"
                  : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <SaveRouteConfirmDialog
  open={showRouteConfirm && !saveErrorMessage}
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
        </>
      )}
      {/* SMART BOOKING VIEW COMPACT END */}

    </div>
  );
};
