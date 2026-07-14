/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";

type EffectivePreviewTimelineOptions = {
  activePreviewResolution: unknown;
  activePreviewTimeline: any[];
  defaultPreviewTimeline: any[];
  groupPreviewResolution: unknown;
  pendingPriorityReplacementHotspotId: number | null;
  selectedHotspotId: number | null;
  selectedHotspotIds: number[];
  selectedPreviewSegments: any[];
};

/** Owns the ordering, pruning, removal, and baseline-merge rules for the manual hotspot preview timeline. */
export const useEffectivePreviewTimeline = ({
  activePreviewResolution,
  activePreviewTimeline,
  defaultPreviewTimeline,
  groupPreviewResolution,
  pendingPriorityReplacementHotspotId,
  selectedHotspotId,
  selectedHotspotIds,
  selectedPreviewSegments,
}: EffectivePreviewTimelineOptions): any[] => {
  return useMemo(() => {
    const enforceHotelOrderingSafety = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0) return rows;

      const isHotelLike = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        const text = String(row?.text || row?.name || '').toLowerCase();
        return type === 'hotel' || Number(row?.item_type) === 6 || text.includes('check-in at hotel');
      };
      const isRouteContent = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'attraction' || type === 'travel' || Number(row?.item_type) === 3 || Number(row?.item_type) === 4;
      };

      const hotelIndex = rows.findIndex((row) => isHotelLike(row));
      if (hotelIndex < 0) return rows;

      const hasLaterRouteContent = rows.slice(hotelIndex + 1).some((row) => isRouteContent(row));
      if (!hasLaterRouteContent) return rows;

      const anyHavePreviewOrder = rows.some((row) => Number.isFinite(Number(row?.matrixPreviewOrder ?? row?.previewOrder)));
      if (!anyHavePreviewOrder) return rows;

      return [...rows].sort((a, b) => (
        Number(a?.matrixPreviewOrder ?? a?.previewOrder ?? 9999)
        - Number(b?.matrixPreviewOrder ?? b?.previewOrder ?? 9999)
      ));
    };

    const prunePrematureHotelTravelLegs = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0) return rows;

      const isTravel = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'travel' || Number(row?.item_type || 0) === 3 || Number(row?.item_type || 0) === 5;
      };
      const isAttraction = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        return type === 'attraction' || Number(row?.item_type || 0) === 4;
      };
      const isHotelLike = (row): boolean => {
        const type = String(row?.type || '').toLowerCase();
        const text = String(row?.text || row?.name || '').toLowerCase();
        return type === 'hotel' || type === 'checkin' || Number(row?.item_type || 0) === 6 || text.includes('check-in at ');
      };
      const normalizeLabel = (value): string => String(value || '')
        .toLowerCase()
        .replace(/^travel\s+to\s+/i, '')
        .replace(/^check-?in\s+at\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      const parseStartMinutes = (value): number | null => {
        const raw = String(value || '').trim();
        if (!raw) return null;
        const startPart = raw.split('-')[0]?.trim() || raw;
        const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let h = Number(match[1]);
        const m = Number(match[2]);
        const ampm = String(match[3]).toUpperCase();
        if (ampm === 'AM' && h === 12) h = 0;
        if (ampm === 'PM' && h !== 12) h += 12;
        return (h * 60) + m;
      };
      const parseEndMinutes = (value): number | null => {
        const raw = String(value || '').trim();
        if (!raw || !raw.includes('-')) return null;
        const endPart = raw.split('-')[1]?.trim() || '';
        const match = endPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let h = Number(match[1]);
        const m = Number(match[2]);
        const ampm = String(match[3]).toUpperCase();
        if (ampm === 'AM' && h === 12) h = 0;
        if (ampm === 'PM' && h !== 12) h += 12;
        return (h * 60) + m;
      };

      const hotelIndex = rows.findIndex((row) => isHotelLike(row));
      if (hotelIndex <= 0) return rows;

      const hotelRow = rows[hotelIndex];
      const hotelNameFromCheckin = (() => {
        const text = String(hotelRow?.text || hotelRow?.name || '').trim();
        const match = text.match(/check-?in\s+at\s+(.+)/i);
        return String(match?.[1] || '').trim();
      })();
      const hotelLabel = normalizeLabel(hotelNameFromCheckin || hotelRow?.toName || hotelRow?.name || 'hotel');
      const hotelStart = parseStartMinutes(hotelRow?.timeRange);

      const lastAttractionBeforeHotel = (() => {
        for (let i = hotelIndex - 1; i >= 0; i -= 1) {
          if (isAttraction(rows[i])) return i;
        }
        return -1;
      })();

      const hotelTravelCandidates = rows
        .map((row, index: number) => ({ row, index }))
        .filter(({ row, index }) => {
          if (index >= hotelIndex || !isTravel(row)) return false;
          const target = normalizeLabel(row?.toName || row?.to || row?.text || row?.name);
          return target === hotelLabel;
        });

      if (hotelTravelCandidates.length <= 1) return rows;

      const keepIndex = (() => {
        const explicitMatrixHotelLeg = hotelTravelCandidates.find(({ row }) => (
          row?.isMatrixSplitTravel === true
          && String(row?.matrixTravelLeg || '').toUpperCase() === 'C_TO_B'
        ));
        if (explicitMatrixHotelLeg) {
          return explicitMatrixHotelLeg.index;
        }

        const valid = hotelTravelCandidates
          .map(({ row, index }) => {
            const endMin = parseEndMinutes(row?.timeRange);
            return { index, endMin };
          })
          .filter((entry) => hotelStart !== null && entry.endMin !== null && entry.endMin <= hotelStart);

        if (valid.length > 0) {
          return valid.sort((a, b) => Number(b.endMin || 0) - Number(a.endMin || 0))[0].index;
        }

        return hotelTravelCandidates[hotelTravelCandidates.length - 1].index;
      })();

      const dropSet = new Set<number>();
      for (const { index } of hotelTravelCandidates) {
        if (index !== keepIndex) dropSet.add(index);
        if (index < lastAttractionBeforeHotel && index !== keepIndex) dropSet.add(index);
      }

      const filteredRows = dropSet.size === 0
        ? rows
        : rows.filter((_, index: number) => !dropSet.has(index));

      // When we keep computed C->B leg, align hotel/check-in to the travel end in preview.
      const retainedTravel = filteredRows.find((row, index: number) => (
        isTravel(row)
        && normalizeLabel(row?.toName || row?.to || row?.text || row?.name) === hotelLabel
        && index < filteredRows.findIndex((candidate) => isHotelLike(candidate))
      ));
      const retainedRange = String(retainedTravel?.timeRange || '').trim();
      const retainedEndText = retainedRange.includes(' - ')
        ? String(retainedRange.split(' - ')[1] || '').trim()
        : '';

      if (!retainedEndText) return filteredRows;

      return filteredRows.map((row) => {
        if (!isHotelLike(row)) return row;
        return {
          ...row,
          timeRange: `${retainedEndText} - ${retainedEndText}`,
        };
      });
    };

    const applyBestSlotOrdering = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0 || !selectedHotspotId) return rows;

      // Backend-provided matrix split travel rows already represent the correct route shape.
      if (rows.some((row) => row?.isMatrixSplitTravel === true)) {
        return rows;
      }

      const fit = (activePreviewResolution as any)?.manualInsertionFit;
      const selectedIdNum = Number(selectedHotspotId);
      const fitBest = fit?.bestSlot || null;
      const fitChosen = fit?.chosenSlot || null;
      const chosenInvalid = Boolean(
        fitChosen
        && (Number(fitChosen?.fromHotspotId) === selectedIdNum || Number(fitChosen?.toHotspotId) === selectedIdNum),
      );
      const safeChosen = chosenInvalid ? null : fitChosen;
      const safeBest = (fitBest
        && Number(fitBest?.fromHotspotId) !== selectedIdNum
        && Number(fitBest?.toHotspotId) !== selectedIdNum)
        ? fitBest
        : null;

      const fromName = String(safeChosen?.fromName || safeBest?.fromName || '').trim();
      if (!fromName) return rows;

      const getSegHotspotId = (seg): number => Number(
        seg?.selectedHotspotId ??
        seg?.locationId ??
        seg?.hotspotId ??
        seg?.hotspot_ID ??
        seg?.hotspot_id ??
        0,
      );

      const selectedIdx = rows.findIndex((seg) => (
        String(seg?.type || '').toLowerCase() === 'attraction'
        && getSegHotspotId(seg) === selectedIdNum
      ));
      if (selectedIdx < 0) return rows;

      const fromIdx = rows.findIndex((seg) => (
        String(seg?.type || '').toLowerCase() === 'attraction'
        && String(seg?.text || '').trim() === fromName
      ));
      if (fromIdx < 0) return rows;

      const targetIdx = Math.min(fromIdx + 1, rows.length);
      if (targetIdx === selectedIdx || targetIdx === (selectedIdx + 1)) return rows;

      const reordered = [...rows];
      const [selectedSeg] = reordered.splice(selectedIdx, 1);
      const adjustedTargetIdx = selectedIdx < targetIdx ? targetIdx - 1 : targetIdx;
      reordered.splice(adjustedTargetIdx, 0, selectedSeg);
      return reordered;
    };

    const fit = (activePreviewResolution as any)?.manualInsertionFit
      || (groupPreviewResolution as any)?.manualInsertionFit
      || null;
    const resolvedLowPriorityPlan = fit?.lowPriorityRemovalPlanPreview?.resolved === true;
    const backendResolvedTimeline = Boolean(
      resolvedLowPriorityPlan
      || fit?.fullTimelineIsResolvedRemovalPlan === true
      || fit?.timelineSource === 'LOW_PRIORITY_REMOVAL_FINAL_TIMELINE',
    );
    const plannedRemovals: any[] = Array.isArray(fit?.lowPriorityRemovalPlanPreview?.plannedRemovals)
      ? fit.lowPriorityRemovalPlanPreview.plannedRemovals
      : [];

    const removePlannedRemovalRows = (rows: any[]): any[] => {
      const removedIds = new Set(
        plannedRemovals
          .map((row) => Number(row?.id || row?.hotspotId || row?.hotspot_ID || row?.locationId || 0))
          .filter((id: number) => Number.isFinite(id) && id > 0),
      );
      const removedNames = new Set(
        plannedRemovals
          .map((row) => String(row?.name || row?.hotspotName || '').trim().toLowerCase())
          .filter(Boolean),
      );

      return (rows || []).filter((row) => {
        const rowId = Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0);
        const rowText = String(row?.text || row?.name || row?.to || row?.toName || '').trim().toLowerCase();

        if (rowId > 0 && removedIds.has(rowId)) return false;
        for (const removedName of removedNames) {
          if (removedName && rowText.includes(removedName)) return false;
        }
        return true;
      });
    };

    const sortByPreviewOrder = (rows: any[]): any[] => {
      if ((rows || []).some((row) => Number.isFinite(Number(row?.matrixPreviewOrder ?? row?.previewOrder)))) {
        return [...rows].sort((a, b) => (
          Number(a?.matrixPreviewOrder ?? a?.previewOrder ?? 9999)
          - Number(b?.matrixPreviewOrder ?? b?.previewOrder ?? 9999)
        ));
      }
      return rows;
    };

    if (backendResolvedTimeline && activePreviewTimeline.length > 0) {
      return prunePrematureHotelTravelLegs(
        enforceHotelOrderingSafety(
          sortByPreviewOrder(removePlannedRemovalRows(activePreviewTimeline)),
        ),
      );
    }

    if (activePreviewTimeline.length > 0) {
      const orderedTimeline = prunePrematureHotelTravelLegs(
        enforceHotelOrderingSafety(sortByPreviewOrder(activePreviewTimeline)),
      );
      const insertedIndex = orderedTimeline.findIndex((row) => Number(
        row?.selectedHotspotId
        ?? row?.locationId
        ?? row?.hotspotId
        ?? row?.hotspot_ID
        ?? row?.hotspot_id
        ?? 0,
      ) === Number(selectedHotspotId || 0));

      console.log('[ManualHotspotModal] rendering_order', orderedTimeline.map((row, index: number) => ({
        index,
        type: String(row?.type || '').toLowerCase(),
        text: String(row?.text || row?.name || ''),
        hotspotId: Number(row?.locationId || row?.hotspotId || row?.hotspot_ID || row?.hotspot_id || 0) || null,
        previewOrder: Number(row?.matrixPreviewOrder ?? row?.previewOrder ?? -1),
      })));
      console.log('[ManualHotspotModal] inserted_hotspot_position', {
        selectedHotspotId: Number(selectedHotspotId || 0),
        index: insertedIndex,
      });

      return orderedTimeline;
    }

    const activeAttractionCount = activePreviewTimeline.filter(
      (seg) => String(seg?.type || '').toLowerCase() === 'attraction',
    ).length;
    const selectedCount = selectedHotspotIds.length;
    const hasMatrixFit = Boolean(fit);
    const isMinimalPreview = activeAttractionCount <= Math.max(1, selectedCount + 1);
    const shouldMergeBaselineForMatrix = Boolean(
      hasMatrixFit
      && !backendResolvedTimeline
      && activePreviewTimeline.length > 0
      && isMinimalPreview,
    );

    // Some priority-confirmation previews return a minimal timeline (selected hotspot only).
    // In that case, show the default route timeline plus selected segments so users can review full context.
    const useMergedBaselineDuringPriorityConfirm = Boolean(
      pendingPriorityReplacementHotspotId
      && activePreviewTimeline.length > 0
      && activeAttractionCount <= Math.max(1, selectedCount + 1),
    );

    if (activePreviewTimeline.length > 0 && !useMergedBaselineDuringPriorityConfirm && !shouldMergeBaselineForMatrix) {
      return enforceHotelOrderingSafety(sortByPreviewOrder(activePreviewTimeline));
    }

    const merged = [...defaultPreviewTimeline, ...selectedPreviewSegments];

    const parseStartMinutes = (value): number => {
      const raw = String(value || '').trim();
      if (!raw || raw === '--') return Number.POSITIVE_INFINITY;

      const startPart = raw.split('-')[0]?.trim() || raw;
      const match = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return Number.POSITIVE_INFINITY;

      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const ampm = match[3].toUpperCase();

      if (ampm === 'AM' && hour === 12) hour = 0;
      if (ampm === 'PM' && hour !== 12) hour += 12;

      return hour * 60 + minute;
    };

    const sortedMerged = merged.sort((a, b) => parseStartMinutes(a?.timeRange) - parseStartMinutes(b?.timeRange));
    return enforceHotelOrderingSafety(applyBestSlotOrdering(sortedMerged));
  }, [
    activePreviewResolution,
    activePreviewTimeline,
    defaultPreviewTimeline,
    groupPreviewResolution,
    pendingPriorityReplacementHotspotId,
    selectedHotspotId,
    selectedHotspotIds.length,
    selectedPreviewSegments,
  ]);


};
