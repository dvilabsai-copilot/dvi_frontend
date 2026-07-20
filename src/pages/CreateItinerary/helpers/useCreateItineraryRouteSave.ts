/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef } from "react";

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

const handleSaveWithType = async (
  type: "itineary_basic_info" | "itineary_basic_info_with_optimized_route",
) => {
  if (isSavingRef.current) return; // sync guard ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â prevents double-fire before setState re-render
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

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Single POST endpoint for both create & update
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
      console.warn("ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Suggested route created but quote ID was not found", {
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

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ planId for internal editing, quoteId for redirect to details
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

    toast({
      title: isUpdate ? "Itinerary updated" : "Itinerary created",
      description: `${
        isUpdate
          ? "The itinerary has been updated successfully."
          : "The itinerary has been created successfully."
      }`,
    });

    setSaveErrorMessage(null);
    setShowRouteConfirm(false);

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ NEW: redirect to itinerary-details using quoteId
    if (quoteId) {
      navigate(`/itinerary-details/${quoteId}`, { replace: true });
      return;
    }

    // ÃƒÂ¢Ã‚Â¬Ã¢â‚¬Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â Fallback: if quoteId is missing, keep old behavior (stay on edit page)
    if (nextId) {
      navigate(`/create-itinerary?id=${nextId}`, { replace: true });
    }
  } catch (err) {
    console.error("Failed to save itinerary", err);
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
