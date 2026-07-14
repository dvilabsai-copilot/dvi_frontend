import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { AvailableHotspot } from "../itinerary-details.types";
import type { HotspotCityContext } from "../utils/hotspotCityContext.utils";

export type HotspotCityTabKey = "ALL" | "SOURCE_CITY" | "DESTINATION_CITY" | "UNKNOWN";
export type HotspotCityTab = { key: HotspotCityTabKey; label: string; count: number };
export type HotspotListRow =
  | { kind: "header"; label: string }
  | { kind: "hotspot"; hotspot: AvailableHotspot };

type HotspotCityPresentationOptions = {
  filteredHotspots: AvailableHotspot[];
  routeIsDifferentCity: boolean;
  sourceCityLabel: string;
  destinationCityLabel: string;
  sourceCityKey?: string | null;
  activeHotspotCityTab: HotspotCityTabKey;
  selectedPreviewCityContext?: HotspotCityContext | null;
  setActiveHotspotCityTab: Dispatch<SetStateAction<HotspotCityTabKey>>;
  deriveHotspotCityContext: (hotspot: AvailableHotspot) => HotspotCityContext;
};

/** Owns city buckets, tabs, grouped rows, and active-tab selection for the hotspot modal. */
export const useHotspotCityPresentation = ({
  filteredHotspots,
  routeIsDifferentCity,
  sourceCityLabel,
  destinationCityLabel,
  sourceCityKey,
  activeHotspotCityTab,
  selectedPreviewCityContext,
  setActiveHotspotCityTab,
  deriveHotspotCityContext,
}: HotspotCityPresentationOptions) => {
  const hotspotCityBuckets = useMemo(() => {
    const source: AvailableHotspot[] = [];
    const destination: AvailableHotspot[] = [];
    const other: AvailableHotspot[] = [];
    for (const hotspot of filteredHotspots) {
      const context = deriveHotspotCityContext(hotspot);
      if (context === "SOURCE_CITY") source.push(hotspot);
      else if (context === "DESTINATION_CITY") destination.push(hotspot);
      else other.push(hotspot);
    }
    return { source, destination, other };
  }, [deriveHotspotCityContext, filteredHotspots]);

  const hotspotListRows = useMemo<HotspotListRow[]>(() => {
    if (!routeIsDifferentCity) {
      return filteredHotspots.map((hotspot) => ({ kind: "hotspot", hotspot }));
    }

    const rows: HotspotListRow[] = [];
    const sourceLabel = `${String(sourceCityKey || "Source").replace(/^./, (character) => character.toUpperCase())} Hotspots`;
    const sections: Array<[string, AvailableHotspot[]]> = [
      [sourceLabel, hotspotCityBuckets.source],
      [`${destinationCityLabel} Hotspots`, hotspotCityBuckets.destination],
      ["Other Hotspots", hotspotCityBuckets.other],
    ];
    for (const [label, hotspots] of sections) {
      if (hotspots.length === 0) continue;
      rows.push({ kind: "header", label });
      rows.push(...hotspots.map((hotspot) => ({ kind: "hotspot" as const, hotspot })));
    }
    return rows;
  }, [destinationCityLabel, filteredHotspots, hotspotCityBuckets, routeIsDifferentCity, sourceCityKey]);

  const hotspotCityTabs = useMemo<HotspotCityTab[]>(() => {
    if (!routeIsDifferentCity) {
      return [{ key: "ALL", label: "All Hotspots", count: filteredHotspots.length }];
    }
    const formatCityLabel = (value: string, fallback: string) => {
      const raw = String(value || "").trim();
      return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : fallback;
    };
    const tabs: HotspotCityTab[] = [
      { key: "SOURCE_CITY", label: `${formatCityLabel(sourceCityLabel, "Source")} Hotspots`, count: hotspotCityBuckets.source.length },
      { key: "DESTINATION_CITY", label: `${formatCityLabel(destinationCityLabel, "Destination")} Hotspots`, count: hotspotCityBuckets.destination.length },
    ];
    if (hotspotCityBuckets.other.length > 0) {
      tabs.push({ key: "UNKNOWN", label: "Other Hotspots", count: hotspotCityBuckets.other.length });
    }
    return tabs;
  }, [destinationCityLabel, filteredHotspots.length, hotspotCityBuckets, routeIsDifferentCity, sourceCityLabel]);

  const visibleHotspotsForActiveTab = useMemo(() => {
    if (!routeIsDifferentCity || activeHotspotCityTab === "ALL") return filteredHotspots;
    if (activeHotspotCityTab === "SOURCE_CITY") return hotspotCityBuckets.source;
    if (activeHotspotCityTab === "DESTINATION_CITY") return hotspotCityBuckets.destination;
    return hotspotCityBuckets.other;
  }, [activeHotspotCityTab, filteredHotspots, hotspotCityBuckets, routeIsDifferentCity]);

  useEffect(() => {
    if (!routeIsDifferentCity) {
      if (activeHotspotCityTab !== "ALL") setActiveHotspotCityTab("ALL");
      return;
    }
    const validKeys = new Set(hotspotCityTabs.map((tab) => tab.key));
    if (selectedPreviewCityContext === "DESTINATION_CITY" && validKeys.has("DESTINATION_CITY") && activeHotspotCityTab !== "DESTINATION_CITY") {
      setActiveHotspotCityTab("DESTINATION_CITY");
      return;
    }
    if (!validKeys.has(activeHotspotCityTab)) {
      const firstTab = hotspotCityTabs[0];
      if (firstTab) setActiveHotspotCityTab(firstTab.key);
    }
  }, [activeHotspotCityTab, routeIsDifferentCity, selectedPreviewCityContext, setActiveHotspotCityTab, hotspotCityTabs]);

  return { hotspotListRows, hotspotCityBuckets, hotspotCityTabs, visibleHotspotsForActiveTab };
};
