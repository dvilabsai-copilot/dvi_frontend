
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
  date: string;
  source: string;
  next: string;
  initialSelected: string[];
};

type ViaRouteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  routes: SimpleOption[];
  loading: boolean;

  activeRoute: ActiveRouteInfo | null;
  maxRoutes?: number;

  initialIds?: string[];

  onSubmit: (
    selectedOptions: SimpleOption[]
  ) => void | Promise<void>;
};

type ViaRow = {
  id: number;
  selectedId: string;
};

export const ViaRouteDialog = ({
  open,
  onOpenChange,
  routes,
  loading,
  activeRoute,
  onSubmit,
  initialIds = [],
}: ViaRouteDialogProps) => {
  // Keep the Via Route UI at 25 rows even if an older parent passes maxRoutes={2}.
  const effectiveMaxRoutes = 25;

  // Build initial rows from saved route IDs or names.
  const buildInitialRows = (): ViaRow[] => {
    if (initialIds.length > 0) {
      const uniqueIds = Array.from(
        new Set(
          initialIds
            .map((value) =>
              value == null ? "" : String(value).trim()
            )
            .filter(Boolean)
        )
      );

      const mappedById = uniqueIds.map((id, index) => ({
        id: index + 1,
        selectedId: id,
      }));

      return mappedById.length > 0
        ? mappedById.slice(0, effectiveMaxRoutes)
        : [{ id: 1, selectedId: "" }];
    }

    const labels = activeRoute?.initialSelected ?? [];

    if (labels.length === 0) {
      return [{ id: 1, selectedId: "" }];
    }

    const mapped = labels
      .map((label, index) => {
        const option = routes.find(
          (route) => route.label === label
        );

        return {
          id: index + 1,
          selectedId: option ? String(option.id) : "",
        };
      })
      .filter((row) => row.selectedId !== "");

    return mapped.length > 0
      ? mapped.slice(0, effectiveMaxRoutes)
      : [{ id: 1, selectedId: "" }];
  };

  const [rows, setRows] = useState<ViaRow[]>(buildInitialRows);

  const rowsEditedRef = useRef(false);
  const activeLegRef = useRef<string | null>(null);

  // Load saved routes when the dialog opens, or when
  // another itinerary day/leg is selected.
  // Do not overwrite changes made inside the dialog.
  useEffect(() => {
    if (!open) {
      rowsEditedRef.current = false;
      activeLegRef.current = null;
      return;
    }

    const legKey = [
      activeRoute?.day ?? "",
      activeRoute?.date ?? "",
      activeRoute?.source ?? "",
      activeRoute?.next ?? "",
    ].join("|");

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
    routes,
    initialIds.join("|"),
    effectiveMaxRoutes,
  ]);

  // Update only the selected dropdown.
  const handleChangeRowValue = (
    rowId: number,
    newId: string
  ) => {
    rowsEditedRef.current = true;

    setRows((previous) =>
      previous.map((row) =>
        row.id === rowId
          ? { ...row, selectedId: newId }
          : row
      )
    );
  };

  // Add one new Via Route dropdown.
  const handleAddRow = () => {
    rowsEditedRef.current = true;

    setRows((previous) => {
      if (previous.length >= effectiveMaxRoutes) {
        return previous;
      }

      const nextId =
        Math.max(0, ...previous.map((row) => row.id)) + 1;

      return [
        ...previous,
        {
          id: nextId,
          selectedId: "",
        },
      ];
    });
  };

  // Delete only the clicked Via Route row.
  // Always keep one empty input when all rows are removed.
  const handleDeleteRow = (rowId: number) => {
    rowsEditedRef.current = true;

    setRows((previous) => {
      const remaining = previous.filter(
        (row) => row.id !== rowId
      );

      if (remaining.length === 0) {
        return [{ id: 1, selectedId: "" }];
      }

      return remaining;
    });
  };

  // Submit existing selected routes, preserving their order.
  const handleSubmit = () => {
    const seen = new Set<string>();
    const selectedOptions: SimpleOption[] = [];

    rows.forEach((row) => {
      if (!row.selectedId) return;

      const option = routes.find(
        (route) =>
          String(route.id) === String(row.selectedId)
      );

      if (!option) return;

      const optionId = String(option.id);

      if (seen.has(optionId)) return;

      seen.add(optionId);
      selectedOptions.push(option);
    });

    onSubmit(selectedOptions.slice(0, effectiveMaxRoutes));
  };

  const titleText =
    activeRoute?.day && activeRoute?.date
      ? `Day ${activeRoute.day} | ${activeRoute.date} | Via Route`
      : "Via Route";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[10001] w-[calc(100vw-2rem)] min-w-0 sm:max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#4a4260]">
            {titleText}
          </DialogTitle>
        </DialogHeader>

        {/* Source and destination */}
        {activeRoute && (
          <div className="mt-2 mb-4 grid grid-cols-1 gap-6 border-b border-[#ece2fb] pb-4 md:grid-cols-2">
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

        {/* Via Route selection */}
        <div className="space-y-3">
          <Label className="text-sm text-[#4a4260]">
            Via Routes
          </Label>

          {loading && (
            <div className="text-xs text-muted-foreground">
              Loading routes...
            </div>
          )}

          {!loading &&
            rows.map((row, index) => (
              <div
                key={row.id}
                className="flex w-full min-w-0 items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <Select
                    value={row.selectedId}
                    onValueChange={(value) =>
                      handleChangeRowValue(row.id, value)
                    }
                  >
                    <SelectTrigger
                      className="h-10 w-full min-w-0 border-[#e5d7f6] bg-white text-sm text-[#4a4260] shadow-sm focus:ring-1 focus:ring-[#c09bff]"
                    >
                      <SelectValue
                        placeholder="Choose Routes"
                      />
                    </SelectTrigger>

                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="z-[10002] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]"
                    >
                      {routes.map((option) => (
                        <SelectItem
                          key={option.id}
                          value={String(option.id)}
                          className="min-w-0 overflow-hidden whitespace-nowrap [&>span:last-child]:truncate"
                          title={option.label}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Original + icon beside the last Via Route dropdown. */}
                {index === rows.length - 1 && rows.length < effectiveMaxRoutes && (
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-md bg-gradient-to-r from-[#ff68b4] to-[#9b5cff]"
                    onClick={handleAddRow}
                    title="Add another via route"
                    aria-label="Add another via route"
                  >
                    +
                  </Button>
                )}

                {/* Remove only this row */}
                {row.selectedId && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0 border-[#f1c4d0] text-[#c0392b] hover:bg-red-50"
                    onClick={() =>
                      handleDeleteRow(row.id)
                    }
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

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
