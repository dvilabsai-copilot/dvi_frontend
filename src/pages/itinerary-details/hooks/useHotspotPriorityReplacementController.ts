import { useCallback, type Dispatch, type SetStateAction } from "react";

interface PreviewResolution {
  removedTopPriorityHotspots?: unknown[];
  topPriorityAffected?: unknown[];
  p3HotspotsToRemove?: unknown[];
  requiresP3RemovalConfirmation?: boolean;
}

interface HotspotPriorityReplacementOptions {
  groupPreviewResolution: PreviewResolution | null;
  pendingPriorityReplacementHotspotId: number | null;
  selectedHotspotId: number | null;
  selectedHotspotIds: number[];
  handlePreviewHotspot: (hotspotId: number, options?: { allowTopPriorityRemoval?: boolean; selectedHotspotIds?: number[] }) => Promise<void>;
  handleRemovePreviewHotspot: (hotspotId: number) => Promise<void>;
  setForceReplacementApprovedByHotspot: Dispatch<SetStateAction<Record<number, boolean>>>;
  setTopPriorityReplacementApproved: Dispatch<SetStateAction<boolean>>;
}

/** Owns the approval/cancel actions for protected hotspot replacement previews. */
export const useHotspotPriorityReplacementController = ({
  groupPreviewResolution,
  pendingPriorityReplacementHotspotId,
  selectedHotspotId,
  selectedHotspotIds,
  handlePreviewHotspot,
  handleRemovePreviewHotspot,
  setForceReplacementApprovedByHotspot,
  setTopPriorityReplacementApproved,
}: HotspotPriorityReplacementOptions) => {
  const handleConfirmPriorityReplacement = useCallback(async () => {
    const targetHotspotId = pendingPriorityReplacementHotspotId || selectedHotspotId;
    if (!targetHotspotId) return;

    const needsReplacementApproval = Boolean(
      (Array.isArray(groupPreviewResolution?.removedTopPriorityHotspots) && groupPreviewResolution.removedTopPriorityHotspots.length > 0)
      || (Array.isArray(groupPreviewResolution?.topPriorityAffected) && groupPreviewResolution.topPriorityAffected.length > 0)
      || (Array.isArray(groupPreviewResolution?.p3HotspotsToRemove) && groupPreviewResolution.p3HotspotsToRemove.length > 0)
      || groupPreviewResolution?.requiresP3RemovalConfirmation === true,
    );

    if (needsReplacementApproval) {
      await handlePreviewHotspot(targetHotspotId, { allowTopPriorityRemoval: true, selectedHotspotIds });
    }

    setForceReplacementApprovedByHotspot((previous) => ({ ...previous, [targetHotspotId]: true }));
    setTopPriorityReplacementApproved(true);
  }, [groupPreviewResolution, handlePreviewHotspot, pendingPriorityReplacementHotspotId, selectedHotspotId, selectedHotspotIds, setForceReplacementApprovedByHotspot, setTopPriorityReplacementApproved]);

  const handleCancelPriorityReplacement = useCallback(async () => {
    const targetHotspotId = pendingPriorityReplacementHotspotId || selectedHotspotId;
    if (!targetHotspotId) return;
    await handleRemovePreviewHotspot(targetHotspotId);
  }, [handleRemovePreviewHotspot, pendingPriorityReplacementHotspotId, selectedHotspotId]);

  return { handleConfirmPriorityReplacement, handleCancelPriorityReplacement };
};
