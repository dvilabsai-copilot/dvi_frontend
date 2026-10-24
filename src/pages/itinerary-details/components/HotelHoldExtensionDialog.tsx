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

export type HotelHoldExtensionTarget = {
  requestId: number;
  hotelName: string;
  currentCutoffAt: string;
};

type HotelHoldExtensionDialogProps = {
  target: HotelHoldExtensionTarget | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (cutoffAt: string) => Promise<void>;
};

const pad = (value: number) => String(value).padStart(2, "0");

const toDateTimeLocalValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    setCutoffAt(target ? toDateTimeLocalValue(target.currentCutoffAt) : "");
  }, [target]);

  const minimumCutoff = target ? toDateTimeLocalValue(target.currentCutoffAt) : undefined;

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
            <label className="block text-sm font-semibold text-slate-700">
              Extend hold until
              <input
                type="datetime-local"
                value={cutoffAt}
                min={minimumCutoff}
                onChange={(event) => setCutoffAt(event.target.value)}
                disabled={isSubmitting}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-[#5c24e5] focus:ring-2 focus:ring-[#5c24e5]/20"
              />
            </label>
            <p className="text-xs text-slate-500">Choose a time later than the current hold cutoff.</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (cutoffAt) void onSubmit(new Date(cutoffAt).toISOString());
            }}
            disabled={!target || !cutoffAt || isSubmitting}
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
