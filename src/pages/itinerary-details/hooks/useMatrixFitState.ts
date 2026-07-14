/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";

type UseMatrixFitStateOptions = {
  activePreviewResolution: any;
  groupPreviewResolution: any;
  matrixFit: any;
};

/** Derives matrix-build availability and chosen-slot validity for manual hotspot previews. */
export const useMatrixFitState = ({
  activePreviewResolution,
  groupPreviewResolution,
  matrixFit,
}: UseMatrixFitStateOptions) => {
  const matrixBuildSuggestion = useMemo(() => {
    return (activePreviewResolution as any)?.missingMatrixBuildSuggestion
      || (activePreviewResolution as any)?.resolution?.missingMatrixBuildSuggestion
      || (groupPreviewResolution as any)?.missingMatrixBuildSuggestion
      || (groupPreviewResolution as any)?.resolution?.missingMatrixBuildSuggestion
      || null;
  }, [activePreviewResolution, groupPreviewResolution]);

  const hasValidChosenMatrixSlot = useMemo(() => {
    const chosen = matrixFit?.chosenSlot;
    if (!chosen) return false;
    const routeFitType = String(chosen?.routeFitType || '').toUpperCase();
    if (matrixFit?.destinationInsertionMode === true) {
      return (
        Number(chosen?.fromHotspotId || 0) > 0
        && ['DESTINATION_SIDE_INSERTION', 'MINOR_DETOUR'].includes(routeFitType)
      );
    }

    if (routeFitType === 'SINGLE_HOTSPOT_BEFORE') {
      return (
        matrixFit?.routeFitAvailable !== false
        && Number(chosen?.toHotspotId || 0) > 0
      );
    }

    if (routeFitType === 'SINGLE_HOTSPOT_AFTER') {
      return (
        matrixFit?.routeFitAvailable !== false
        && Number(chosen?.fromHotspotId || 0) > 0
      );
    }

    return (
      matrixFit?.routeFitAvailable !== false
      && ['ON_ROUTE', 'MINOR_DETOUR'].includes(routeFitType)
      && Number(chosen?.fromHotspotId || 0) > 0
      && Number(chosen?.toHotspotId || 0) > 0
    );
  }, [matrixFit]);

  const matrixFitAlreadyHasUsableData = useMemo(() => {
    const fit = matrixFit as any;
    const chosen = fit?.chosenSlot || fit?.bestSlot || null;
    const slotContext = String(chosen?.slotContext || '').toUpperCase();
    const routeFitType = String(chosen?.routeFitType || '').toUpperCase();

    return (
      fit?.requiresMatrixBuild !== true
      && (
        fit?.hasAnyMatrixData === true
        || fit?.hasFeasibleMatrixSlot === true
        || (
          fit?.cityEndpointInsertionMode === true
          && ['CITY_TO_CITY', 'CITY_TO_HOTSPOT', 'HOTSPOT_TO_CITY'].includes(slotContext)
          && ['ON_ROUTE', 'MINOR_DETOUR'].includes(routeFitType)
        )
      )
    );
  }, [matrixFit]);

  return { matrixBuildSuggestion, hasValidChosenMatrixSlot, matrixFitAlreadyHasUsableData };
};
