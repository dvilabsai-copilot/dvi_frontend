// FILE: src/pages/CreateItinerary/ViaRouteDialog.tsx
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SimpleOption } from "@/services/itineraryDropdownsMock";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActiveRouteInfo = {
  day: number;
  date: string; // DD/MM/YYYY
  source: string;
  next: string;
  initialSelected: string[]; // saved via route NAMES for this segment
};

type ViaRouteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  routes: SimpleOption[];
  loading: boolean;

  activeRoute: ActiveRouteInfo | null;
  maxRoutes?: number; // default 2

  /**
   * Exact via_route_location IDs (as strings) returned by backend
   * for this leg – we prefer these to preselect options.
   */
  initialIds?: string[];

  // called with final selected options when user clicks Submit
  onSubmit: (selectedOptions: SimpleOption[]) => void | Promise<void>;
};

type ViaRow = {
  id: number;
  selectedId: string; // SimpleOption.id
};

export const ViaRouteDialog = ({
  open,
  onOpenChange,
  routes,
  loading,
  activeRoute,
  maxRoutes = 25,
  onSubmit,
  initialIds = [],
}: ViaRouteDialogProps) => {
  // Build initial rows from existing selection + current options
// REPLACE this whole function in ViaRouteDialog.tsx
const buildInitialRows = (): ViaRow[] => {
  // 1) Prefer IDs from backend – they exactly match option values
  if (initialIds && initialIds.length) {
    // Deduplicate IDs so that the same via location does not appear multiple times
    const uniqueIds = Array.from(
      new Set(
        initialIds
          .map((v) => (v == null ? "" : String(v).trim()))
          .filter((v) => v !== "")
      )
    );

    const mappedById: ViaRow[] = uniqueIds.map((id, idx) => ({
      id: idx + 1,
      selectedId: id,
    }));

    return mappedById.length ? mappedById : [{ id: 1, selectedId: "" }];
  }

  // 2) Fallback: map by labels (for safety / older data)
  const labels = activeRoute?.initialSelected ?? [];
  if (!labels.length) {
    // No existing selection at all → start with a single empty row
    return [{ id: 1, selectedId: "" }];
  }

  const mapped = labels
    .map((label, idx) => {
      const opt = routes.find((r) => r.label === label);
      return {
        id: idx + 1,
        selectedId: opt ? String(opt.id) : "",
      };
    })
    .filter((r) => r.selectedId !== "");

  return mapped.length ? mapped : [{ id: 1, selectedId: "" }];
};


  const [rows, setRows] = useState<ViaRow[]>(buildInitialRows);
const rowsEditedRef = useRef(false);
const activeLegRef = useRef<string | null>(null);

// Reset when opening a different leg, but not while editing rows
useEffect(() => {
  if (!open) {
    rowsEditedRef.current = false;
    activeLegRef.current = null;
    return;
  }

  const legKey = `${activeRoute?.day ?? ""}|${activeRoute?.date ?? ""}|${activeRoute?.source ?? ""}|${activeRoute?.next ?? ""}`;

  if (activeLegRef.current !== legKey) {
    activeLegRef.current = legKey;
    rowsEditedRef.current = false;
  }

  if (!rowsEditedRef.current) {
    setRows(buildInitialRows());
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  open,
  activeRoute?.day,
  activeRoute?.date,
  activeRoute?.source,
  activeRoute?.next,
  routes.length,
  initialIds.join("|"),
]);

const handleChangeRowValue = (rowId: number, newId: string) => {
  rowsEditedRef.current = true;

  setRows((prev) =>
    prev.map((row) =>
      row.id === rowId
        ? { ...row, selectedId: newId }
        : row
    )
  );
};

const handleAddRow = () => {
  rowsEditedRef.current = true;

  setRows((prev) => {
    if (prev.length >= maxRoutes) return prev;

    const nextId =
      Math.max(0, ...prev.map((row) => row.id)) + 1;

    return [...prev, { id: nextId, selectedId: "" }];
  });
};

const handleDeleteRow = (rowId: number) => {
  rowsEditedRef.current = true;

  setRows((prev) => {
    const remainingRows = prev.filter(
      (row) => row.id !== rowId
    );

    // Always keep at least one Via Route input.
    if (remainingRows.length === 0) {
      return [{ id: 1, selectedId: "" }];
    }

    return remainingRows;
  });
};

  const handleSubmit = () => {
    // Map selected IDs back to SimpleOption[] and remove duplicates
    const seen = new Set<string>();
    const selectedOptions: SimpleOption[] = [];

    rows.forEach((row) => {
      if (!row.selectedId) return;
      const opt = routes.find(
        (o) => String(o.id) === String(row.selectedId)
      );
      if (!opt) return;
      if (seen.has(String(opt.id))) return;
      seen.add(String(opt.id));
      selectedOptions.push(opt);
    });

    const limited = selectedOptions.slice(0, maxRoutes);
    onSubmit(limited);
  };

  const titleText =
    activeRoute && activeRoute.day && activeRoute.date
      ? `Day ${activeRoute.day} | ${activeRoute.date} | Via Route`
      : "Via Route";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
     <DialogContent className="z-[10001] w-[calc(100vw-2rem)] sm:max-w-2xl min-w-0">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#4a4260]">
            {titleText}
          </DialogTitle>
        </DialogHeader>

        {/* Source / Next visiting like PHP screen */}
        {activeRoute && (
          <div className="mt-2 mb-4 grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-4 border-[#ece2fb]">
            <div>
              <div className="text-xs uppercase tracking-wide text-[#a093c0]">
                Source Location
              </div>
              <div className="mt-1 text-sm font-medium text-[#4a4260]">
                {activeRoute.source || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-[#a093c0]">
                Next Visiting Place
              </div>
              <div className="mt-1 text-sm font-medium text-[#4a4260]">
                {activeRoute.next || "-"}
              </div>
            </div>
          </div>
        )}

        {/* Via Route rows – behaves like PHP Choose Routes + + / delete */}
        <div className="space-y-3">
          <Label className="text-sm text-[#4a4260]">Via Routes</Label>

          {loading && (
            <div className="text-xs text-muted-foreground">
              Loading routes…
            </div>
          )}

          {!loading &&
            rows.map((row, index) => (
    <div
  key={row.id}
  className="flex items-center gap-2 w-full min-w-0"
>
 <div className="min-w-0 flex-1">
 <Select
  value={row.selectedId}
  onValueChange={(value) =>
    handleChangeRowValue(row.id, value)
  }
>
    <SelectTrigger className="h-10 w-full min-w-0 border-[#e5d7f6] bg-white text-sm text-[#4a4260] shadow-sm focus:ring-1 focus:ring-[#c09bff]">
      <SelectValue placeholder="Choose Routes" />
    </SelectTrigger>

  <SelectContent
  position="popper"
  side="bottom"
  align="start"
  className="z-[10002] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]"
>
      {routes.map((opt) => (
        <SelectItem
          key={opt.id}
          value={String(opt.id)}
          className="min-w-0 overflow-hidden whitespace-nowrap [&>span:last-child]:truncate"
          title={opt.label}
        >
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

                {/* + button – only on last row and only if below maxRoutes */}
                {index === rows.length - 1 && rows.length < maxRoutes && (
                  <Button
                    type="button"
                    size="icon"
                   className="h-9 w-9 shrink-0 rounded-md bg-gradient-to-r from-[#ff68b4] to-[#9b5cff]"
                    onClick={handleAddRow}
                    title="Add another via route"
                  >
                    +
                  </Button>
                )}

                {/* Remove selected via route */}
      {row.selectedId && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0 border-[#f1c4d0] text-[#c0392b] hover:bg-red-50"
          onClick={() => handleDeleteRow(row.id)}
          title="Remove this via route"
          aria-label="Remove this via route"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
              </div>
            ))}
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
