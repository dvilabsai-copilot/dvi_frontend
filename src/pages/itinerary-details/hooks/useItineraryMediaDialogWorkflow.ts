import type { useItineraryRouteState } from "./useItineraryRouteState";
import type { useMediaShareState } from "./useMediaShareState";
import type { useItineraryDeletionState } from "./useItineraryDeletionState";
import { useItineraryMediaDialogProps } from "./useItineraryMediaDialogProps";
import { formatActivityDuration, formatPreviewTime } from "../utils/activityFormatting.utils";

type RouteState = ReturnType<typeof useItineraryRouteState>;
type MediaState = ReturnType<typeof useMediaShareState>;
type DeletionState = ReturnType<typeof useItineraryDeletionState>;
type DialogOptions = Parameters<typeof useItineraryMediaDialogProps>[0];

/** Composes gallery, clipboard, source-preview, and all-hotspots dialog props. */
export function useItineraryMediaDialogWorkflow({
  mediaShareState,
  routeState,
  deletionState,
  itineraryPreference,
  paraRecommendations,
  selectedHotels,
  setSelectedHotels,
  handleCopyClipboard,
  quoteId,
}: {
  mediaShareState: MediaState;
  routeState: RouteState;
  deletionState: DeletionState;
  itineraryPreference: number;
  paraRecommendations: unknown[];
  selectedHotels: Record<string, boolean>;
  setSelectedHotels: DialogOptions["setSelectedHotels"];
  handleCopyClipboard: DialogOptions["handleCopyClipboard"];
  quoteId?: string;
}) {
  return useItineraryMediaDialogProps({
    mediaShareState,
    itineraryPreference,
    paraRecommendations,
    selectedHotels,
    setSelectedHotels,
    handleCopyClipboard,
    sourcePreviewOpen: routeState.sourcePreviewOpen,
    setSourcePreviewOpen: routeState.setSourcePreviewOpen,
    sourcePreviewHeading: routeState.sourcePreviewHeading,
    sourcePreviewLoading: routeState.sourcePreviewLoading,
    sourcePreviewError: routeState.sourcePreviewError,
    sourcePreviewMarkdown: routeState.sourcePreviewMarkdown,
    quoteId: String(quoteId || ""),
    allHotspotsPreviewModal: deletionState.allHotspotsPreviewModal,
    onOpenAllHotspotsPreview: (open) => deletionState.setAllHotspotsPreviewModal((previous) => ({ ...previous, open })),
    formatTime: formatPreviewTime,
    formatDuration: formatActivityDuration,
  });
}
