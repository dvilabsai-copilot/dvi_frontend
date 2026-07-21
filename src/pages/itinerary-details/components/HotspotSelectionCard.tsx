import React from "react";
import { Clock, Loader2, Ticket, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AvailableHotspot } from "../itinerary-details.types";

type ToastApi = { error: (message: string) => unknown; info: (message: string) => unknown };
type TimelineSegment = { isConflict?: boolean; locationId?: number };
type ManualHotspotMeta = { routeHotspotId?: number; isManual?: boolean };

type HotspotSelectionCardProps = {
  hotspot: AvailableHotspot;
  selected: boolean;
  excludedHotspotIds: readonly number[];
  currentRouteAttractionHotspotIds: ReadonlySet<number>;
  currentRouteManualHotspotIds: ReadonlySet<number>;
  addedInModalHotspotIds: ReadonlySet<number>;
  manualMetaById: ReadonlyMap<number, ManualHotspotMeta | unknown>;
  getPreviewTimeline: (hotspotId: number) => ReadonlyArray<TimelineSegment>;
  isFitHereSelectionMode: boolean;
  isPreviewingHotspotId: number | null;
  isBuildingMatrix: boolean;
  isApplyingPreviewHotspot: boolean;
  autoPreviewLoading: boolean;
  toImgSrc: (path: string | null | undefined) => string | undefined;
  openGalleryModal: (images: string[], title: string) => void;
  openVideoModal: (url: string, title: string) => void;
  onDeleteManual: (routeHotspotId: number, hotspotId: number, hotspotName: string) => void;
  onSelectFitHotspot: (hotspot: AvailableHotspot) => void;
  onPreviewHotspot: (hotspotId: number) => void;
  onAutoPreviewFitHere: (hotspot: AvailableHotspot) => void | Promise<void>;
  toast: ToastApi;
};

const asManualMeta = (value: unknown): ManualHotspotMeta => (
  value && typeof value === "object" ? value as ManualHotspotMeta : {}
);

/** Owns the repeated available-hotspot card and its action-state rules. */
export const HotspotSelectionCard: React.FC<HotspotSelectionCardProps> = ({
  hotspot,
  selected,
  excludedHotspotIds,
  currentRouteAttractionHotspotIds,
  currentRouteManualHotspotIds,
  addedInModalHotspotIds,
  manualMetaById,
  getPreviewTimeline,
  isFitHereSelectionMode,
  isPreviewingHotspotId,
  isBuildingMatrix,
  isApplyingPreviewHotspot,
  autoPreviewLoading,
  toImgSrc,
  openGalleryModal,
  openVideoModal,
  onDeleteManual,
  onSelectFitHotspot,
  onPreviewHotspot,
  onAutoPreviewFitHere,
  toast,
}) => {
  const hotspotId = Number(hotspot.id);
  const backendStatus = String(hotspot.availabilityStatus || "").trim().toUpperCase();
  const availabilityReason = String(hotspot.availabilityReason || "").trim().toLowerCase();
  const isDeletedFromTimeline = excludedHotspotIds.map(Number).includes(hotspotId)
    || backendStatus === "EXCLUDED_BY_ROUTE"
    || availabilityReason.includes("excluded for this route")
    || availabilityReason.includes("currently excluded");
  const isActuallyInCurrentTimeline = currentRouteAttractionHotspotIds.has(hotspotId) || addedInModalHotspotIds.has(hotspotId);
  const isAddedOnOtherRoute = hotspot.alreadyAddedOnOtherRoute === true || backendStatus === "ACTIVE_OTHER_ROUTE";
  const isAdded = isActuallyInCurrentTimeline || (!isDeletedFromTimeline && ((hotspot.alreadyAdded === true && !isAddedOnOtherRoute) || backendStatus === "ACTIVE_THIS_ROUTE"));
  const timingText = String(hotspot.timings || "").trim().toLowerCase();
  const isClosedOnRouteDate = hotspot.isClosedOnRouteDate === true
    || backendStatus === "CLOSED_ON_ROUTE_DATE"
    || timingText === "closed";
  const isClosedTiming = !isClosedOnRouteDate && (timingText.length === 0 || timingText === "no timings available");
  const closedLabel = hotspot.closedDaysLabel
    ? `Closed on ${hotspot.closedDaysLabel}`
    : hotspot.routeDayLabel
      ? `Closed on ${hotspot.routeDayLabel}`
      : "Closed on this route date";
  const isActionDisabled = isClosedOnRouteDate
    || isAdded
    || (hotspot.actionDisabled === true && !isAddedOnOtherRoute && !isDeletedFromTimeline);
  const hasConflict = getPreviewTimeline(hotspotId).some((segment) => segment.isConflict === true && Number(segment.locationId) === hotspotId);
  const isLoadingThis = isPreviewingHotspotId === hotspotId;
  const manualMeta = asManualMeta(manualMetaById.get(hotspotId));
  const resolvedRouteHotspotId = Number(hotspot.routeHotspotId || manualMeta.routeHotspotId || 0);
  const isManualAddedOnCurrentRoute = isAdded
    && (currentRouteManualHotspotIds.has(hotspotId) || addedInModalHotspotIds.has(hotspotId) || hotspot.isManual === true || hotspot.planOwnWay === true || manualMeta.isManual === true)
    && resolvedRouteHotspotId > 0;

  return (
    <div data-hotspot-id={hotspot.id} className={`overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md ${selected ? "ring-2 ring-[#d546ab]" : ""}`}>
      <div className="p-4">
        <div className="mb-3 flex gap-3">
          <div className="relative shrink-0">
            <img src={toImgSrc(hotspot.image || null) || "https://placehold.co/185x115/e9d5f7/4a4260?text=Spot"} alt={hotspot.name} className="h-[86px] w-[120px] rounded-lg object-cover shadow-sm sm:h-[102px] sm:w-[148px]" />
            <div className="absolute right-1 top-1 flex flex-col gap-1">
              <button type="button" title="Click to View the Images" className="rounded-full bg-white/90 p-1 shadow hover:bg-white" onClick={(event) => { event.stopPropagation(); openGalleryModal(Array.isArray(hotspot.galleryImages) && hotspot.galleryImages.length > 0 ? hotspot.galleryImages : hotspot.image ? [hotspot.image] : [], hotspot.name); }}>🖼️</button>
              {hotspot.videoUrl && <button type="button" title="Click to View the Video" className="rounded-full bg-white/90 p-1 shadow hover:bg-white" onClick={(event) => { event.stopPropagation(); openVideoModal(hotspot.videoUrl || "", hotspot.name); }}>▶️</button>}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="break-words text-base font-semibold text-[#4a4260]">{hotspot.name}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {hotspot.visitAgain && <span className="whitespace-nowrap rounded bg-blue-500 px-2 py-0.5 text-[9px] font-bold text-white">Visit Again</span>}
              {isDeletedFromTimeline && <span className="whitespace-nowrap rounded bg-orange-500 px-2 py-0.5 text-[9px] font-bold text-white">Deleted from timeline</span>}
              {selected && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${hasConflict ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{hasConflict ? "Conflict" : "Selected"}</span>}
              {isAdded && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">Added</span>}
              {isAddedOnOtherRoute && <span className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-800">Also used on another day</span>}
              {isClosedOnRouteDate && <span className="whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">{closedLabel}</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {isManualAddedOnCurrentRoute ? <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" className="border-emerald-300 bg-emerald-50 text-emerald-700" disabled>Added</Button><Button type="button" variant="outline" size="sm" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => { if (!(resolvedRouteHotspotId > 0)) { toast.error("Could not find the route hotspot row ID. Please refresh and try again."); return; } onDeleteManual(resolvedRouteHotspotId, hotspotId, hotspot.name); }}><Trash2 className="mr-1 h-4 w-4" />Delete</Button></div>
                : isAdded ? <Button type="button" variant="outline" size="sm" className="border-slate-200 bg-slate-100 text-slate-500" disabled>Added</Button>
                  : <div className="flex gap-2"><Button type="button" size="sm" disabled={isActionDisabled || isClosedTiming || isLoadingThis || isBuildingMatrix || isApplyingPreviewHotspot} onClick={() => { if (isFitHereSelectionMode) { onSelectFitHotspot(hotspot); toast.info("Now choose the exact Fit Here position from the timeline on the right."); return; } onPreviewHotspot(hotspotId); }} className="bg-[#d546ab] text-white hover:bg-[#c03d9f]">{isLoadingThis ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Previewing</> : isClosedOnRouteDate ? "Closed" : hotspot.buttonLabel || "Preview"}</Button>{isFitHereSelectionMode && <Button type="button" size="sm" variant="outline" disabled={isActionDisabled || isClosedTiming || isLoadingThis || isBuildingMatrix || isApplyingPreviewHotspot || autoPreviewLoading} onClick={() => { void onAutoPreviewFitHere(hotspot); }} className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">{isClosedOnRouteDate ? "Closed" : "Auto-Preview"}</Button>}</div>}
            </div>
            <p className="mb-3 mt-2 line-clamp-2 text-sm text-[#6c6c6c]">{hotspot.description ?? ""}</p>
            <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">{hotspot.amount > 0 && <span className="flex items-center"><Ticket className="mr-1 h-3 w-3" />₹ {hotspot.amount.toFixed(2)}</span>}{hotspot.timeSpend > 0 && <span className="flex items-center"><Clock className="mr-1 h-3 w-3" />{hotspot.timeSpend} hrs</span>}{hotspot.timings && !isClosedTiming && <span className="flex items-center"><Timer className="mr-1 h-3 w-3" />{hotspot.timings}</span>}{isClosedTiming && <span className="flex items-center text-[#a35c1a]"><Timer className="mr-1 h-3 w-3" />No timings available</span>}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotSelectionCard;
