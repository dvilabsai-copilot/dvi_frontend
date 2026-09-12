/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef } from "react";
import { api, ApiError } from "@/lib/api";
import type { ItineraryDetailsLocationState } from "@/pages/itinerary-details/itinerary-details-route-state";
import {
  getDetailsDeduped,
  invalidateDetailsDeduped,
} from "@/pages/itinerary-details/utils/details-dedupe";

export function useCreateItineraryRouteSave(context: Record<string, any>) {
  const {
    buildPayload,
    arrivalPolicyDecisionRef,
    setIsSaving,
    setActiveSaveType,
    setEstimatedSaveMs,
    startSaveProgress,
    itineraryPlanId,
    isDefaultItineraryTypeSelected,
    suggestedDefaultRoutes,
    buildPayloadForSuggestedRoute,
    ItineraryService: itineraryService,
    extractCreatedQuoteId,
    extractRouteFamilyBaseQuoteId,
    setSaveProgressPercent,
    toast,
    setSaveErrorMessage,
    setShowRouteConfirm,
    navigate,
    stopSaveProgress,
    setTransportLoadingMessageIndex,
    getEstimatedSaveMs,
  } = context;

const isSavingRef = useRef(false);
const partialSaveRef = useRef<NonNullable<ItineraryDetailsLocationState["partialSave"]> | null>(null);

const handleSaveWithType = async (
  type: "itineary_basic_info" | "itineary_basic_info_with_optimized_route",
) => {
  if (partialSaveRef.current) {
    const { planId, quoteId } = partialSaveRef.current;
    navigate(`/itinerary-details/${quoteId}`, {
      replace: true,
      state: { partialSave: { planId, quoteId } } satisfies ItineraryDetailsLocationState,
    });
    return;
  }
  if (isSavingRef.current) return; // sync guard prevents double-fire before setState re-render
  isSavingRef.current = true;
  try {
    setIsSaving(true);
    setSaveErrorMessage(null);
    setActiveSaveType(type);

  // Always rebuild from the latest form state.
// Do not save using an older cached pendingPayload.
const basePayload = buildPayload();
const decision = arrivalPolicyDecisionRef.current;

const finalPayload = {
  ...basePayload,
  previousDayBillingDecisionProvided:
    decision.previousDayBillingDecisionProvided,
  previousDayBillingConfirmed:
    decision.previousDayBillingConfirmed,
};
    const dayCount = Math.max(1, Number(finalPayload?.plan?.no_of_days ?? 1));
    const estimatedMs = getEstimatedSaveMs(dayCount, type);
    setEstimatedSaveMs(estimatedMs);
    startSaveProgress(estimatedMs);

    const isUpdate = !!itineraryPlanId;

    // Single POST endpoint for both create & update
    const isDefaultItinerary = isDefaultItineraryTypeSelected();

const selectedSmartBookingRoutes =
  isDefaultItinerary &&
  Array.isArray(suggestedDefaultRoutes)
    ? suggestedDefaultRoutes.slice(0, 5)
    : [];

const shouldCreateSmartBookingFamily =
  !itineraryPlanId &&
  selectedSmartBookingRoutes.length > 0;

const shouldSyncSmartBookingFamily =
  Boolean(itineraryPlanId) &&
  selectedSmartBookingRoutes.length > 0;

let res: any = null;

const createdRouteOptions: Array<{
  quoteId: string;
  label: string;
}> = [];

let sharedRouteFamilyBaseQuoteId = "";

const removeForeignPersistenceIds = (
  payload: any,
  targetPlanId?: number,
) => {
  const cleanRoutes = Array.isArray(payload?.routes)
    ? payload.routes.map((route: any) => {
        const cleanRoute = { ...(route || {}) };

        delete cleanRoute.itinerary_route_id;
        delete cleanRoute.itinerary_route_ID;

        return cleanRoute;
      })
    : [];

  const cleanVehicles = Array.isArray(payload?.vehicles)
    ? payload.vehicles.map((vehicle: any) => {
        const cleanVehicle = { ...(vehicle || {}) };

        delete cleanVehicle.vehicle_details_id;
        delete cleanVehicle.vehicle_details_ID;

        return cleanVehicle;
      })
    : payload?.vehicles;

  return {
    ...payload,
    plan: {
      ...(payload?.plan || {}),
      itinerary_plan_id:
        targetPlanId && targetPlanId > 0
          ? targetPlanId
          : undefined,
    },
    routes: cleanRoutes,
    vehicles: cleanVehicles,
  };
};

const buildSmartBookingRoutePayload = (
  route: any,
  index: number,
  targetPlanId?: number,
) => {
  const rawPayload =
    index === 0
      ? finalPayload
      : buildPayloadForSuggestedRoute(
          route,
          finalPayload,
        );

  const cleanPayload =
    removeForeignPersistenceIds(
      rawPayload,
      targetPlanId,
    );

  return {
    ...cleanPayload,
    plan: {
      ...(cleanPayload?.plan || {}),
      itinerary_plan_id:
        targetPlanId && targetPlanId > 0
          ? targetPlanId
          : undefined,
      route_variant_index: index + 1,
      route_variant_count:
        selectedSmartBookingRoutes.length,
      route_family_base_quote_id:
        sharedRouteFamilyBaseQuoteId ||
        undefined,
    },
  };
};

const saveSmartBookingRoutePayload = async (
  payload: any,
  index: number,
) => {
  try {
    return await itineraryService.create(
      payload,
      type,
    );
  } catch (routeError) {
    const partialPayload =
      routeError instanceof ApiError &&
      routeError.status === 422
        ? (routeError.payload as any)
        : null;

    const partialPlanId = Number(
      partialPayload?.planId || 0,
    );

    const partialQuoteId = String(
      partialPayload?.quoteId || "",
    ).trim();

    const isRecoverablePartial =
      partialPayload?.creationStatus ===
        "PARTIAL" &&
      partialPlanId > 0 &&
      Boolean(partialQuoteId);

    if (!isRecoverablePartial) {
      throw routeError;
    }

    console.warn(
      `Smart Booking Route ${index + 1} was partially saved; continuing.`,
      {
        planId: partialPlanId,
        quoteId: partialQuoteId,
        vehicleBuild:
          partialPayload?.vehicleBuild,
        hotelSearch:
          partialPayload?.hotelSearch,
      },
    );

    return partialPayload;
  }
};

const registerSmartBookingResult = (
  routeRes: any,
  index: number,
  fallbackQuoteId = "",
) => {
  const createdQuoteId =
    extractCreatedQuoteId(routeRes) ||
    String(fallbackQuoteId || "").trim();

  const createdFamilyBaseQuoteId =
    extractRouteFamilyBaseQuoteId(
      routeRes,
      createdQuoteId,
    );

  if (
    !sharedRouteFamilyBaseQuoteId &&
    createdFamilyBaseQuoteId
  ) {
    sharedRouteFamilyBaseQuoteId =
      createdFamilyBaseQuoteId;
  }

  if (!createdQuoteId) {
    throw new Error(
      `Smart Booking Route ${index + 1} saved but no quote ID was returned.`,
    );
  }

  createdRouteOptions.push({
    quoteId: createdQuoteId,
    label: `Route ${index + 1}`,
  });

  const normalizedResponse = {
    ...(routeRes || {}),
    quoteId: createdQuoteId,
  };

  if (index === 0) {
    res = normalizedResponse;
  }

  return normalizedResponse;
};

const ROUTE_SAVE_DELAY_MS = 300;

if (shouldCreateSmartBookingFamily) {
  for (
    let index = 0;
    index < selectedSmartBookingRoutes.length;
    index++
  ) {
    if (index > 0) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          ROUTE_SAVE_DELAY_MS,
        ),
      );
    }

    const routePayload =
      buildSmartBookingRoutePayload(
        selectedSmartBookingRoutes[index],
        index,
      );

    const routeRes =
      await saveSmartBookingRoutePayload(
        routePayload,
        index,
      );

    registerSmartBookingResult(
      routeRes,
      index,
    );
  }
} else if (shouldSyncSmartBookingFamily) {
  const familySync: any = await api(
    "itineraries/route-family/sync-selection",
    {
      method: "POST",
      body: {
        planId: Number(itineraryPlanId),
        desiredCount:
          selectedSmartBookingRoutes.length,
      },
    },
  );

  sharedRouteFamilyBaseQuoteId = String(
    familySync?.baseQuoteId || "",
  ).trim();

  const existingOptions =
    Array.isArray(familySync?.options)
      ? familySync.options
      : [];

  const optionByRouteIndex =
    new Map<number, any>();

  existingOptions.forEach(
    (option: any) => {
      const routeIndex = Number(
        option?.routeIndex || 0,
      );

      if (routeIndex > 0) {
        optionByRouteIndex.set(
          routeIndex,
          option,
        );
      }
    },
  );

  for (
    let index = 0;
    index < selectedSmartBookingRoutes.length;
    index++
  ) {
    if (index > 0) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          ROUTE_SAVE_DELAY_MS,
        ),
      );
    }

    const routeVariantIndex = index + 1;

    const existingOption =
      optionByRouteIndex.get(
        routeVariantIndex,
      );

    const targetPlanId = Number(
      existingOption?.planId || 0,
    );

    const routePayload =
      buildSmartBookingRoutePayload(
        selectedSmartBookingRoutes[index],
        index,
        targetPlanId > 0
          ? targetPlanId
          : undefined,
      );

    const routeRes =
      await saveSmartBookingRoutePayload(
        routePayload,
        index,
      );

    registerSmartBookingResult(
      routeRes,
      index,
      String(
        existingOption?.quoteId || "",
      ),
    );
  }
} else {
  res = await itineraryService.create(
    finalPayload,
    type,
  );
}

if (createdRouteOptions.length > 0) {
  const routeOptionPayload =
    JSON.stringify(createdRouteOptions);

  const selectedSuggestedRouteIds =
    Array.from(
      new Set(
        selectedSmartBookingRoutes
          .map(
            (route: any) =>
              Number(route?.routeId || 0),
          )
          .filter(
            (routeId: number) =>
              routeId > 0,
          ),
      ),
    ).slice(0, 5);

  const selectedRouteIdsPayload =
    JSON.stringify(
      selectedSuggestedRouteIds,
    );

  createdRouteOptions.forEach(
    (option) => {
      localStorage.setItem(
        `itinerary-route-options:${option.quoteId}`,
        routeOptionPayload,
      );

      localStorage.setItem(
        `smart-booking-selected-route-ids:${option.quoteId}`,
        selectedRouteIdsPayload,
      );
    },
  );
}

setSaveProgressPercent(100);

    // planId for internal editing, quoteId for redirect to details
    const rawPlanId =
      res?.planId != null
        ? res.planId
        : itineraryPlanId;

    const nextId =
      rawPlanId !== undefined && rawPlanId !== null && !Number.isNaN(Number(rawPlanId))
        ? Number(rawPlanId)
        : null;

  const quoteId =
  res?.quoteId && typeof res.quoteId === "string"
    ? res.quoteId
    : null;

// Show success toast only when updating an existing itinerary.
// Do not show the "Itinerary created" popup after creating a new itinerary.
if (isUpdate) {
  toast({
    title: "Itinerary updated",
    description: "The itinerary has been updated successfully.",
  });
}
setSaveErrorMessage(null);
setShowRouteConfirm(false);

// NEW: redirect to itinerary-details using quoteId
if (quoteId) {
  // When creating a NEW itinerary, the hotel details returned by the
  // save response can be reused for faster initial rendering.
  //
  // When UPDATING an existing itinerary, do not reuse that snapshot.
  // Date/duration changes can rebuild hotel and vehicle pricing, so the
  // details page must load the latest persisted data.
 const initialHotelDetails =
  !isUpdate && res?.hotelDetails
    ? res.hotelDetails
    : undefined;

const hasUsableInitialHotelDetails =
  initialHotelDetails != null &&
  (
    (
      Array.isArray(initialHotelDetails.hotels) &&
      initialHotelDetails.hotels.length > 0
    ) ||
    (
      Array.isArray(initialHotelDetails.hotelSelectionState) &&
      initialHotelDetails.hotelSelectionState.length > 0
    ) ||
    (
      Array.isArray(initialHotelDetails.hotelTabs) &&
      initialHotelDetails.hotelTabs.length > 0
    )
  );

// Clear any previously cached itinerary-details response.
invalidateDetailsDeduped(String(quoteId));

// Keep the existing preload optimization only for NEW itineraries.
//
// For an update, do not immediately populate the details cache again.
// Let ItineraryDetails perform a fresh request after navigation.
if (!isUpdate) {
  try {
    await getDetailsDeduped(String(quoteId));
  } catch (detailsError) {
    console.warn(
      "Itinerary saved, but details preloading failed",
      detailsError,
    );
  }
}

try {
  // This only preloads the JS bundle and does not cache itinerary data.
  await import("@/pages/ItineraryDetails");
} catch (moduleError) {
  console.warn(
    "Itinerary details bundle preload failed",
    moduleError,
  );
}

navigate(`/itinerary-details/${quoteId}`, {
  replace: true,
  state: {
    // Skip the first hotel availability check only when the
    // create response already contains a usable hotel snapshot.
    skipInitialHotelAvailabilityValidation:
      !isUpdate && hasUsableInitialHotelDetails,

    ...(hasUsableInitialHotelDetails
      ? {
          initialHotelDetails,
          initialHotelDetailsAt: Date.now(),
        }
      : {}),
  },
});

return;
}

    // Fallback: if quoteId is missing, keep old behavior (stay on edit page)
    if (nextId) {
      navigate(`/create-itinerary?id=${nextId}`, { replace: true });
    }
  } catch (err) {
    console.error("Failed to save itinerary", err);
    const partialPayload = err instanceof ApiError && err.status === 422
      ? (err.payload as any)
      : null;
    if (partialPayload?.creationStatus === "PARTIAL") {
      const partialPlanId = Number(partialPayload.planId || 0);
      const partialQuoteId = String(partialPayload.quoteId || "").trim();
      if (partialPlanId > 0 && partialQuoteId) {
        const partialVehicleBuild = partialPayload.vehicleBuild && typeof partialPayload.vehicleBuild === "object"
          ? {
              status: typeof partialPayload.vehicleBuild.status === "string" ? partialPayload.vehicleBuild.status : undefined,
              message: typeof partialPayload.vehicleBuild.message === "string" ? partialPayload.vehicleBuild.message : undefined,
              buildRunId: typeof partialPayload.vehicleBuild.buildRunId === "string" ? partialPayload.vehicleBuild.buildRunId : undefined,
            }
          : undefined;
        const partialHotelSearch = partialPayload.hotelSearch && typeof partialPayload.hotelSearch === "object"
          ? {
              status: typeof partialPayload.hotelSearch.status === "string" ? partialPayload.hotelSearch.status : undefined,
              message: typeof partialPayload.hotelSearch.message === "string" ? partialPayload.hotelSearch.message : undefined,
              searchRunId: typeof partialPayload.hotelSearch.searchRunId === "string" ? partialPayload.hotelSearch.searchRunId : undefined,
            }
          : undefined;
        const partialSaveState: NonNullable<ItineraryDetailsLocationState["partialSave"]> = {
          planId: partialPlanId,
          quoteId: partialQuoteId,
          vehicleBuild: partialVehicleBuild,
          hotelSearch: partialHotelSearch,
        };
        partialSaveRef.current = partialSaveState;
        setSaveErrorMessage(
          partialHotelSearch?.status === "FAILED" && !partialVehicleBuild
            ? "The itinerary was saved, but hotel availability could not be checked. Open the saved itinerary to retry automatically."
            : `Itinerary saved (plan ${partialPlanId}, quote ${partialQuoteId}), but vehicle pricing failed. Opening the recovery page for an explicit retry.`,
        );
        toast({
          title: "Itinerary saved",
          description: partialHotelSearch?.status === "FAILED" && !partialVehicleBuild
            ? "Open the saved itinerary to retry hotel availability automatically."
            : "Vehicle pricing failed. Use the explicit retry on the recovery page.",
        });
        navigate(`/itinerary-details/${partialQuoteId}`, {
          replace: true,
          state: { partialSave: partialSaveState } satisfies ItineraryDetailsLocationState,
        });
        return;
      }
    }
    const errorMessage =
      err instanceof Error && err.message.trim()
        ? err.message
        : "There was an error while saving the itinerary.";
    setSaveErrorMessage(errorMessage);
  } finally {
    stopSaveProgress();
    isSavingRef.current = false;
    setIsSaving(false);
    setActiveSaveType(null);
    setTransportLoadingMessageIndex(0);
  }
};



  return { handleSaveWithType };
}
