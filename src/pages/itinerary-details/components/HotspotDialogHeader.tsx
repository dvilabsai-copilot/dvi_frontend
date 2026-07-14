import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Dispatch, SetStateAction } from "react";

type HotspotDialogHeaderProps = {
  selectedPreviewCityContext: string;
  destinationCityLabel: string;
  hotspotSearchQuery: string;
  setHotspotSearchQuery: Dispatch<SetStateAction<string>>;
};

export function HotspotDialogHeader({
  selectedPreviewCityContext,
  destinationCityLabel,
  hotspotSearchQuery,
  setHotspotSearchQuery,
}: HotspotDialogHeaderProps) {
  return (
    <DialogHeader>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <DialogTitle>Fit Here Hotspot List</DialogTitle>
          <DialogDescription>
            {selectedPreviewCityContext === "DESTINATION_CITY"
              ? `Destination-side hotspots after reaching ${destinationCityLabel}. Preview checks one exact Fit Here position; Auto-Preview checks all valid positions.`
              : "Select a hotspot, then use Preview for one exact Fit Here position or Auto-Preview for all valid positions."}
          </DialogDescription>
        </div>
        <input
          type="text"
          placeholder="Search Hotspot..."
          className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-64"
          value={hotspotSearchQuery}
          onChange={(event) => setHotspotSearchQuery(event.target.value)}
        />
      </div>
    </DialogHeader>
  );
}

