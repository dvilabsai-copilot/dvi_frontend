import type { ComponentProps } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HotspotDialogHeader } from "./HotspotDialogHeader";
import { HotspotDialogListColumn } from "./HotspotDialogListColumn";
import { HotspotPreviewPane } from "./HotspotPreviewPane";
import { HotspotDialogFooter } from "./HotspotDialogFooter";

type ItineraryAddHotspotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: ComponentProps<typeof HotspotDialogHeader>;
  list: ComponentProps<typeof HotspotDialogListColumn>;
  preview: ComponentProps<typeof HotspotPreviewPane>;
  footer: ComponentProps<typeof HotspotDialogFooter>;
};

/** Owns only the Add Hotspot dialog layout; search, preview, and mutation state stay external. */
export function ItineraryAddHotspotDialog({ open, onOpenChange, header, list, preview, footer }: ItineraryAddHotspotDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[90vh] flex flex-col">
        <HotspotDialogHeader {...header} />
        <div className="py-4 flex-1 overflow-hidden flex min-h-0">
          <div className="flex flex-col lg:flex-row gap-4 w-full min-h-0">
            <HotspotDialogListColumn {...list} />
            <HotspotPreviewPane {...preview} />
          </div>
        </div>
        <HotspotDialogFooter {...footer} />
      </DialogContent>
    </Dialog>
  );
}

export default ItineraryAddHotspotDialog;
