import React from "react";

type RouteLegSummary = {
  acDistanceKm?: number;
  acDurationMin?: number;
  cbDistanceKm?: number;
  cbDurationMin?: number;
  viaDistanceKm?: number;
  directDistanceKm?: number;
  extraDistanceKm?: number;
};

type HotspotPreviewRouteSummaryProps = {
  fromName: string;
  insertedName: string;
  destinationName: string;
  routeLegSummary?: RouteLegSummary | null;
  distanceComparisonNote?: string;
};

const formatDistance = (value?: number) => value == null ? "--" : `${Number(value).toFixed(1)} km`;
const formatDuration = (value?: number) => value == null ? "--" : `${Math.max(1, Math.round(Number(value)))} min`;

/** Renders the route-leg metrics for an inserted hotspot when matrix data is available. */
export const HotspotPreviewRouteSummary: React.FC<HotspotPreviewRouteSummaryProps> = ({
  fromName,
  insertedName,
  destinationName,
  routeLegSummary,
  distanceComparisonNote,
}) => {
  if (!routeLegSummary) return null;

  return (
    <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      <p className="font-semibold">Route summary:</p>
      <p>{fromName} → {insertedName}: {formatDistance(routeLegSummary.acDistanceKm)} / {formatDuration(routeLegSummary.acDurationMin)}</p>
      <p>{insertedName} → {destinationName}: {formatDistance(routeLegSummary.cbDistanceKm)} / {formatDuration(routeLegSummary.cbDurationMin)}</p>
      <p>Via total: {formatDistance(routeLegSummary.viaDistanceKm)}</p>
      <p>Direct: {formatDistance(routeLegSummary.directDistanceKm)}</p>
      <p>Extra: +{routeLegSummary.extraDistanceKm != null ? Number(Math.max(0, Number(routeLegSummary.extraDistanceKm))).toFixed(1) : "--"} km</p>
      {distanceComparisonNote && <p className="text-emerald-800">Note: {distanceComparisonNote}</p>}
    </div>
  );
};

export default HotspotPreviewRouteSummary;
