import type { Dispatch, RefObject, SetStateAction } from "react";
import { HotspotCityTabs } from "./HotspotCityTabs";
import { HotspotListState } from "./HotspotListState";
import { HotspotSelectionCard } from "./HotspotSelectionCard";
import type { AvailableHotspot } from "../itinerary-details.types";

type CityTab = { key: string; label: string; count: number };
type ToastApi = { error: (message: string) => unknown; info: (message: string) => unknown };
type HotspotDialogListColumnProps = {
  hotspotListRef: RefObject<HTMLDivElement | null>; routeIsDifferentCity: boolean; hotspotCityTabs: readonly CityTab[];
  activeHotspotCityTab: string; setActiveHotspotCityTab: Dispatch<SetStateAction<string>>; loadingHotspots: boolean; hotspotSearchQuery: string;
  visibleHotspotsForActiveTab: readonly AvailableHotspot[]; selectedFitHotspot?: AvailableHotspot | null; excludedHotspotIds: readonly number[];
  currentRouteAttractionHotspotIds: ReadonlySet<number>; currentRouteManualHotspotIds: ReadonlySet<number>; addedInModalHotspotIds: ReadonlySet<number>;
  currentRouteManualHotspotMetaById: ReadonlyMap<number, unknown>; previewTimelinesByHotspot: Record<number, readonly unknown[]>;
  isFitHereSelectionMode: boolean; isPreviewingHotspotId: number | null; isBuildingMatrix: boolean; isApplyingPreviewHotspot: boolean;
  autoPreviewLoading: boolean; toImgSrc: (path: string | null | undefined) => string | undefined; openGalleryModal: (images: string[], title: string) => void;
  openVideoModal: (url: string, title: string) => void; onDeleteManual: (routeHotspotId: number, hotspotId: number, hotspotName: string) => void;
  onSelectFitHotspot: (hotspot: AvailableHotspot) => void; onPreviewHotspot: (hotspotId: number) => void;
  onAutoPreviewFitHere: (hotspot: AvailableHotspot) => void | Promise<void>; toast: ToastApi;
};

/** Owns the left-side city filter, loading state, and available-hotspot cards in the add-hotspot dialog. */
export function HotspotDialogListColumn({
  hotspotListRef, routeIsDifferentCity, hotspotCityTabs, activeHotspotCityTab, setActiveHotspotCityTab, loadingHotspots,
  hotspotSearchQuery, visibleHotspotsForActiveTab, selectedFitHotspot, excludedHotspotIds, currentRouteAttractionHotspotIds,
  currentRouteManualHotspotIds, addedInModalHotspotIds, currentRouteManualHotspotMetaById, previewTimelinesByHotspot,
  isFitHereSelectionMode, isPreviewingHotspotId, isBuildingMatrix, isApplyingPreviewHotspot, autoPreviewLoading, toImgSrc,
  openGalleryModal, openVideoModal, onDeleteManual, onSelectFitHotspot, onPreviewHotspot, onAutoPreviewFitHere, toast,
}: HotspotDialogListColumnProps) {
  return (
    <div ref={hotspotListRef} className="w-full min-h-0 overflow-y-auto lg:w-1/2">
      <HotspotCityTabs visible={routeIsDifferentCity} tabs={hotspotCityTabs} activeTab={activeHotspotCityTab} setActiveTab={setActiveHotspotCityTab} />
      <HotspotListState loading={loadingHotspots} searchQuery={hotspotSearchQuery} hasVisibleHotspots={visibleHotspotsForActiveTab.length > 0} />
      {!loadingHotspots && visibleHotspotsForActiveTab.length > 0 && <div className="grid grid-cols-1 gap-4">{visibleHotspotsForActiveTab.map((hotspot) => <HotspotSelectionCard key={hotspot.id} hotspot={hotspot} selected={Number(selectedFitHotspot?.id || 0) === Number(hotspot.id)} excludedHotspotIds={excludedHotspotIds} currentRouteAttractionHotspotIds={currentRouteAttractionHotspotIds} currentRouteManualHotspotIds={currentRouteManualHotspotIds} addedInModalHotspotIds={addedInModalHotspotIds} manualMetaById={currentRouteManualHotspotMetaById} getPreviewTimeline={(hotspotId) => previewTimelinesByHotspot[hotspotId] || []} isFitHereSelectionMode={isFitHereSelectionMode} isPreviewingHotspotId={isPreviewingHotspotId} isBuildingMatrix={isBuildingMatrix} isApplyingPreviewHotspot={isApplyingPreviewHotspot} autoPreviewLoading={autoPreviewLoading} toImgSrc={toImgSrc} openGalleryModal={openGalleryModal} openVideoModal={openVideoModal} onDeleteManual={onDeleteManual} onSelectFitHotspot={onSelectFitHotspot} onPreviewHotspot={onPreviewHotspot} onAutoPreviewFitHere={onAutoPreviewFitHere} toast={toast} />)}</div>}
    </div>
  );
}

export default HotspotDialogListColumn;
