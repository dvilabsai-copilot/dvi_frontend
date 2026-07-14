import React from "react";
import type { AvailableHotspot } from "../itinerary-details.types";

export interface HotspotFitHereSelectionHeaderProps {
  selectedFitHotspot: AvailableHotspot;
}

export function HotspotFitHereSelectionHeader({ selectedFitHotspot }: HotspotFitHereSelectionHeaderProps) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Selected for Fit Here</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{selectedFitHotspot.name}</p>
    </>
  );
}

export default HotspotFitHereSelectionHeader;
