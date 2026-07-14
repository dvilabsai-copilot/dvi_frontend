/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { normalizeInsertionSlots } from "../utils/normalizedInsertionSlots.utils";

type UsePreviewSlotStateOptions = {
  activePreviewResolution: any;
  destinationHotelDisplayName: string;
  effectivePreviewTimeline: any[];
  matrixFit: any;
  matrixRequiresBuild: boolean;
  manualPreviewState: any;
  selectedHotspotAnchor: any;
  selectedHotspotId: number | null;
};

/** Derives safe matrix slots, effective fit, normalized insertion slots, and their display helpers. */
export const usePreviewSlotState = ({
  activePreviewResolution,
  destinationHotelDisplayName,
  effectivePreviewTimeline,
  matrixFit,
  matrixRequiresBuild,
  manualPreviewState,
  selectedHotspotAnchor,
  selectedHotspotId,
}: UsePreviewSlotStateOptions) => {
  const resolvedRemovalTimelineLeak = useMemo(() => {
    const resolved = (matrixFit as any)?.lowPriorityRemovalPlanPreview?.resolved === true;
    if (!resolved || !Array.isArray(effectivePreviewTimeline) || effectivePreviewTimeline.length === 0) return false;

    const plannedRemovals: any[] = Array.isArray((matrixFit as any)?.lowPriorityRemovalPlanPreview?.plannedRemovals)
      ? (matrixFit as any).lowPriorityRemovalPlanPreview.plannedRemovals
      : [];
    if (plannedRemovals.length === 0) return false;

    const removedIds = new Set(
      plannedRemovals
        .map((row) => Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.locationId || 0))
        .filter((id: number) => Number.isFinite(id) && id > 0),
    );
    const removedNames = new Set(
      plannedRemovals
        .map((row) => String(row?.name || row?.hotspotName || '').trim().toLowerCase())
        .filter(Boolean),
    );

    return effectivePreviewTimeline.some((row) => {
      const rowId = Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0);
      const rowText = String(row?.text || row?.name || row?.to || row?.toName || '').trim().toLowerCase();
      if (rowId > 0 && removedIds.has(rowId)) return true;
      for (const removedName of removedNames) {
        if (removedName && rowText.includes(removedName)) return true;
      }
      return false;
    });
  }, [effectivePreviewTimeline, matrixFit]);

  const safeMatrixSlots = useMemo(() => {
    const selectedIdNum = Number(selectedHotspotId || 0);
    const allSlots: any[] = Array.isArray(matrixFit?.allSlotResults)
      ? matrixFit.allSlotResults
      : [];
    return allSlots.filter((slot) => (
      Number(slot?.fromHotspotId) !== selectedIdNum
      && Number(slot?.toHotspotId) !== selectedIdNum
    ));
  }, [matrixFit, selectedHotspotId]);

  const effectiveFitSlot = useMemo(() => {
    if (matrixRequiresBuild) return null;
    if (!matrixFit) return null;
    const selectedIdNum = Number(selectedHotspotId || 0);
    const chosen = (matrixFit as any)?.chosenSlot ?? null;
    const best = (matrixFit as any)?.bestSlot ?? null;

    const isInvalid = (slot): boolean => {
      if (!slot) return true;
      return Number(slot?.fromHotspotId) === selectedIdNum || Number(slot?.toHotspotId) === selectedIdNum;
    };

    if (!isInvalid(chosen)) return chosen;
    if (!isInvalid(best)) return best;

    return safeMatrixSlots.find((slot) => !isInvalid(slot)) || null;
  }, [matrixFit, matrixRequiresBuild, safeMatrixSlots, selectedHotspotId]);

  /** Helper: map route_fit_type to Tailwind badge classes */
  const routeFitBadgeClass = (routeFitType: string | undefined): string => {
    switch (routeFitType) {
      case 'ON_ROUTE':    return 'bg-green-100 text-green-800';
      case 'MINOR_DETOUR': return 'bg-amber-100 text-amber-700';
      case 'BACKTRACK':   return 'bg-orange-100 text-orange-700';
      case 'OFF_ROUTE':   return 'bg-red-100 text-red-700';
      case 'DESTINATION_SIDE_INSERTION': return 'bg-blue-100 text-blue-700';
      case 'MATRIX_UNAVAILABLE': return 'bg-gray-100 text-gray-600';
      default:            return 'bg-gray-100 text-gray-500';
    }
  };

  const normalizedInsertionSlots = useMemo(() => normalizeInsertionSlots({
    matrixFit,
    activePreviewResolution,
    effectivePreviewTimeline: effectivePreviewTimeline as Record<string, unknown>[],
    selectedHotspotAnchor,
    selectedHotspotId,
    matrixRequiresBuild,
    destinationHotelDisplayName,
    manualInsertionHotspotCityContext: manualPreviewState?.manualInsertionFit?.hotspotCityContext,
  }) as any[], [
    activePreviewResolution,
    effectivePreviewTimeline,
    selectedHotspotAnchor,
    selectedHotspotId,
    matrixFit,
    matrixRequiresBuild,
    destinationHotelDisplayName,
    manualPreviewState?.manualInsertionFit?.hotspotCityContext,
  ]);
      // Ã¢ââ¬Ã¢ââ¬ From manualInsertionFit.allSlotResults Ã¢ââ¬Ã¢ââ¬
  return {
    resolvedRemovalTimelineLeak,
    safeMatrixSlots,
    effectiveFitSlot,
    routeFitBadgeClass,
    normalizedInsertionSlots,
  };
};
