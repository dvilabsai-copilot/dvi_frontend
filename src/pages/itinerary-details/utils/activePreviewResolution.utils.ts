export function resolveActivePreviewResolution<T>(
  manualPreviewState: T | null | undefined,
  groupPreviewResolution: T | null | undefined,
  selectedHotspotId: number | null | undefined,
  previewResolutionsByHotspot: Record<number, T>,
): T | null {
  if (manualPreviewState) {
    const state = manualPreviewState as T & { resolution?: T | null };
    return state.resolution || manualPreviewState;
  }
  if (groupPreviewResolution) return groupPreviewResolution;
  if (!selectedHotspotId) return null;
  return previewResolutionsByHotspot[selectedHotspotId] || null;
}
