type Slot = Record<string, unknown>;
type PreviewRow = Record<string, unknown>;

export function normalizeInsertionSlots(options: {
  matrixFit: Slot | null | undefined;
  activePreviewResolution: Slot | null | undefined;
  effectivePreviewTimeline: PreviewRow[];
  selectedHotspotAnchor: Slot | null | undefined;
  selectedHotspotId: number | null | undefined;
  matrixRequiresBuild: boolean;
  destinationHotelDisplayName: string;
  manualInsertionHotspotCityContext?: string | null;
}): Slot[] {
  const isDestinationSidePreview = options.matrixFit?.destinationInsertionMode === true
    || String(options.manualInsertionHotspotCityContext || "").trim().toUpperCase() === "DESTINATION_CITY";
  const rawSlots = Array.isArray(options.matrixFit?.allSlotResults) && options.matrixFit.allSlotResults.length > 0
    ? options.matrixFit.allSlotResults
    : (Array.isArray(options.activePreviewResolution?.slotInsights)
      ? options.activePreviewResolution.slotInsights
      : (Array.isArray(options.activePreviewResolution?.allInsertionSlots)
        ? options.activePreviewResolution.allInsertionSlots
        : []));
  if (!rawSlots.length) return [];

  const stopNames: string[] = [];
  const requestedFrom = String(options.selectedHotspotAnchor?.anchorFrom || "").trim();
  if (requestedFrom) stopNames.push(requestedFrom);
  for (const segment of options.effectivePreviewTimeline) {
    const type = String(segment.type || "").toLowerCase();
    const hotspotId = Number(segment.hotspotId ?? segment.locationId ?? segment.hotspot_ID ?? 0);
    if (type === "attraction" && hotspotId === Number(options.selectedHotspotId || 0)) continue;
    let label = "";
    if (type === "attraction") label = String(segment.text || segment.name || "").trim();
    else if (type === "hotel" || type === "checkin") label = String(segment.hotelName || segment.toName || "").trim() || options.destinationHotelDisplayName || "Hotel";
    if (label && stopNames[stopNames.length - 1] !== label) stopNames.push(label);
  }

  const bestSlotIndex = (options.matrixFit?.bestSlot as Slot | undefined)?.slotIndex as number | null | undefined;
  return (rawSlots as Slot[]).map((slot, index) => {
    const fromName = String(slot.fromName || stopNames[index] || `Stop ${index + 1}`);
    const rawToName = String(slot.toName || stopNames[index + 1] || "Destination").trim();
    const matrixDestinationName = String(options.matrixFit?.destinationHotelName || "").trim().toLowerCase();
    const toName = isDestinationSidePreview && options.destinationHotelDisplayName && (
      /^hotel$/i.test(rawToName)
      || (matrixDestinationName.length > 0 && rawToName.toLowerCase() === matrixDestinationName)
      || Number(slot.destinationHotelId || 0) > 0
    ) ? options.destinationHotelDisplayName : rawToName;

    const routeFitType = String(slot.routeFitType || "");
    const routeFitStatus = String(slot.routeFitStatus || routeFitType || "").toUpperCase();
    const routeFitLabel = String(slot.label || "");
    const routeFitDisplayLabel = String(slot.displayLabel || routeFitLabel);
    const routeFitShortLabel = String(slot.shortLabel || routeFitDisplayLabel || routeFitLabel);
    const roadDetourKm = slot.roadDetourKm != null ? Number(slot.roadDetourKm) : null;
    const isZeroExtraDetour = slot.isZeroExtraDetour === true || (roadDetourKm != null && roadDetourKm <= 0.5);
    const metrics = slot.routeMetrics as Slot | undefined;
    const metricsSource = String(metrics?.source || "NONE").toUpperCase();
    const hasTrustedMetrics = metricsSource === "MATRIX_CACHE";
    const directKmRaw = hasTrustedMetrics ? metrics?.directKm : null;
    const viaKmRaw = hasTrustedMetrics ? metrics?.viaKm : null;
    const extraKmRaw = hasTrustedMetrics ? metrics?.extraKm : null;
    const directKm = Number(directKmRaw ?? slot.directKm ?? slot.abOsrmDistanceKm ?? 0);
    const distanceDeltaRaw = roadDetourKm != null ? roadDetourKm : Number(slot.distanceDelta || 0);
    const distanceDelta = Math.max(0, Number.isFinite(distanceDeltaRaw) ? distanceDeltaRaw : 0);
    const viaKm = Number(viaKmRaw ?? slot.insertedRouteDistanceKm ?? slot.viaKm ?? (directKm + distanceDelta));
    const normalizedDisplayLabel = routeFitStatus === "MATRIX_UNAVAILABLE" || routeFitStatus === "NO_ROUTE_DATA"
      ? "Route data unavailable for this slot"
      : routeFitDisplayLabel;
    const isFeasibleType = routeFitType === "ON_ROUTE" || routeFitType === "MINOR_DETOUR";
    const fitsOverall = routeFitType ? isFeasibleType : slot.fitsOverall !== false;
    const isBest = !options.matrixRequiresBuild && (bestSlotIndex != null
      ? (slot.slotIndex === bestSlotIndex || index === bestSlotIndex)
      : slot.isBest === true);

    return {
      ...slot,
      slot: `${fromName} → ${toName}`,
      fromName,
      toName,
      directKm,
      viaKm,
      distanceDelta,
      routeFitType,
      routeFitStatus,
      routeFitLabel,
      displayLabel: normalizedDisplayLabel,
      shortLabel: routeFitShortLabel,
      roadDetourKm,
      isZeroExtraDetour,
      distanceComparisonNote: slot.distanceComparisonNote ?? null,
      routeDecisionReason: slot.routeDecisionReason ?? null,
      timingDecisionReason: slot.timingDecisionReason ?? null,
      priorityDecisionReason: slot.priorityDecisionReason ?? null,
      finalDecisionReason: slot.finalDecisionReason ?? null,
      proposedTimeRange: slot.proposedTimeRange || null,
      operatingHours: slot.operatingHours || null,
      fitsTiming: slot.timingPossible === true,
      fitsOverall,
      isBest: options.matrixRequiresBuild ? false : (slot.selectedAsBest === true || isBest),
      routePossible: slot.routePossible !== false,
      timingPossible: slot.timingPossible === true,
      prioritySafe: slot.prioritySafe !== false,
      selectedAsBest: options.matrixRequiresBuild ? false : (slot.selectedAsBest === true || isBest),
      attempted: slot.attempted === true || true,
      timingReason: slot.timingDecisionReason || slot.timingReason || slot.reason || slot.routeDecisionReason || null,
      routeMetrics: {
        directKm: hasTrustedMetrics ? Number(directKmRaw ?? directKm) : null,
        viaKm: hasTrustedMetrics ? Number(viaKmRaw ?? viaKm) : null,
        extraKm: hasTrustedMetrics ? Number(extraKmRaw ?? distanceDelta) : null,
        source: metricsSource,
      },
    };
  });
}
