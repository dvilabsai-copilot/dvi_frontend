import type { ComponentProps } from "react";
import { GalleryDialog, VideoDialog } from "./MediaDialogs";
import { ShareEmailDialog, SourcePreviewDialog } from "./ShareAndSourceDialogs";
import { ClipboardDialog } from "./ClipboardDialog";
import { ClipboardLegSelectionDialog } from "./ClipboardLegSelectionDialog";
import { AllHotspotsPreviewDialog } from "./AllHotspotsPreviewDialog";

type ItineraryMediaDialogsProps = {
  gallery: ComponentProps<typeof GalleryDialog>;
  video: ComponentProps<typeof VideoDialog>;
  clipboard: ComponentProps<typeof ClipboardDialog>;
  clipboardLegSelection: ComponentProps<typeof ClipboardLegSelectionDialog>;
  source: ComponentProps<typeof SourcePreviewDialog>;
  shareEmail: ComponentProps<typeof ShareEmailDialog>;
  allHotspotsPreview: ComponentProps<typeof AllHotspotsPreviewDialog>;
};

/** Composes gallery, video, clipboard, source, sharing, and hotspot-preview dialogs. */
export function ItineraryMediaDialogs({
  gallery,
  video,
  clipboard,
  clipboardLegSelection,
  source,
  shareEmail,
  allHotspotsPreview,
}: ItineraryMediaDialogsProps) {
  return (
    <>
      <GalleryDialog {...gallery} />
      <VideoDialog {...video} />
      <ClipboardLegSelectionDialog {...clipboardLegSelection} />
      <ClipboardDialog {...clipboard} />
      <SourcePreviewDialog {...source} />
      <ShareEmailDialog {...shareEmail} />
      <AllHotspotsPreviewDialog {...allHotspotsPreview} />
    </>
  );
}

export default ItineraryMediaDialogs;