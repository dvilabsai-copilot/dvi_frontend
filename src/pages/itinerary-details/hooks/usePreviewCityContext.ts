/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo } from "react";
import type { AvailableHotspot } from "../itinerary-details.types";
import { deriveHotspotCityContext as deriveHotspotCityContextUtil } from "../utils/hotspotCityContext.utils";

type UsePreviewCityContextOptions = {
  activePreviewHotspotId: number | null;
  activePreviewResolution: any;
  addHotspotModal: any;
  availableHotspots: AvailableHotspot[];
  currentRouteForModal: any;
  groupPreviewResolution: any;
  hotspotFilterMeta: any;
  manualPreviewState: any;
  matrixFit: any;
};

/** Derives preview hotspot city context and destination-side matrix mode flags. */
export const usePreviewCityContext = ({
  activePreviewHotspotId,
  activePreviewResolution,
  addHotspotModal,
  availableHotspots,
  currentRouteForModal,
  groupPreviewResolution,
  hotspotFilterMeta,
  manualPreviewState,
  matrixFit,
}: UsePreviewCityContextOptions) => {
  const deriveHotspotCityContext = useCallback((hotspot: AvailableHotspot) => deriveHotspotCityContextUtil(hotspot, {
    sourceCityKey: hotspotFilterMeta?.sourceCityKey,
    destinationCityKey: hotspotFilterMeta?.destinationCityKey,
    departure: currentRouteForModal?.departure,
    arrival: currentRouteForModal?.arrival,
    locationName: addHotspotModal.locationName,
  }), [
    hotspotFilterMeta?.destinationCityKey,
    hotspotFilterMeta?.sourceCityKey,
    currentRouteForModal?.arrival,
    currentRouteForModal?.departure,
    addHotspotModal.locationName,
  ]);

  const activePreviewHotspot = useMemo(
    () => availableHotspots.find((h) => Number(h.id) === Number(activePreviewHotspotId || 0)) || null,
    [availableHotspots, activePreviewHotspotId],
  );

  const selectedPreviewCityContext = useMemo(() => {
    const backend = String(manualPreviewState?.manualInsertionFit?.hotspotCityContext || '').trim().toUpperCase();
    if (backend === 'SOURCE_CITY' || backend === 'DESTINATION_CITY') {
      return backend as 'SOURCE_CITY' | 'DESTINATION_CITY';
    }
    if (!activePreviewHotspot) return null;
    return deriveHotspotCityContext(activePreviewHotspot);
  }, [manualPreviewState?.manualInsertionFit?.hotspotCityContext, activePreviewHotspot, deriveHotspotCityContext]);

  const isDestinationSideManualPreview = useMemo(() => {
    const sources: any[] = [
      matrixFit,
      manualPreviewState,
      activePreviewResolution,
      (activePreviewResolution as any)?.manualInsertionFit,
      (activePreviewResolution as any)?.resolution?.manualInsertionFit,
      groupPreviewResolution,
      (groupPreviewResolution as any)?.manualInsertionFit,
      (groupPreviewResolution as any)?.resolution?.manualInsertionFit,
      (matrixFit as any)?.chosenSlot,
      (matrixFit as any)?.bestSlot,
      (matrixFit as any)?.requestedSlot,
      (activePreviewResolution as any)?.manualInsertionFit?.chosenSlot,
      (activePreviewResolution as any)?.manualInsertionFit?.bestSlot,
      (activePreviewResolution as any)?.resolution?.manualInsertionFit?.chosenSlot,
      (activePreviewResolution as any)?.resolution?.manualInsertionFit?.bestSlot,
    ];

    return (
      selectedPreviewCityContext === 'DESTINATION_CITY'
      || sources.some((source) => {
        const code = String(source?.code || '').toUpperCase();
        const reason = String(source?.validation?.reason || source?.reason || '').toUpperCase();
        const cityContext = String(source?.hotspotCityContext || '').toUpperCase();
        const slotSource = String(source?.source || '').toUpperCase();
        const routeFitType = String(source?.routeFitType || '').toUpperCase();
        const slotContext = String(source?.slotContext || '').toUpperCase();

        return (
          source?.destinationInsertionMode === true
          || cityContext === 'DESTINATION_CITY'
          || code === 'MANUAL_HOTSPOT_DESTINATION_INSERT_PREVIEW_READY'
          || code === 'DESTINATION_SIDE_MATRIX_NOT_REQUIRED'
          || reason === 'DESTINATION_SIDE_MATRIX_NOT_REQUIRED'
          || slotSource === 'DESTINATION_CITY_AFTER_REACHED'
          || slotSource === 'DESTINATION_CITY_REACHED_TO_HOTEL'
          || slotSource === 'DESTINATION_CITY_ENDPOINT'
          || routeFitType === 'DESTINATION_SIDE_INSERTION'
          || slotContext === 'DESTINATION_CITY_TO_HOTEL'
        );
      })
    );
  }, [
    matrixFit,
    manualPreviewState,
    activePreviewResolution,
    groupPreviewResolution,
    selectedPreviewCityContext,
  ]);

  return {
    deriveHotspotCityContext,
    activePreviewHotspot,
    selectedPreviewCityContext,
    isDestinationSideManualPreview,
  };
};
