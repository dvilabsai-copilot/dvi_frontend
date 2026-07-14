export interface PreviewRemovedHotspotDetail {
  hotspotId: number;
  key: string;
  name: string;
  priorityLabel: string | null;
  workPriorityLabel: string | null;
  reason: string | null;
  removalReasonCode: string | null;
}

type PreviewResolution = Record<string, unknown>;

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    : [];
}

function getHotspotId(row: Record<string, unknown>): number {
  return Number(row.hotspotId || row.hotspot_ID || row.hotspot_id || row.locationId || row.id || 0);
}

function getHotspotName(row: Record<string, unknown>): string {
  return String(row.name || row.hotspotName || row.hotspot_name || "").trim();
}

export function getPreviewRemovedHotspotDetails(
  resolution: PreviewResolution | null | undefined,
): PreviewRemovedHotspotDetail[] {
  const rows = [
    ...asRows(resolution?.removedHotspots),
    ...asRows(resolution?.removedOptionalHotspots),
    ...asRows(resolution?.removedTopPriorityHotspots),
    ...asRows((resolution?.changesRequiredDisplay as PreviewResolution | undefined)?.removedItems),
  ];
  const seen = new Set<string>();

  return rows.map((row) => {
    const hotspotId = getHotspotId(row);
    const name = getHotspotName(row);
    const priorityValue = Number(row.priority || row.workPriority || row.effectivePriority || 0);
    const key = hotspotId > 0 ? String(hotspotId) : name.toLowerCase();
    const priorityLabel = Number.isFinite(priorityValue) && priorityValue > 0
      ? `Work Priority ${priorityValue}`
      : String(row.workPriorityLabel || row.priorityLabel || "").trim() || null;
    return {
      hotspotId,
      key,
      name,
      priorityLabel,
      workPriorityLabel: Number.isFinite(priorityValue) && priorityValue > 0
        ? `Work Priority ${priorityValue}`
        : String(row.workPriorityLabel || "").trim() || null,
      reason: String(row.fitFailureExplanation || row.reason || row.message || "").trim() || null,
      removalReasonCode: String(row.removalReasonCode || "").trim() || null,
    };
  }).filter((row) => {
    if (!row.name || !row.key || seen.has(row.key)) return false;
    seen.add(row.key);
    return true;
  });
}

export function getOptionalPreviewRemovedHotspotDetails(
  resolution: PreviewResolution | null | undefined,
  details: PreviewRemovedHotspotDetail[],
): PreviewRemovedHotspotDetail[] {
  const optionalKeys = new Set(
    asRows(resolution?.removedOptionalHotspots).map((row) => {
      const hotspotId = getHotspotId(row);
      const name = getHotspotName(row).toLowerCase();
      return hotspotId > 0 ? String(hotspotId) : name;
    }),
  );
  return details.filter((row) => optionalKeys.has(row.key));
}
