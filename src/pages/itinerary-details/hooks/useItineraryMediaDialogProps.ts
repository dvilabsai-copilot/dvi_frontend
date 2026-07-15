import type { ComponentProps } from "react";
import { ItineraryMediaDialogs } from "../components/ItineraryMediaDialogs";
import type { useMediaShareState } from "./useMediaShareState";

type MediaProps = ComponentProps<typeof ItineraryMediaDialogs>;

type MediaDialogOptions = {
  mediaShareState: ReturnType<typeof useMediaShareState>;
  itineraryPreference: MediaProps["clipboard"]["preference"];
  paraRecommendations: MediaProps["clipboard"]["recommendations"];
  selectedHotels: MediaProps["clipboard"]["selectedHotels"];
  setSelectedHotels: MediaProps["clipboard"]["onSelectionChange"];
  handleCopyClipboard: MediaProps["clipboard"]["onCopy"];
  sourcePreviewOpen: MediaProps["source"]["open"];
  setSourcePreviewOpen: MediaProps["source"]["setOpen"];
  sourcePreviewHeading: MediaProps["source"]["heading"];
  sourcePreviewLoading: MediaProps["source"]["loading"];
  sourcePreviewError: MediaProps["source"]["error"];
  sourcePreviewMarkdown: MediaProps["source"]["markdown"];
  quoteId: string;
  allHotspotsPreviewModal: Omit<MediaProps["allHotspotsPreview"], "onOpenChange" | "formatTime" | "formatDuration">;
  onOpenAllHotspotsPreview: MediaProps["allHotspotsPreview"]["onOpenChange"];
  formatTime: MediaProps["allHotspotsPreview"]["formatTime"];
  formatDuration: MediaProps["allHotspotsPreview"]["formatDuration"];
};

export function useItineraryMediaDialogProps(options: MediaDialogOptions): MediaProps {
  const {
    mediaShareState, itineraryPreference, paraRecommendations, selectedHotels, setSelectedHotels, handleCopyClipboard, sourcePreviewOpen,
    setSourcePreviewOpen,
    sourcePreviewHeading, sourcePreviewLoading, sourcePreviewError, sourcePreviewMarkdown,
    quoteId, allHotspotsPreviewModal, onOpenAllHotspotsPreview, formatTime, formatDuration,
  } = options;
  const {
    galleryModal, setGalleryModal, galleryActiveIdx, setGalleryActiveIdx, videoModal, setVideoModal,
    clipboardModal, clipboardType, setClipboardModal, shareModal, setShareModal,
  } = mediaShareState;

  return {
    gallery: { state: galleryModal, setState: setGalleryModal, activeIndex: galleryActiveIdx, setActiveIndex: setGalleryActiveIdx },
    video: { state: videoModal, setState: setVideoModal },
    clipboard: { open: clipboardModal, preference: itineraryPreference, clipboardType, recommendations: paraRecommendations, selectedHotels, onOpenChange: setClipboardModal, onSelectionChange: setSelectedHotels, onCopy: handleCopyClipboard },
    source: { open: sourcePreviewOpen, setOpen: setSourcePreviewOpen, heading: sourcePreviewHeading, loading: sourcePreviewLoading, error: sourcePreviewError, markdown: sourcePreviewMarkdown },
    shareEmail: { open: shareModal, setOpen: setShareModal, quoteId },
    allHotspotsPreview: { ...allHotspotsPreviewModal, onOpenChange: onOpenAllHotspotsPreview, formatTime, formatDuration },
  };
}
