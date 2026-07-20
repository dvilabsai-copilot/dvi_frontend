/* eslint-disable @typescript-eslint/no-explicit-any, no-irregular-whitespace */
import { useEffect } from "react";
import { fetchAgents } from "@/services/accountsManagerApi";
import {
  fetchItineraryTypes,
  fetchTravelTypes,
  fetchEntryTicketOptions,
  fetchGuideOptions,
  fetchNationalities,
  fetchFoodPreferences,
  fetchMealPlans,
  fetchEligibleVehicleTypes,
  fetchVehicleTypes,
  fetchHotelCategories,
  fetchHotelFacilities,
} from "@/services/itineraryDropdownsMock";
import { ItineraryService as DefaultItineraryService } from "@/services/itinerary";
import type { RouteRow } from "./useItineraryRoutes";
import type { VehicleRow } from "./createItinerary.utils";
import {
  addDaysToDDMMYYYY,
  buildRoomsFromPlanSummary,
  buildRoomsFromTravellers,
  buildVehicleRouteLocationPayload,
  getVehicleTypeIdsFromOptions,
  resolveFirstNonEmptyNumberList,
  resolveFirstNonEmptyStringList,
  resolveMealPlanCodeFromPlan,
  safeDateFromISO,
  DEFAULT_ITINERARY_START_TIME,
  DEFAULT_ITINERARY_END_TIME,
  calculateDaysBetweenDates,
} from "./createItinerary.utils";

export function useCreateItineraryEffects(context: Record<string, any>) {
  const {
    setValidationErrors, agentId, arrivalLocation, departureLocation, tripStartDate, tripEndDate,
    itineraryTypeSelect, arrivalType, departureType, budget, entryTicketRequired, guideRequired,
    nationality, foodPreference, itineraryPreference, selectedHotelCategoryIds, routeDetails,
    vehicles, vehiclePaxValidationError, stopSaveProgress, setLoading, isAgentLogin,
    loggedInAgentId, setAgents, setLocations, setItineraryTypes, setTravelTypes,
    setEntryTicketOptions, setGuideOptions, setNationalities, setFoodPreferences,
    setMealPlanOptions, setHotelCategoryOptions, setHotelFacilityOptions, itineraryPlanId,
    itineraryService = DefaultItineraryService, setAgentId, setArrivalLocation,
    setDepartureLocation, setTripStartDate, setTripEndDate, setStartTime, setEndTime,
    setBudget, setArrivalType, setDepartureType, setItineraryPreference,
    setItineraryTypeSelect, setEntryTicketRequired, setGuideRequired, setNationality,
    setFoodPreference, setMealPlanCode, setSpecialInstructions, setSelectedHotelCategoryIds,
    setSelectedHotelFacilityIds, setRouteDetails, setVehicles, setRooms,
    templateAppliedKey, setTemplateAppliedKey, toast, itineraryTypes,
    defaultRouteWarningShownRef, setShowDefaultRouteSuggestions, vehicleTypeRequestRef,
    setVehicleTypes, setSelectedVehicleIds, setEligibleVehicleTypeIds,
    travellerCounts, totalTravellingPax, fetchStoredSourceLocations,
    setTransportEarlyArrivalOption, setTransportEarlyArrivalHotelName,
    setTransportEarlyArrivalRestMinutes,
    requiresTransportEarlyArrivalPreference, transportEarlyArrivalOption,
    transportEarlyArrivalHotelName,
  } = context;

  // ----------------- effects -----------------

  // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Auto-clear validation highlight as soon as the field becomes valid
useEffect(() => {
  setValidationErrors((prev) => {
    if (!prev || Object.keys(prev).length === 0) return prev;

    const next: Record<string, string> = { ...prev };

    const clearIfOk = (key: string, ok: boolean) => {
      if (ok && next[key]) delete next[key];
    };

    clearIfOk("agentId", !!agentId);
    clearIfOk("arrivalLocation", !!arrivalLocation);
    clearIfOk("departureLocation", !!departureLocation);
    clearIfOk("tripStartDate", !!tripStartDate);
    clearIfOk("tripEndDate", !!tripEndDate);

    clearIfOk("itineraryTypeSelect", !!itineraryTypeSelect);
    clearIfOk("arrivalType", !!arrivalType);

    clearIfOk("budget", budget !== "" && Number(budget) > 0);

    clearIfOk("entryTicketRequired", !!entryTicketRequired);
    clearIfOk("guideRequired", !!guideRequired);
    clearIfOk("nationality", !!nationality);
    clearIfOk("foodPreference", !!foodPreference);

    // Hotel category required only for hotel/both
    const hotelCategoryOk =
      !(itineraryPreference === "hotel" || itineraryPreference === "both") ||
      selectedHotelCategoryIds.length > 0;
    clearIfOk("hotelCategory", hotelCategoryOk);

    if (requiresTransportEarlyArrivalPreference && transportEarlyArrivalOption) {
      clearIfOk("transportEarlyArrivalOption", true);
      if (transportEarlyArrivalOption !== "HOTEL_REST" || String(transportEarlyArrivalHotelName || "").trim()) {
        clearIfOk("transportEarlyArrivalHotelName", true);
      }
    } else if (!requiresTransportEarlyArrivalPreference) {
      clearIfOk("transportEarlyArrivalOption", true);
      clearIfOk("transportEarlyArrivalHotelName", true);
    }



    // First route fields
    const firstRoute = routeDetails?.[0];
    clearIfOk("firstRouteSource", !!firstRoute?.source);
    clearIfOk("firstRouteNext", !!firstRoute?.next);

    // Vehicle type required only for vehicle/both
    const vehicleTypeOk =
      !(itineraryPreference === "vehicle" || itineraryPreference === "both") ||
      (vehicles.every((v) => !!v.type) && !vehiclePaxValidationError);
    clearIfOk("vehicleType", vehicleTypeOk);

    // If nothing changed, keep same reference to avoid rerender loops
    return Object.keys(next).length === Object.keys(prev).length ? prev : next;
  });
}, [
  agentId,
  arrivalLocation,
  departureLocation,
  tripStartDate,
  tripEndDate,
  itineraryTypeSelect,
  arrivalType,
  departureType,
  budget,
  entryTicketRequired,
  guideRequired,
  nationality,
  foodPreference,
  itineraryPreference,
  selectedHotelCategoryIds,
  routeDetails,
  vehicles,
  vehiclePaxValidationError,
  requiresTransportEarlyArrivalPreference,
  transportEarlyArrivalOption,
  transportEarlyArrivalHotelName,
]);

useEffect(() => {
  return () => {
    stopSaveProgress();
  };
}, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [
          agentsRes,
          locationsRes,
          itineraryTypesRes,
          travelTypesRes,
          entryTicketRes,
          guideRes,
          nationalityRes,
          foodRes,
          mealPlansRes,
          hotelCatRes,
          hotelFacilityRes,
        ] = await Promise.all([
          fetchAgents(),
          fetchStoredSourceLocations(),
          fetchItineraryTypes(),
          fetchTravelTypes(),
          fetchEntryTicketOptions(),
          fetchGuideOptions(),
          fetchNationalities(),
          fetchFoodPreferences(),
          fetchMealPlans(),
          fetchHotelCategories(),
          fetchHotelFacilities(),
        ]);

        setAgents(
          isAgentLogin && loggedInAgentId
            ? agentsRes.filter((a) => Number(a.id) === Number(loggedInAgentId))
            : agentsRes
        );
        setLocations(locationsRes);
        setItineraryTypes(itineraryTypesRes);
        setTravelTypes(travelTypesRes);
        setEntryTicketOptions(entryTicketRes);
        setGuideOptions(guideRes);
        setNationalities(nationalityRes);
        setFoodPreferences(foodRes);
        setMealPlanOptions(mealPlansRes);
        setHotelCategoryOptions(hotelCatRes);
        setHotelFacilityOptions(hotelFacilityRes);

        if (itineraryPlanId) {
          const existing = await itineraryService.getOne(itineraryPlanId);
          if (existing?.plan) {
            // NOTE: backend returns DB plan (dvi_itinerary_plan_details)
            const p = existing.plan;

            setAgentId(p.agent_id ?? null);

            // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ DB fields are arrival_location / departure_location (NOT arrival_point / departure_point)
            setArrivalLocation(p.arrival_location ?? "");
            setDepartureLocation(p.departure_location ?? "");

            // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ DB fields are trip_start_date_and_time / trip_end_date_and_time
            setTripStartDate(
              p.trip_start_date_and_time
                ? safeDateFromISO(p.trip_start_date_and_time)
                : ""
            );
            setTripEndDate(
              p.trip_end_date_and_time
                ? safeDateFromISO(p.trip_end_date_and_time)
                : ""


            );

            // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ also prefill times
            // Keep the form defaults for times instead of loading the user's
            // previously saved values from the database.
            setStartTime(DEFAULT_ITINERARY_START_TIME);
            setEndTime(DEFAULT_ITINERARY_END_TIME);

            // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ budget in DB is expecting_budget
            setBudget(p.expecting_budget ?? "");

            setArrivalType(p.arrival_type != null ? String(p.arrival_type) : "");
            setDepartureType(p.departure_type != null ? String(p.departure_type) : "");

            setItineraryPreference(
              p.itinerary_preference === 2
                ? "vehicle"
                : p.itinerary_preference === 1
                ? "hotel"
                : "both"
            );

            setItineraryTypeSelect(p.itinerary_type != null ? String(p.itinerary_type) : "");

            setEntryTicketRequired(
              p.entry_ticket_required != null ? String(p.entry_ticket_required) : ""
            );

            setGuideRequired(
              p.guide_for_itinerary != null ? String(p.guide_for_itinerary) : ""
            );

            setNationality(p.nationality != null ? String(p.nationality) : "");

            // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ foodPreference state holds option id
const savedFoodType = Number(p.food_type ?? 0);

const matchedFoodOption = foodRes.find(
  (item) => Number(item.id) === savedFoodType
);

setFoodPreference(
  matchedFoodOption
    ? String(matchedFoodOption.id)
    : ""
);

            setMealPlanCode(resolveMealPlanCodeFromPlan(p, mealPlansRes || []));





            setSpecialInstructions(p.special_instructions ?? "");
            setTransportEarlyArrivalOption(
              p.transport_early_arrival_option === "HOTEL_REST" ||
              p.transport_early_arrival_option === "REFRESHMENT_BEFORE_SIGHTSEEING"
                ? p.transport_early_arrival_option
                : "",
            );
            setTransportEarlyArrivalHotelName(
              p.transport_early_arrival_hotel_name ?? "",
            );
            setTransportEarlyArrivalRestMinutes(
              Number(p.transport_early_arrival_rest_minutes || 180),
            );
            // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ PREFILL: keep hotel category/facility selections stable across edit reloads.
            setSelectedHotelCategoryIds(
              resolveFirstNonEmptyNumberList(
                p.preferred_hotel_category,
                p.preferredHotelCategory,
                existing?.preferred_hotel_category,
                existing?.preferredHotelCategory,
              ),
            );
            setSelectedHotelFacilityIds(
              resolveFirstNonEmptyStringList(
                p.hotel_facilities,
                p.hotelFacilities,
                existing?.hotel_facilities,
                existing?.hotelFacilities,
              ),
            );

            if (Array.isArray(existing.routes) && existing.routes.length) {
              setRouteDetails(
  existing.routes.map((r: any, idx: number): RouteRow => ({
    id: idx + 1,
    itinerary_route_id:
      Number(r.itinerary_route_ID || r.itinerary_route_id || 0) || undefined,
    day: r.no_of_days ?? idx + 1,
    date: r.itinerary_route_date
      ? safeDateFromISO(r.itinerary_route_date)
      : "",
    source: r.location_name ?? "",
    next: r.next_visiting_location ?? "",
    via: r.via_route ?? "",
    via_routes: Array.isArray(r.via_routes)
      ? r.via_routes.map((vr: any) => ({
          itinerary_via_location_ID: Number(vr.itinerary_via_location_ID),
          itinerary_via_location_name: String(vr.itinerary_via_location_name),
        }))
      : [],
    no_of_km:
      r.no_of_km !== undefined &&
      r.no_of_km !== null &&
      String(r.no_of_km).trim() !== ""
        ? Number(r.no_of_km)
        : 0,
    directVisit: r.direct_to_next_visiting_place === 1 ? "Yes" : "No",
  }))
);
              
            }

            if (Array.isArray(existing.vehicles) && existing.vehicles.length) {
              setVehicles(
                existing.vehicles.map((v: any, idx: number): VehicleRow => ({
                  id: idx + 1,
                  vehicle_details_id:
                    Number(v.vehicle_details_ID || v.vehicle_details_id || 0) || undefined,
                  type: v.vehicle_type_id ? String(v.vehicle_type_id) : "",
                  count: v.vehicle_count ?? 1,
                }))
              );
            }

            if (Array.isArray(existing.travellers) && existing.travellers.length) {
              setRooms(buildRoomsFromTravellers(existing.travellers));
            } else {
              // Some edit payloads omit travellers; hydrate rooms from persisted plan totals.
              setRooms(buildRoomsFromPlanSummary(p));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [itineraryPlanId, setRouteDetails, setRooms]);

useEffect(() => {
  if (itineraryPlanId) return;

  const selectedTypeLabel =
    itineraryTypes
      .find((t) => String(t.id) === String(itineraryTypeSelect))
      ?.label?.trim()
      .toLowerCase() || "";

  const isSuggestedRouteType =
    selectedTypeLabel === "default" ||
    selectedTypeLabel === "suggested routes";

  // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Important:
  // Do not auto-apply reusable/default route template for Customize.
  // Customize route details must stay fully manual.
  if (!isSuggestedRouteType) return;

  if (!arrivalLocation || !departureLocation || !tripStartDate || !tripEndDate) return;

  const dayCount = calculateDaysBetweenDates(tripStartDate, tripEndDate);
    const key = `${arrivalLocation.trim().toLowerCase()}|${departureLocation
      .trim()
      .toLowerCase()}|${dayCount}`;

    if (templateAppliedKey === key) return;

    let cancelled = false;

    (async () => {
      try {
        const match = await itineraryService.getReusableTemplateMatch(
          arrivalLocation,
          departureLocation,
          dayCount,
        );

        if (cancelled) return;

        const templateRoutes = Array.isArray(match?.template?.routes)
          ? match.template.routes
          : [];

        if (!match?.found || templateRoutes.length === 0) {
          setTemplateAppliedKey(key);
          return;
        }

        setRouteDetails((prev) =>
          Array.from({ length: dayCount }, (_, idx): RouteRow => {
            const r = templateRoutes[idx] || {};
            const previous = prev[idx];
            const viaRoutes = Array.isArray(r.via_routes)
              ? r.via_routes
                  .map((vr: any) => ({
                    itinerary_via_location_ID: Number(vr.itinerary_via_location_ID),
                    itinerary_via_location_name: String(vr.itinerary_via_location_name || ""),
                  }))
                  .filter(
                    (vr: any) =>
                      Number.isFinite(vr.itinerary_via_location_ID) &&
                      vr.itinerary_via_location_name.trim(),
                  )
              : [];
            const isFirstRow = idx === 0;
            const isLastRow = idx === dayCount - 1;

            return {
              id: idx + 1,
              day: idx + 1,
              date: addDaysToDDMMYYYY(tripStartDate, idx),
              source: isFirstRow
                ? arrivalLocation
                : String(r.location_name ?? previous?.source ?? ""),
              next: isLastRow
                ? departureLocation
                : String(r.next_visiting_location ?? previous?.next ?? ""),
              via: String(r.via_route ?? previous?.via ?? ""),
              via_routes: viaRoutes,
              no_of_km:
                r.no_of_km !== undefined &&
                r.no_of_km !== null &&
                String(r.no_of_km).trim() !== ""
                  ? Number(r.no_of_km)
                  : previous?.no_of_km ?? 0,
              directVisit: Number(r.direct_to_next_visiting_place ?? 0) === 1 ? "Yes" : "No",
            };
          }),
        );

        setTemplateAppliedKey(key);
        toast({
          title: "Route template loaded",
          description:
            "Applied saved route details only. Your itinerary preference and vehicle selections were kept unchanged.",
        });
      } catch (error) {
        console.error("Failed to load matching itinerary route template", error);
        if (!cancelled) setTemplateAppliedKey(key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
  itineraryPlanId,
  itineraryTypeSelect,
  itineraryTypes,
  arrivalLocation,
  departureLocation,
  tripStartDate,
  tripEndDate,
  templateAppliedKey,
  toast,
  setRouteDetails,
]);
  // Auto-open route suggestions modal when itinerary type is "Default"
  useEffect(() => {
    if (itineraryTypeSelect && itineraryTypes.length > 0) {
      const selectedType = itineraryTypes.find(
        (t) => t.id === itineraryTypeSelect
      );
      const isDefaultType = selectedType?.label?.trim().toLowerCase() === "default";

      if (!isDefaultType) {
        defaultRouteWarningShownRef.current = false;
        return;
      }

      // Check if the selected type is "Default"
      if (isDefaultType) {
        const hasRequiredBasicDetails =
          Boolean(arrivalLocation) &&
          Boolean(departureLocation) &&
          Boolean(tripStartDate) &&
          Boolean(tripEndDate);

        if (hasRequiredBasicDetails) {
          defaultRouteWarningShownRef.current = false;
          setShowDefaultRouteSuggestions(true);
        } else {
          setShowDefaultRouteSuggestions(false);

          // PHP parity: warn once until user changes type or completes required fields.
          if (!defaultRouteWarningShownRef.current) {
            toast({
              title: "Warning !!!",
              description:
                "Please Fill the basic itinerary details to proceed with the default Route Suggestions",
              variant: "destructive",
            });
            defaultRouteWarningShownRef.current = true;
          }
        }
      }
    }
  }, [itineraryTypeSelect, itineraryTypes, arrivalLocation, departureLocation, tripStartDate, tripEndDate, routeDetails.length]);

 useEffect(() => {
  let isMounted = true;
  const requestId = ++vehicleTypeRequestRef.current;

  const selectedTypeLabel =
    itineraryTypes
      .find((t) => String(t.id) === String(itineraryTypeSelect))
      ?.label?.trim()
      .toLowerCase() || "";

  const isCustomizeItineraryType = selectedTypeLabel === "customize";

  const exactPayload = buildVehicleRouteLocationPayload({
    rows: routeDetails,
    arrivalLocation,
    departureLocation,
  });

  const vehicleTravellerPayload = {
    adult_count: Number(travellerCounts.totalAdults || 0),
    child_count: Number(travellerCounts.totalChildren || 0),
    infant_count: Number(travellerCounts.totalInfants || 0),
    total_pax: totalTravellingPax,
    travelling_pax: totalTravellingPax,
  };

  if (
    exactPayload.sourceLocation.length === 0 ||
    exactPayload.nextVisitingLocation.length === 0
  ) {
    setVehicleTypes([]);
    setSelectedVehicleIds([]);
    setEligibleVehicleTypeIds([]);
    return;
  }

  (async () => {
    try {
      let result = await fetchEligibleVehicleTypes({
        itineraryPlanId: itineraryPlanId ?? null,
        sourceLocation: exactPayload.sourceLocation,
        nextVisitingLocation: exactPayload.nextVisitingLocation,
        ...vehicleTravellerPayload,
      } as any);

      let hasVehicleTypes =
        Array.isArray(result?.vehicleTypes) && result.vehicleTypes.length > 0;

      let apiEligibleVehicleTypeIds = hasVehicleTypes
        ? getVehicleTypeIdsFromOptions(result?.vehicleTypes)
        : [];

      const fallbackPayload = buildVehicleRouteLocationPayload({
        rows: routeDetails,
        arrivalLocation,
        departureLocation,
        simplify: true,
      });

      const fallbackIsDifferent =
        JSON.stringify(fallbackPayload) !== JSON.stringify(exactPayload);

      // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Existing exact vehicle matching stays first priority.
      if (
        !hasVehicleTypes &&
        fallbackIsDifferent &&
        fallbackPayload.sourceLocation.length > 0 &&
        fallbackPayload.nextVisitingLocation.length > 0
      ) {
        result = await fetchEligibleVehicleTypes({
          itineraryPlanId: itineraryPlanId ?? null,
          sourceLocation: fallbackPayload.sourceLocation,
          nextVisitingLocation: fallbackPayload.nextVisitingLocation,
          ...vehicleTravellerPayload,
        } as any);

        hasVehicleTypes =
          Array.isArray(result?.vehicleTypes) && result.vehicleTypes.length > 0;

        apiEligibleVehicleTypeIds = hasVehicleTypes
          ? getVehicleTypeIdsFromOptions(result?.vehicleTypes)
          : [];
      }

      // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Customize-only fallback:
      // If eligible vehicle API returns empty, load normal vehicle type list.
      // This keeps Suggested Routes untouched.
      if (!hasVehicleTypes && isCustomizeItineraryType) {
        const allVehicleTypes = await fetchVehicleTypes();

        result = {
          vehicleTypes: allVehicleTypes,
          selectedVehicleIds: [],
        };
      }

      if (!isMounted || vehicleTypeRequestRef.current !== requestId) return;

      const nextVehicleTypes = Array.isArray(result?.vehicleTypes)
        ? result.vehicleTypes
        : [];

      setVehicleTypes(nextVehicleTypes);
      setEligibleVehicleTypeIds(apiEligibleVehicleTypeIds);

      setSelectedVehicleIds(
        Array.isArray(result?.selectedVehicleIds)
          ? result.selectedVehicleIds
          : []
      );
    } catch (error) {
      console.error("Failed to load eligible vehicle types", error);

      if (isMounted && vehicleTypeRequestRef.current === requestId) {
        setVehicleTypes([]);
        setSelectedVehicleIds([]);
        setEligibleVehicleTypeIds([]);
      }
    }
  })();

  return () => {
    isMounted = false;
  };
}, [
  routeDetails,
  itineraryPlanId,
  arrivalLocation,
  departureLocation,
  itineraryTypeSelect,
  itineraryTypes,
  travellerCounts.totalAdults,
  travellerCounts.totalChildren,
  travellerCounts.totalInfants,
  totalTravellingPax,
]);
}
