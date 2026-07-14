import React from "react";

export interface HotspotPreviewLoadingStateProps {
  visible: boolean;
}

export function HotspotPreviewLoadingState({ visible }: HotspotPreviewLoadingStateProps) {
  if (!visible) return null;

  return (
    <div className="flex flex-col items-center justify-center h-24 text-[#6c6c6c]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d546ab] mb-2" />
      <p className="text-sm">Calculating selected slot...</p>
    </div>
  );
}

export default HotspotPreviewLoadingState;
