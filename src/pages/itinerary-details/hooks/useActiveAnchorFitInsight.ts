/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";

type UseActiveAnchorFitInsightOptions = {
  matrixRequiresBuild: boolean;
  normalizedInsertionSlots: any[];
  addHotspotRouteId: number | null | undefined;
  selectedHotspotId: number | null;
  matrixFit: any;
  manualPreviewState: any;
  activePreviewResolution: any;
  destinationHotelDisplayName: string | null;
};

/** Derives the route-fit insight shown for the currently selected preview anchor. */
export const useActiveAnchorFitInsight = ({
  matrixRequiresBuild,
  normalizedInsertionSlots,
  addHotspotRouteId,
  selectedHotspotId,
  matrixFit,
  manualPreviewState,
  activePreviewResolution,
  destinationHotelDisplayName,
}: UseActiveAnchorFitInsightOptions) => useMemo(() => {
  if (matrixRequiresBuild) return null;
  const bestSlot = normalizedInsertionSlots.find((slot) => slot?.isBest)
    || normalizedInsertionSlots[0]
    || null;
  const routeId = Number(addHotspotRouteId || 0);
  if (!routeId || !selectedHotspotId) return null;

  const fitBest = matrixFit?.bestSlot ?? null;
  const fitChosen = matrixFit?.chosenSlot ?? null;
  const selectedIdNum = Number(selectedHotspotId || 0);
  const chosenInvalid = Boolean(
    fitChosen
    && (Number(fitChosen?.fromHotspotId) === selectedIdNum || Number(fitChosen?.toHotspotId) === selectedIdNum),
  );
  const safeChosen = chosenInvalid ? null : fitChosen;
  const sourceSlot = safeChosen || fitBest;

  if (sourceSlot) {
    const fitType: string = sourceSlot.routeFitType || '';
    const fitTypeUpper = String(fitType || '').toUpperCase();
    const sourceLabelText = String(sourceSlot.displayLabel || sourceSlot.label || '').toLowerCase();
    const sourceFinalReasonText = String(sourceSlot.finalDecisionReason || '').toLowerCase();
    const sourceNoRouteTagged = sourceLabelText.includes('no route data')
      || sourceFinalReasonText.includes('no route data');
    const hasRouteDataForSlot = (
      sourceSlot?.routePossible !== false
      && fitTypeUpper !== 'UNKNOWN'
      && fitTypeUpper !== 'MATRIX_UNAVAILABLE'
      && !sourceNoRouteTagged
    );
    const label: string = sourceSlot.displayLabel || sourceSlot.label || fitType;
    const detour: number | null = sourceSlot.roadDetourKm != null ? Number(sourceSlot.roadDetourKm) : null;
    const isDestinationSidePreview = String(manualPreviewState?.manualInsertionFit?.hotspotCityContext || '').trim().toUpperCase() === 'DESTINATION_CITY';
    const rawToName = String(sourceSlot?.toName || '').trim();
    const matrixDestinationName = String(matrixFit?.destinationHotelName || '').trim().toLowerCase();
    const resolvedToName = (
      isDestinationSidePreview
      && destinationHotelDisplayName
      && (
        /^hotel$/i.test(rawToName)
        || (matrixDestinationName.length > 0 && rawToName.toLowerCase() === matrixDestinationName)
        || Number(sourceSlot?.destinationHotelId || 0) > 0
      )
    ) ? destinationHotelDisplayName : rawToName;
    const tone = fitType === 'ON_ROUTE' || fitType === 'MINOR_DETOUR'
      ? 'green' as const
      : fitType === 'BACKTRACK'
        ? 'amber' as const
        : 'red' as const;
    const hasNamedAnchors = String(sourceSlot?.fromName || '').trim().length > 0
      && String(resolvedToName || '').trim().length > 0;
    const between = hasNamedAnchors ? `${sourceSlot.fromName} → ${resolvedToName}` : null;
    const extraLabel = hasRouteDataForSlot && detour != null ? `+${detour.toFixed(1)} km` : null;
    return {
      label,
      tone: hasRouteDataForSlot ? tone : ('red' as const),
      extraDistanceLabel: extraLabel,
      anchorLegLabel: between,
      insertedLabel: hasRouteDataForSlot ? label : 'No route data',
      reason: sourceSlot.decisionReason || null,
      source: matrixFit?.chosenSlotSource || null,
      warning: matrixFit?.warning || null,
      requestedSlot: matrixFit?.requestedSlot || null,
      chosenSlot: safeChosen,
    };
  }

  const distanceDelta = bestSlot?.distanceDelta ?? activePreviewResolution?.newHotspot?.distanceDelta;
  const bestFits = bestSlot ? (bestSlot?.fitsOverall !== false) : true;
  const bestReason = bestSlot?.timingReason || null;

  if (!bestFits) {
    return {
      label: 'Not on the way',
      tone: 'red' as const,
      extraDistanceLabel: null,
      anchorLegLabel: null,
      insertedLabel: 'Selected slot is not feasible',
      reason: bestReason,
    };
  }

  if (Number.isFinite(distanceDelta) && distanceDelta !== null) {
    const delta = Number(distanceDelta);
    const isNeutral = Math.abs(delta) <= 0.5;

    if (isNeutral || delta <= 0) {
      return {
        label: 'Fits on the way',
        tone: 'green' as const,
        extraDistanceLabel: delta < -0.5 ? `~${Math.abs(delta).toFixed(1)} km shorter` : 'No extra backtrack',
        anchorLegLabel: null,
        insertedLabel: 'Inserted correctly between spots',
      };
    }

    return {
      label: 'Distance increased',
      tone: 'red' as const,
      extraDistanceLabel: `+${delta.toFixed(1)} km extra travel`,
      anchorLegLabel: null,
      insertedLabel: `Inserted with detour (+${delta.toFixed(1)} km)`,
      reason: null,
    };
  }

  return {
    label: 'Inserted',
    tone: 'amber' as const,
    extraDistanceLabel: null,
    anchorLegLabel: null,
    insertedLabel: 'Inserted (distance unavailable)',
    reason: null,
  };
}, [
  addHotspotRouteId,
  activePreviewResolution,
  destinationHotelDisplayName,
  matrixFit,
  matrixRequiresBuild,
  manualPreviewState,
  normalizedInsertionSlots,
  selectedHotspotId,
]);
