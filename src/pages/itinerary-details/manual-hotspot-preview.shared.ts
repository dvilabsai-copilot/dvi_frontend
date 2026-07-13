export type ManualHotspotPreviewAnchor = {
  anchorType?: string;
  anchorIntent?: string;
  anchorIndex?: number;
  anchorFrom?: string | null;
  anchorTo?: string | null;
  anchorLabel?: string | null;
  anchorTimeRange?: string | null;
  afterRowType?: string | null;
  beforeRowType?: string | null;
  afterHotspotId?: number | null;
  afterRouteHotspotId?: number | null;
  beforeHotspotId?: number | null;
  beforeRouteHotspotId?: number | null;
};

export function buildExactManualHotspotPreviewPayload(
  routeId: number,
  selectedHotspotId: number,
  anchor: ManualHotspotPreviewAnchor,
) {
  return {
    routeId,
    selectedHotspotId,
    anchor: {
      ...anchor,
      isBeforeHotel: false,
    },
    allowP3Removal: true,
    allowP1P2Removal: true,
  };
}

export function buildAutoManualHotspotPreviewPayload(
  routeId: number,
  selectedHotspotId: number,
  anchors: ManualHotspotPreviewAnchor[],
) {
  return {
    routeId,
    selectedHotspotId,
    anchors,
    allowP3Removal: true,
    allowP1P2Removal: true,
  };
}

export function extractAutoPreviewResults(response: any): any[] {
  return Array.isArray(response?.results) ? response.results : [];
}

export function pickBestAutoPreviewAnchorKey(response: any, fallback: string | null = null): string | null {
  const bestAnchorKey = String(response?.bestAnchorKey || "").trim();
  if (bestAnchorKey) return bestAnchorKey;

  const results = extractAutoPreviewResults(response);
  const bestRow =
    results.find((row: any) => row?.attempt?.canConfirm === true) ||
    results[0] ||
    null;
  return String(bestRow?.anchorKey || fallback || "").trim() || null;
}
