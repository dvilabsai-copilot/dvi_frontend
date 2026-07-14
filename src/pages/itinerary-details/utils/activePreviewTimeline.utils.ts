type PreviewRow = Record<string, unknown>;

function asRows(value: unknown): PreviewRow[] {
  return Array.isArray(value)
    ? value.filter((row): row is PreviewRow => !!row && typeof row === "object")
    : [];
}

function parseStartMinutes(value: unknown): number {
  const raw = String(value || "").trim();
  if (!raw || raw === "--" || /manual override/i.test(raw) || raw === "Not schedulable") {
    return Number.POSITIVE_INFINITY;
  }
  const match = (raw.split("-")[0]?.trim() || raw).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return Number.POSITIVE_INFINITY;
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  return (hour * 60) + Number(match[2]);
}

function getTypePriority(segment: PreviewRow): number {
  const rawType = String(segment.type || segment.itemType || "").toLowerCase();
  if (rawType === "refreshment" || Number(segment.item_type) === 1) return 0;
  if (rawType === "travel" || Number(segment.item_type) === 3) return 1;
  if (rawType === "attraction" || Number(segment.item_type) === 4) return 2;
  if (rawType === "hotel" || Number(segment.item_type) === 6) return 4;
  return 3;
}

export function resolveActivePreviewTimeline(
  sourceTimeline: PreviewRow[],
  resolution: PreviewRow | null | undefined,
  routeId: number | null | undefined,
): PreviewRow[] {
  if (!sourceTimeline.length) return [];
  const removedRows = [
    ...asRows(resolution?.removedHotspots),
    ...asRows(resolution?.removedTopPriorityHotspots),
    ...asRows(resolution?.deferredHotspots),
  ];
  const removedIds = new Set(
    removedRows.map((row) => Number(row.id ?? row.hotspotId ?? row.hotspot_ID ?? 0)).filter((id) => id > 0),
  );
  const routeScopedRows = sourceTimeline
    .filter((row) => {
      const rowRouteId = Number(
        row.itinerary_route_ID ?? row.itineraryRouteId ?? row.itinerary_route_id ?? row.route_id ??
        row.routeId ?? row.dayId ?? row.routeID ?? row.route,
      );
      if (!Number.isFinite(rowRouteId) || rowRouteId <= 0) return true;
      return rowRouteId === Number(routeId);
    })
    .filter((row) => {
      if (removedIds.size === 0) return true;
      const hotspotId = Number(row.hotspotId ?? row.hotspot_ID ?? row.locationId ?? 0);
      if (removedIds.has(hotspotId) || removedIds.has(Number(row.toHotspotId ?? 0))) return false;
      const text = String(row.text || row.name || "").toLowerCase();
      const toName = String(row.toName || row.to || row.displayToName || "").toLowerCase();
      return !removedRows.some((removed) => {
        const removedName = String(removed.name || "").toLowerCase().trim();
        return removedName && (text === removedName || text.includes(`travel to ${removedName}`) || toName.includes(removedName));
      });
    });
  const rows = [...routeScopedRows];
  if (rows.some((row) => Number.isFinite(Number(row.matrixPreviewOrder ?? row.previewOrder)))) {
    return rows.sort((a, b) => Number(a.matrixPreviewOrder ?? a.previewOrder ?? 9999) - Number(b.matrixPreviewOrder ?? b.previewOrder ?? 9999));
  }
  if (rows.some((row) => row.isMatrixSplitTravel === true || row.isMatrixPositioned === true)) return rows;
  return rows.sort((a, b) => {
    const startDiff = parseStartMinutes(a.timeRange) - parseStartMinutes(b.timeRange);
    return startDiff !== 0 ? startDiff : getTypePriority(a) - getTypePriority(b);
  });
}
