import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type HotspotMatrixMissingNoticeProps = {
  visible: boolean;
  activePreviewHotspotId: number | null;
  isBuildingMatrix: boolean;
  isPreviewingHotspotId: number | null;
  isApplyingPreviewHotspot: boolean;
  onBuildAndPreview: () => void;
  command?: string;
};

/** Renders the matrix-missing guidance and retry action for a hotspot preview. */
export function HotspotMatrixMissingNotice({ visible, activePreviewHotspotId, isBuildingMatrix, isPreviewingHotspotId, isApplyingPreviewHotspot, onBuildAndPreview, command }: HotspotMatrixMissingNoticeProps) {
  if (!visible) return null;
  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-xs font-semibold leading-4 text-red-800">Route-fit matrix data is missing for the selected hotspot and current route.</p>
      <p className="mt-1 text-xs leading-4 text-red-700">Build the route-fit matrix first, then preview this hotspot again.</p>
      {activePreviewHotspotId ? <Button type="button" size="sm" className="mt-3 bg-[#d546ab] text-white hover:bg-[#b93a8f]" disabled={isBuildingMatrix || isPreviewingHotspotId === activePreviewHotspotId || isApplyingPreviewHotspot} onClick={onBuildAndPreview}>{isBuildingMatrix ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Building matrix...</> : "Build Matrix & Preview Again"}</Button> : null}
      {String(command || "").trim().length > 0 && <p className="mt-2 break-all font-mono text-[11px] text-red-800">{command}</p>}
    </div>
  );
}

export default HotspotMatrixMissingNotice;
