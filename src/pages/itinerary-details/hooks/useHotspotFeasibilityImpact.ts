/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";

type UseHotspotFeasibilityImpactOptions = {
  itinerary: any;
  availableHotspots: any[];
  activePreviewHotspotId: number | null;
  activePreviewResolution: any;
  normalizedInsertionSlots: any[];
  manualAttemptDisplayMeta: { attempts: readonly any[] };
  matrixRequiresBuild: boolean;
  isMatrixBuiltButNoFeasibleSlot: boolean;
};

export type HotspotFeasibilityImpact = {
  hotspotName: string;
  entryCostPerPerson: number;
  paxCount: number;
  estimatedEntryCost: number;
  hasEntryCost: boolean;
  extraKm: number;
  extraKmKnown: boolean;
  overflowMinutes: number;
  hasOverflow: boolean;
  currentVehicleQty: number;
  hasVehicleData: boolean;
  vehicleImpact: "none" | "absorbed" | "likely_extra";
  vehicleImpactNote: string;
  closingTimeKnown: boolean;
  closingTimeConflict: boolean;
  accuracyNote: string | null;
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Derives the consolidated feasibility impact for the selected hotspot preview. */
export const useHotspotFeasibilityImpact = ({
  itinerary,
  availableHotspots,
  activePreviewHotspotId,
  activePreviewResolution,
  normalizedInsertionSlots,
  manualAttemptDisplayMeta,
  matrixRequiresBuild,
  isMatrixBuiltButNoFeasibleSlot,
}: UseHotspotFeasibilityImpactOptions): HotspotFeasibilityImpact => useMemo(() => {
  const hotspot = availableHotspots.find((item) => Number(item?.id) === Number(activePreviewHotspotId || 0)) || null;
  const hotspotName = String(hotspot?.name || "").trim();
  const entryCostPerPerson = Math.max(0, toNumber(hotspot?.amount));

  const paxCount = Math.max(toNumber(itinerary?.adults) + toNumber(itinerary?.children), 0);
  const estimatedEntryCost = entryCostPerPerson * paxCount;

  const bestSlot = normalizedInsertionSlots.find((slot) => slot?.isBest)
    || normalizedInsertionSlots[0]
    || null;
  const detourKm = bestSlot?.roadDetourKm != null ? toNumber(bestSlot.roadDetourKm) : null;
  const resolutionDelta = activePreviewResolution?.newHotspot?.distanceDelta != null
    ? toNumber(activePreviewResolution.newHotspot.distanceDelta)
    : null;
  const slotDelta = bestSlot?.distanceDelta != null ? toNumber(bestSlot.distanceDelta) : null;
  const attempts = Array.isArray(manualAttemptDisplayMeta.attempts)
    ? manualAttemptDisplayMeta.attempts
    : [];
  const attemptExtraKm = attempts
    .map((attempt) => toNumber(attempt?.extraTravelKm))
    .filter((value) => value > 0)
    .reduce((max, value) => Math.max(max, value), 0) || null;
  const attemptOverflowMin = attempts
    .map((attempt) => toNumber(attempt?.routeEndOverflowMinutes))
    .filter((value) => value > 0)
    .reduce((max, value) => Math.max(max, value), 0);
  const closingTimeKnown = attempts.length > 0;
  const closingTimeConflict = attempts.some((attempt) => toNumber(attempt?.openingHourConflictCount) > 0);

  const rawExtraKm = detourKm ?? resolutionDelta ?? slotDelta ?? attemptExtraKm ?? null;
  const extraKm = rawExtraKm == null ? 0 : Math.max(0, rawExtraKm);
  const extraKmKnown = rawExtraKm != null;

  const vehicleRows = Array.isArray(itinerary?.vehicles) ? itinerary.vehicles : [];
  const vehicleQtyFromRows = vehicleRows
    .map((row) => toNumber(row?.totalQty))
    .reduce((sum, value) => sum + value, 0);
  const vehicleQtyFromBreakdown = toNumber(itinerary?.costBreakdown?.totalVehicleQty);
  const currentVehicleQty = Math.max(vehicleQtyFromBreakdown || vehicleQtyFromRows, 0);
  const hasVehicleData = currentVehicleQty > 0;

  let vehicleImpact: "none" | "absorbed" | "likely_extra" = "none";
  if (!extraKmKnown || extraKm <= 0) {
    vehicleImpact = "none";
  } else if (extraKm < 15) {
    vehicleImpact = "absorbed";
  } else {
    vehicleImpact = "likely_extra";
  }
  const vehicleImpactNote = hasVehicleData
    ? (vehicleImpact === "likely_extra"
      ? `+${extraKm.toFixed(1)} km may exceed the current ${currentVehicleQty} vehicle(s) budget; confirm after rebuild.`
      : vehicleImpact === "absorbed"
        ? `+${extraKm.toFixed(1)} km is within the current ${currentVehicleQty} vehicle(s) budget.`
        : "No additional vehicle usage detected.")
    : (vehicleImpact === "likely_extra"
      ? `+${extraKm.toFixed(1)} km may require an additional vehicle or extended vehicle usage; confirm after rebuild.`
      : "Vehicle details will be recomputed after the route rebuild.");

  const accuracyNote = matrixRequiresBuild
    ? "Impact figures refine once the route-fit matrix is built."
    : isMatrixBuiltButNoFeasibleSlot
      ? "Impact figures are approximate because this hotspot is off-route."
      : null;

  return {
    hotspotName,
    entryCostPerPerson,
    paxCount,
    estimatedEntryCost,
    hasEntryCost: entryCostPerPerson > 0,
    extraKm,
    extraKmKnown,
    overflowMinutes: attemptOverflowMin,
    hasOverflow: attemptOverflowMin > 0,
    currentVehicleQty,
    hasVehicleData,
    vehicleImpact,
    vehicleImpactNote,
    closingTimeKnown,
    closingTimeConflict,
    accuracyNote,
  };
}, [
  itinerary,
  availableHotspots,
  activePreviewHotspotId,
  activePreviewResolution,
  normalizedInsertionSlots,
  manualAttemptDisplayMeta,
  matrixRequiresBuild,
  isMatrixBuiltButNoFeasibleSlot,
]);