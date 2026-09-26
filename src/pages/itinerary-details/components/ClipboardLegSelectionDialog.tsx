import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ClipboardLegOption = {
  key: string;
  label: string;
};

export type ClipboardLegSelectionDialogProps = {
  open: boolean;
  legs: ClipboardLegOption[];
  selectedLegs: Record<string, boolean>;
  onOpenChange: (open: boolean) => void;
  onSelectionChange: (selection: Record<string, boolean>) => void;
  onContinue: () => void;
};

export const ClipboardLegSelectionDialog: React.FC<
  ClipboardLegSelectionDialogProps
> = ({
  open,
  legs,
  selectedLegs,
  onOpenChange,
  onSelectionChange,
  onContinue,
}) => {
  const hasSelection = Object.values(selectedLegs).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Itinerary Legs</DialogTitle>

          <DialogDescription>
            Select the legs you want to include in the clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {legs.map((leg) => (
            <div key={leg.key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`clipboard-leg-${leg.key}`}
                className="h-6 w-6 cursor-pointer accent-[#5f259f]"
                checked={selectedLegs[leg.key] || false}
                onChange={(event) =>
                  onSelectionChange({
                    ...selectedLegs,
                    [leg.key]: event.target.checked,
                  })
                }
              />

              <label
                htmlFor={`clipboard-leg-${leg.key}`}
                className="cursor-pointer text-lg font-medium text-[#d546ab]"
              >
                {leg.label}
              </label>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onSelectionChange({});
            }}
          >
            Cancel
          </Button>

          <Button
            className="bg-[#8b43d1] hover:bg-[#7c37c1]"
            disabled={!hasSelection}
            onClick={onContinue}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClipboardLegSelectionDialog;