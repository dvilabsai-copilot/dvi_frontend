import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/button";

type PriorityRow = {
  id?: number;
  hotspotId?: number;
  hotspot_id?: number;
  name?: string;
  hotspot_name?: string;
  hotspotName?: string;
  priority?: number;
  effectivePriority?: number;
  normalizedPriority?: number;
  rawPriority?: number;
};

type PriorityResolution = {
  p3HotspotsToRemove?: PriorityRow[];
  removedTopPriorityHotspots?: PriorityRow[];
  topPriorityAffected?: PriorityRow[];
  requiresP3RemovalConfirmation?: boolean;
};

type HotspotPriorityConfirmationProps = {
  priorityConfirmRef: React.RefObject<HTMLDivElement>;
  pendingPriorityResolution?: PriorityResolution | null;
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const rowsFrom = (resolution?: PriorityResolution | null) => {
  const p3Rows = Array.isArray(resolution?.p3HotspotsToRemove) ? resolution.p3HotspotsToRemove : [];
  const removedRows = Array.isArray(resolution?.removedTopPriorityHotspots) ? resolution.removedTopPriorityHotspots : [];
  const affectedRows = Array.isArray(resolution?.topPriorityAffected) ? resolution.topPriorityAffected : [];
  return p3Rows.length > 0 ? p3Rows : removedRows.length > 0 ? removedRows : affectedRows;
};

/** Renders the inline priority-reschedule/P3-removal confirmation card. */
export const HotspotPriorityConfirmation: React.FC<HotspotPriorityConfirmationProps> = ({
  priorityConfirmRef,
  pendingPriorityResolution,
  isBusy,
  onConfirm,
  onCancel,
}) => {
  const rows = rowsFrom(pendingPriorityResolution);
  const names = rows.map((row) => {
    const id = Number(row?.id ?? row?.hotspotId ?? row?.hotspot_id ?? 0);
    const name = String(row?.name || row?.hotspot_name || row?.hotspotName || "").trim();
    return name || (id > 0 ? `Hotspot #${id}` : "");
  }).filter(Boolean);
  const label = names.length > 0 ? names.join(", ") : "one or more priority hotspots";
  const pluralSuffix = names.length === 1 ? "" : "s";
  const isP3 = rows.some((row) => Number(row?.priority ?? row?.effectivePriority ?? row?.normalizedPriority ?? row?.rawPriority ?? 0) === 3)
    || pendingPriorityResolution?.requiresP3RemovalConfirmation === true;

  return (
    <div ref={priorityConfirmRef} className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertTriangle className="h-3.5 w-3.5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-red-700">{isP3 ? `Remove P3 Hotspot${pluralSuffix} & Recalculate?` : `Reschedule Priority Hotspot${pluralSuffix}?`}</p>
          <p className="mt-1 text-xs leading-5 text-red-700">
            {isP3 ? <>Adding this hotspot requires removing these P3 hotspot{pluralSuffix}:<span className="font-semibold"> {label}</span>. After removal, the route will be recalculated automatically.</> : <>Adding this hotspot requires moving these priority hotspot{pluralSuffix} from the current slot:<span className="font-semibold"> {label}</span>. No hotspot is deleted. The timeline will be reshuffled and following items will be rescheduled.</>}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" className="w-full bg-red-600 text-white hover:bg-red-700" onClick={onConfirm} disabled={isBusy}>{isP3 ? "Remove P3 & Recalculate" : "Confirm Reschedule"}</Button>
        <Button size="sm" variant="outline" className="w-full border-gray-300 bg-white text-gray-700 hover:bg-gray-50" onClick={onCancel} disabled={isBusy}>Cancel</Button>
      </div>
    </div>
  );
};

export default HotspotPriorityConfirmation;
