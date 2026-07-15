import React from "react";
import { HotspotApplyButton } from "./HotspotApplyButton";
import { HotspotSelectionNotice } from "./HotspotSelectionNotice";

type HotspotPreviewApplyActionProps = {
  isFitHereSelectionMode: boolean;
  forceConflict: boolean;
  loading: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
};

/** Keeps the final apply/selection action pinned below the preview timeline. */
export const HotspotPreviewApplyAction: React.FC<HotspotPreviewApplyActionProps> = ({
  isFitHereSelectionMode,
  forceConflict,
  loading,
  disabled,
  label,
  onClick,
}) => (
  <div className="sticky bottom-0 bg-white pt-4">
    {isFitHereSelectionMode ? (
      <HotspotSelectionNotice />
    ) : (
      <HotspotApplyButton forceConflict={forceConflict} loading={loading} disabled={disabled} onClick={onClick} label={label} />
    )}
  </div>
);

export default HotspotPreviewApplyAction;
