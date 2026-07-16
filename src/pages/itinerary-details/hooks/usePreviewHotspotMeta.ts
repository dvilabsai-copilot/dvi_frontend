/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { formatMinutesDuration } from "../utils/timeline.utils";

type UsePreviewHotspotMetaOptions = {
  addHotspotRouteId: number | null | undefined;
  availableHotspots: any[];
  itineraryDays: any[] | null | undefined;
};

export type PreviewHotspotMeta = {
  visitTime?: string | null;
  duration?: string | null;
  timings?: string | null;
  priority?: number | null;
};

/** Combines route-day attraction timing with hotspot metadata for preview rendering. */
export const usePreviewHotspotMeta = ({
  addHotspotRouteId,
  availableHotspots,
  itineraryDays,
}: UsePreviewHotspotMetaOptions): Map<number, PreviewHotspotMeta> => useMemo(() => {
    const routeId = Number(addHotspotRouteId || 0);
    const day = itineraryDays?.find((d) => Number(d.id) === routeId);
    const map = new Map<number, { visitTime?: string | null; duration?: string | null; timings?: string | null; priority?: number | null }>();

    const daySegments = Array.isArray(day?.segments) ? day!.segments : [];
    for (const seg of daySegments as any[]) {
      if (String(seg?.type || '').toLowerCase() !== 'attraction') continue;
      const hotspotId = Number(seg?.hotspotId ?? seg?.locationId ?? 0);
      if (!Number.isFinite(hotspotId) || hotspotId <= 0) continue;

      map.set(hotspotId, {
        visitTime: seg?.visitTime || null,
        duration: seg?.duration || null,
        timings: seg?.timings || null,
        priority: Number.isFinite(Number(seg?.priority)) ? Number(seg.priority) : null,
      });
    }

    for (const hotspot of availableHotspots) {
      const hotspotId = Number(hotspot?.id || 0);
      if (!Number.isFinite(hotspotId) || hotspotId <= 0) continue;

      const existing = map.get(hotspotId) || {};
      const durationFromHours = Number(hotspot?.timeSpend || 0) > 0
        ? formatMinutesDuration(Math.round(Number(hotspot.timeSpend) * 60))
        : null;

      map.set(hotspotId, {
        visitTime: existing.visitTime || null,
        duration: existing.duration || durationFromHours,
        timings: existing.timings || hotspot?.timings || null,
        priority:
          existing.priority ??
          (Number.isFinite(Number((hotspot as any)?.priority)) ? Number((hotspot as any).priority) : null) ??
          (Number.isFinite(Number((hotspot as any)?.hotspotPriority)) ? Number((hotspot as any).hotspotPriority) : null) ??
          (Number.isFinite(Number((hotspot as any)?.hotspot_priority)) ? Number((hotspot as any).hotspot_priority) : null),
      });
    }

    return map;
  }, [addHotspotRouteId, availableHotspots, itineraryDays]);

