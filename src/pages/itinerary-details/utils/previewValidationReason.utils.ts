export function getPreviewValidationReasonText(options: {
  resolution: Record<string, unknown> | null | undefined;
  validation: Record<string, unknown> | null | undefined;
  normalizedDecision: Record<string, unknown> | null | undefined;
  manualPreviewState: unknown;
  groupPreviewResolution: unknown;
  matrixFit: Record<string, unknown> | null | undefined;
  destinationHotelDisplayName: string;
  isManualRelaxedRouteFitPolicy: (value: unknown) => boolean;
}): string {
  const previewCode = String(options.resolution?.code || "").toUpperCase();
  const resolution = options.resolution?.resolution as Record<string, unknown> | undefined;
  const unscheduled = (resolution?.unscheduledManualHotspots || options.resolution?.unscheduledManualHotspots) as Array<Record<string, unknown>> | undefined;
  const unscheduledReason = String(unscheduled?.[0]?.reason || "").trim();
  if (previewCode === "MANUAL_HOTSPOT_CANNOT_FIT" && unscheduledReason) return unscheduledReason;
  if (options.normalizedDecision?.primaryMessage) return String(options.normalizedDecision.primaryMessage);

  const reason = String(options.validation?.reason || "").toUpperCase();
  if (reason === "NO_FEASIBLE_ROUTE_SLOT") {
    const relaxed = options.isManualRelaxedRouteFitPolicy(options.manualPreviewState)
      || options.isManualRelaxedRouteFitPolicy(options.resolution)
      || options.isManualRelaxedRouteFitPolicy(options.groupPreviewResolution);
    return relaxed
      ? "This hotspot adds extra distance/off-route travel. Manual add allows this when the rebuilt day still finishes within the allowed timing window."
      : "Matrix data exists, but this hotspot is off-route or backtracking for all current route segments.";
  }
  if (reason === "MATRIX_DATA_MISSING") return "Route-fit matrix data is missing for the selected hotspot and current route.";
  if (reason === "OSRM_ROUTE_CHECK_FAILED") return "OSRM route validation failed while checking the source-city route anchor.";

  const baseReason = String(options.validation?.reason || "The rebuilt timeline still has timing, distance, or operating-window conflicts for this manual hotspot.");
  const matrixDestinationName = String(options.matrixFit?.destinationHotelName || "").trim();
  if (!options.destinationHotelDisplayName || !matrixDestinationName) return baseReason;
  const escaped = matrixDestinationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return baseReason.replace(new RegExp(escaped, "gi"), options.destinationHotelDisplayName);
}
