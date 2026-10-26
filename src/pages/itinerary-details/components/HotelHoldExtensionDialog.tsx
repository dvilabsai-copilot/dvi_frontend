import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HotelHoldCutoffPicker } from "./HotelHoldCutoffPicker";

export type HotelHoldExtensionTarget = {
  requestId: number;
  hotelName: string;
  currentCutoffAt: string;
  maxCutoffAt?: string;
};

type HotelHoldExtensionDialogProps = {
  target: HotelHoldExtensionTarget | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (cutoffAt: string) => Promise<void>;
};

const addHours = (value: string, hours: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return date.toISOString();
};

const formatCutoff = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Not set";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export function HotelHoldExtensionDialog({
  target,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: HotelHoldExtensionDialogProps) {
  const [cutoffAt, setCutoffAt] = useState("");

  useEffect(() => {
    if (!target) {
      setCutoffAt("");
      return;
    }
    const proposed = new Date(addHours(target.currentCutoffAt, 1));
    const maximum = target.maxCutoffAt ? new Date(target.maxCutoffAt) : null;
    const initial = maximum && !Number.isNaN(maximum.getTime()) && proposed.getTime() > maximum.getTime()
      ? maximum
      : proposed;
    setCutoffAt(Number.isNaN(initial.getTime()) ? "" : initial.toISOString());
  }, [target]);

  const minimumCutoff = target ? new Date(target.currentCutoffAt) : undefined;
  const maximumCutoff = target?.maxCutoffAt ? new Date(target.maxCutoffAt) : undefined;
  const parsedCutoff = cutoffAt ? new Date(cutoffAt) : null;
  const canSubmit = Boolean(
    target
    && parsedCutoff
    && !Number.isNaN(parsedCutoff.getTime())
    && minimumCutoff
    && parsedCutoff.getTime() > minimumCutoff.getTime(),
  );

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(event) => {
          // The cutoff time picker is portalled outside DialogContent by
          // Radix Popover. Treat interactions with that picker as internal
          // dialog interactions so opening or using it does not close this
          // dialog.
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper]")) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e1b4b]">
            <Clock3 className="h-5 w-5 text-[#5c24e5]" />
            Extend Hotel Hold
          </DialogTitle>
          <DialogDescription>
            Extend the existing hold and notify the hotelier by email.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p className="font-semibold text-slate-800">{target.hotelName}</p>
              <p className="mt-1 text-xs text-slate-500">
                Current hold until: <span className="font-medium text-slate-700">{formatCutoff(target.currentCutoffAt)}</span>
              </p>
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Extend hold until
              <div className="mt-1.5">
                <HotelHoldCutoffPicker
                  value={cutoffAt}
                  minDate={minimumCutoff}
                  maxDate={maximumCutoff}
                  disabled={isSubmitting}
                  onChange={setCutoffAt}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (canSubmit && parsedCutoff) void onSubmit(parsedCutoff.toISOString());
            }}
            disabled={!canSubmit || isSubmitting}
            className="bg-[#5c24e5] text-white hover:bg-[#4d1ecc]"
          >
            {isSubmitting ? "Extending..." : "Extend Hold & Notify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HotelHoldExtensionDialog;
