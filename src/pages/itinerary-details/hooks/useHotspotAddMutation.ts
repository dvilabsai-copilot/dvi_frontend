import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import { toast } from "sonner";
import type { AvailableHotspot, HotspotAnchor, ItineraryDetailsResponse, ItineraryHotelDetailsResponse, ItinerarySegment } from "../itinerary-details.types";

interface AddHotspotModalState { planId: number | null; routeId: number | null; }
type PreviewRecord = Record<string, unknown>;

interface HotspotAddMutationOptions {
  readOnly: boolean;
  addHotspotModal: AddHotspotModalState;
  selectedHotspotAnchor: HotspotAnchor | null;
  activePreviewResolution: PreviewRecord | null;
  manualPreviewState: PreviewRecord | null;
  activePreviewHotspotId: number | null;
  groupPreviewResolution: PreviewRecord | null;
  topPriorityReplacementApproved: boolean;
  selectedPreviewSegments: Array<Record<string, unknown>>;
  currentRouteAttractionHotspotIds: Set<number>;
  addedInModalHotspotIds: Set<number>;
  selectedHotspotIds: number[];
  itinerary: ItineraryDetailsResponse | null;
  quoteId: string | null;
  shouldShowHotels: boolean;
  normalizeAvailableHotspots: (rows: AvailableHotspot[]) => AvailableHotspot[];
  getManualTimingPolicyFromPreview: (value: unknown) => unknown;
  filterAvailableHotspotsForAnchor: (rows: AvailableHotspot[], source: string, destination: string, anchorFrom: string, anchorTo: string) => AvailableHotspot[];
  resetManualHotspotPreviewState: () => void;
  setIsAddingHotspot: Dispatch<SetStateAction<boolean>>;
  setIsApplyingPreviewHotspot: Dispatch<SetStateAction<boolean>>;
  setAddedInModalHotspotIds: Dispatch<SetStateAction<Set<number>>>;
  setAvailableHotspots: Dispatch<SetStateAction<AvailableHotspot[]>>;
  setRouteNeedsRebuild: Dispatch<SetStateAction<number | null>>;
  setActivePreviewHotspotId: Dispatch<SetStateAction<number | null>>;
  setItinerary: Dispatch<SetStateAction<ItineraryDetailsResponse | null>>;
  setHotelDetails: Dispatch<SetStateAction<ItineraryHotelDetailsResponse | null>>;
  setHotspotFilterMeta: Dispatch<SetStateAction<unknown>>;
}

const getRecord = (value: unknown): PreviewRecord => (typeof value === "object" && value !== null ? value as PreviewRecord : {});
const errorMessage = (error: unknown): string => (typeof error === "object" && error !== null && (error as { message?: unknown }).message ? String((error as { message: unknown }).message) : "");

/** Owns manual hotspot application, optimistic availability updates, and modal refresh. */
export const useHotspotAddMutation = ({
  readOnly, addHotspotModal, selectedHotspotAnchor, activePreviewResolution, manualPreviewState, activePreviewHotspotId,
  groupPreviewResolution, topPriorityReplacementApproved, selectedPreviewSegments, currentRouteAttractionHotspotIds,
  addedInModalHotspotIds, selectedHotspotIds, itinerary, quoteId, shouldShowHotels, normalizeAvailableHotspots,
  getManualTimingPolicyFromPreview, filterAvailableHotspotsForAnchor, resetManualHotspotPreviewState, setIsAddingHotspot,
  setIsApplyingPreviewHotspot, setAddedInModalHotspotIds, setAvailableHotspots, setRouteNeedsRebuild, setActivePreviewHotspotId,
  setItinerary, setHotelDetails, setHotspotFilterMeta,
}: HotspotAddMutationOptions) => useCallback(async () => {
  if (readOnly || !addHotspotModal.planId || !addHotspotModal.routeId) return;
  if (selectedHotspotAnchor) {
    toast.error("Please use the Fit Here button on the timeline to add this hotspot at an exact position.");
    return;
  }
  const fit = getRecord(activePreviewResolution?.manualInsertionFit || manualPreviewState?.manualInsertionFit || getRecord(activePreviewResolution?.resolution).manualInsertionFit);
  const candidateId = Number(fit.selectedHotspotId || fit.hotspotId || activePreviewHotspotId || 0);
  if (!candidateId) { toast.error("Please preview one hotspot first."); return; }

  const resolution = groupPreviewResolution || activePreviewResolution || {};
  const p3Count = Array.isArray(resolution.p3HotspotsToRemove) ? resolution.p3HotspotsToRemove.length : 0;
  const needsReplacementApproval = (Array.isArray(resolution.removedTopPriorityHotspots) && resolution.removedTopPriorityHotspots.length > 0)
    || (Array.isArray(resolution.topPriorityAffected) && resolution.topPriorityAffected.length > 0)
    || p3Count > 0 || resolution.requiresP3RemovalConfirmation === true;
  if (needsReplacementApproval && topPriorityReplacementApproved !== true) {
    toast.error("Confirm the priority replacement in the temp timeline before adding this hotspot.");
    return;
  }
  const previewSource = groupPreviewResolution || activePreviewResolution || manualPreviewState || {};
  const validation = getRecord(previewSource.validation);
  const manualTimingPolicy = getManualTimingPolicyFromPreview(previewSource);
  const forceConflictInsertion = validation.readyToApply === false && validation.requiresPriorityConfirmation !== true;
  if (!forceConflictInsertion && selectedPreviewSegments.some((segment) => segment.isConflict === true)) {
    toast.error("Selected hotspot still has timing conflicts in the proposed timeline.");
    return;
  }
  if (new Set([...currentRouteAttractionHotspotIds, ...addedInModalHotspotIds]).has(candidateId)) {
    toast.info("This hotspot is already added.");
    return;
  }

  setIsAddingHotspot(true);
  setIsApplyingPreviewHotspot(true);
  try {
    const matrixFit = getRecord(activePreviewResolution?.manualInsertionFit || groupPreviewResolution?.manualInsertionFit || getRecord(activePreviewResolution?.resolution).manualInsertionFit || getRecord(groupPreviewResolution?.resolution).manualInsertionFit);
    const bestSlot = getRecord(matrixFit.bestSlot);
    const fitType = String(bestSlot.routeFitType || "").toUpperCase();
    const normal = fitType === "ON_ROUTE" || fitType === "MINOR_DETOUR";
    const single = fitType === "SINGLE_HOTSPOT_BEFORE" || fitType === "SINGLE_HOTSPOT_AFTER";
    const destination = fitType === "DESTINATION_SIDE_INSERTION";
    const shouldSendPreferredSlot = Boolean(bestSlot && ((matrixFit.chosenSlotSource === "BEST_FIT" && normal && Number(bestSlot.fromHotspotId || 0) > 0 && Number(bestSlot.toHotspotId || 0) > 0) || (single && (Number(bestSlot.fromHotspotId || 0) > 0 || Number(bestSlot.toHotspotId || 0) > 0)) || (destination && Number(bestSlot.fromHotspotId || 0) > 0)));
    const matrixPreferredSlot = shouldSendPreferredSlot ? { fromHotspotId: Number(bestSlot.fromHotspotId || 0), toHotspotId: Number(bestSlot.toHotspotId || 0), slotIndex: Number.isFinite(Number(bestSlot.slotIndex)) ? Number(bestSlot.slotIndex) : 0, source: "BEST_FIT" as const } : undefined;
    const addResult = await ItineraryService.applyManualHotspots(addHotspotModal.planId, addHotspotModal.routeId, [candidateId], undefined, { allowTopPriorityRemoval: topPriorityReplacementApproved === true, forceConflictInsertion, matrixPreferredSlot, manualTimingPolicy }) as PreviewRecord;
    if (addResult.code === "MANUAL_HOTSPOT_ALREADY_EXISTS_IN_ROUTE" || addResult.alreadyExists === true) {
      toast.info("This hotspot is already added.");
      setAddedInModalHotspotIds((previous) => new Set(previous).add(candidateId));
      setAvailableHotspots((previous) => previous.map((row) => Number(row.id || 0) === candidateId ? { ...row, alreadyAdded: true, availabilityStatus: "ACTIVE_THIS_ROUTE", actionDisabled: true, buttonLabel: "Added" } : row));
      resetManualHotspotPreviewState();
      setActivePreviewHotspotId(null);
      return;
    }
    if (addResult.success === false || addResult.inserted === false) { toast.error(String(addResult.message || addResult.reason || "Failed to add selected hotspots at this position")); return; }
    toast.success(addResult.code === "MANUAL_HOTSPOT_INSERTED_WITH_LOW_PRIORITY_REMOVAL" ? "Added hotspot by removing lower-priority stops on this route" : addResult.code === "MANUAL_HOTSPOT_INSERTED_WITH_MATRIX_SLOT" ? "Added hotspot using best route-fit slot" : "Hotspot added successfully.");
    setAddedInModalHotspotIds((previous) => new Set(previous).add(candidateId));
    setAvailableHotspots((previous) => previous.map((row) => Number(row.id || 0) === candidateId ? { ...row, alreadyAdded: true, availabilityStatus: "ACTIVE_THIS_ROUTE", actionDisabled: true, buttonLabel: "Added" } : row));
    if (addHotspotModal.routeId) setRouteNeedsRebuild(addHotspotModal.routeId);
    resetManualHotspotPreviewState();
    setActivePreviewHotspotId(null);
    if (quoteId) {
      const [detailsRes, hotelRes] = await Promise.all([ItineraryService.getDetails(quoteId), shouldShowHotels ? ItineraryService.getHotelDetails(quoteId) : Promise.resolve(null)]);
      setItinerary(detailsRes as ItineraryDetailsResponse);
      setHotelDetails(hotelRes as ItineraryHotelDetailsResponse);
    }
    if (addHotspotModal.routeId) {
      const route = itinerary?.days?.find((day) => Number(day.id) === Number(addHotspotModal.routeId));
      const rows = await ItineraryService.getAvailableHotspots(addHotspotModal.routeId);
      const availableRows = Array.isArray(rows) ? rows : (Array.isArray((rows as { hotspots?: unknown[] })?.hotspots) ? (rows as { hotspots: AvailableHotspot[] }).hotspots : []);
      setHotspotFilterMeta(Array.isArray(rows) ? null : (rows as { hotspotFilterMeta?: unknown })?.hotspotFilterMeta || null);
      const filtered = filterAvailableHotspotsForAnchor(availableRows, String(route?.departure || "").trim(), String(route?.arrival || "").trim(), "", "");
      setAvailableHotspots(normalizeAvailableHotspots(filtered));
    }
  } catch (error) {
    console.error("Failed to add hotspot", error);
    toast.error(errorMessage(error) || "Failed to add hotspot");
  } finally {
    setIsAddingHotspot(false);
    setIsApplyingPreviewHotspot(false);
  }
}, [activePreviewHotspotId, activePreviewResolution, addHotspotModal.planId, addHotspotModal.routeId, addedInModalHotspotIds, currentRouteAttractionHotspotIds, filterAvailableHotspotsForAnchor, getManualTimingPolicyFromPreview, groupPreviewResolution, itinerary?.days, manualPreviewState, normalizeAvailableHotspots, quoteId, readOnly, resetManualHotspotPreviewState, selectedHotspotAnchor, selectedPreviewSegments, setActivePreviewHotspotId, setAddedInModalHotspotIds, setAvailableHotspots, setHotelDetails, setHotspotFilterMeta, setIsAddingHotspot, setIsApplyingPreviewHotspot, setItinerary, setRouteNeedsRebuild, shouldShowHotels, topPriorityReplacementApproved]);
