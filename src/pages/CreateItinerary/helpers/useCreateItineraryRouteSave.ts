/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef } from "react";
import { ApiError } from "@/lib/api";
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

const shouldCreateAllRouteOptions =
  !itineraryPlanId &&
  isDefaultItinerary &&
  Array.isArray(suggestedDefaultRoutes) &&
  suggestedDefaultRoutes.length > 1;
let res: any = null;
const createdRouteOptions: Array<{ quoteId: string; label: string }> = [];
let sharedRouteFamilyBaseQuoteId = "";

if (shouldCreateAllRouteOptions) {
  const createSuggestedRouteOption = async (route: any, index: number) => {
    // Route 1 (index 0): use the user-edited finalPayload directly.
    // Route 2+ (index > 0): build payload from the raw suggested route data.
    const baseRoutePayload =
      index === 0
        ? finalPayload
        : buildPayloadForSuggestedRoute(route, finalPayload);

    const routePayload = {
      ...baseRoutePayload,
      plan: {
        ...(baseRoutePayload?.plan || {}),
        route_variant_index: index + 1,
        route_variant_count: suggestedDefaultRoutes.length,
        route_family_base_quote_id: sharedRouteFamilyBaseQuoteId || undefined,
      },
    };

    const routeRes: any = await itineraryService.create(routePayload, type);
    const createdQuoteId = extractCreatedQuoteId(routeRes);
    const createdRouteFamilyBaseQuoteId = extractRouteFamilyBaseQuoteId(
      routeRes,
      createdQuoteId
    );

    if (!sharedRouteFamilyBaseQuoteId && createdRouteFamilyBaseQuoteId) {
      sharedRouteFamilyBaseQuoteId = createdRouteFamilyBaseQuoteId;
    }

    if (!createdQuoteId) {
      console.warn("Suggested route created but quote ID was not found", {
        index,
        routeRes,
      });
    }

    return {
      routeRes,
      option: createdQuoteId
        ? {
            quoteId: String(createdQuoteId),
            label: `Route ${index + 1}`,
          }
        : null,
    };
  };

// Save sibling routes one-by-one with a small delay between each call.
  // Do NOT use Promise.all: backend quote ID generation is not concurrency-safe.
  // The delay prevents rapid sequential POSTs from causing 500 errors on the backend.
  const DELAY_BETWEEN_ROUTE_SAVES_MS = 300;

  for (let index = 0; index < suggestedDefaultRoutes.length; index++) {
    // Small pause between saves (skip delay for the first one)
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_ROUTE_SAVES_MS));
    }

    const created = await createSuggestedRouteOption(
      suggestedDefaultRoutes[index],
      index
    );

    if (index === 0) {
      res = created.routeRes;
    }

    if (created.option) {
      createdRouteOptions.push(created.option);
    }
  }
  if (createdRouteOptions.length > 0) {
    const routeOptionPayload = JSON.stringify(createdRouteOptions);

    createdRouteOptions.forEach((option) => {
      localStorage.setItem(
        `itinerary-route-options:${option.quoteId}`,
        routeOptionPayload
      );
    });
  }
} else {
  res = await itineraryService.create(finalPayload, type);
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
      let initialHotelDetails = !isUpdate && res?.hotelDetails
        ? res.hotelDetails
        : undefined;
      // Some API deployments persist the fresh selection rows but omit the
      // live inventory from the create response. Reuse the same reset
      // endpoint used by the details-page Reset Hotels action so a newly
      // created itinerary receives the complete hotel list on first render.
      if (!isUpdate && Number(finalPayload?.plan?.itinerary_preference || 0) !== 2 &&
        (!Array.isArray(initialHotelDetails?.hotels) || initialHotelDetails.hotels.length === 0)) {
        try {
          // Reset mutates the persisted hotel selections and returns the
          // financial summary. Fetch the hotel pane separately so a
          // financial-summary-only reset response is never treated as
          // hotelDetails.
          await itineraryService.resetHotelAvailability(String(quoteId));
          const availabilityResult = await itineraryService.checkHotelAvailability(String(quoteId));
          initialHotelDetails = availabilityResult?.hotelDetails || availabilityResult;
        } catch (resetError) {
          console.warn("Itinerary created, but initial hotel availability load failed", resetError);
        }
      }
      // Updating itinerary rules causes the backend to run a fresh hotel
      // availability reset. Do not let the details preloader reuse the old
      // 15-second client snapshot (old rooms/rates/categories) after that
      // reset. The fresh response also carries the selected-rate change
      // summary, so the details page can request confirmation when needed.
      invalidateDetailsDeduped(String(quoteId));
      // Keep the save modal visible while the first details payload is loaded.
      // The details page reuses this short-lived response and does not flash a
      // second initial loader after navigation.
      try {
        await getDetailsDeduped(String(quoteId));
      } catch (detailsError) {
        console.warn("Itinerary saved, but details preloading failed", detailsError);
      }
      try {
        // Preload the lazy details bundle while the save modal is still open.
        // This prevents ItineraryDetailsRouter's brief "Loading itinerary..."
        // Suspense fallback after navigation.
        await import("@/pages/ItineraryDetails");
      } catch (moduleError) {
        console.warn("Itinerary details bundle preload failed", moduleError);
      }
     navigate(`/itinerary-details/${quoteId}`, {
  replace: true,
  state: {
    skipInitialHotelAvailabilityValidation: !isUpdate,
    ...(!isUpdate && initialHotelDetails
      ? { initialHotelDetails }
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
