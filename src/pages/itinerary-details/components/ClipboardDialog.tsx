import React from "react";
import {
  Button,
} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ClipboardDialogProps {
  open: boolean;
  preference: number;
  clipboardType: string;
  recommendations: Array<{ label?: string }>;
  selectedHotels: Record<string, boolean>;
  onOpenChange: (open: boolean) => void;
  onSelectionChange: (selection: Record<string, boolean>) => void;
  onCopy: () => void | Promise<void>;
}

export const ClipboardDialog: React.FC<ClipboardDialogProps> = ({
  open,
  preference,
  clipboardType,
  recommendations,
  selectedHotels,
  onOpenChange,
  onSelectionChange,
  onCopy,
}) => (
  <Dialog open={preference === 2 ? false : open} onOpenChange={preference === 2 ? undefined : onOpenChange}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {clipboardType === "recommended" && "Recommended Hotel for Recommended"}
          {clipboardType === "highlights" && "Recommended Hotel for Highlights"}
          {clipboardType === "para" && "Recommended Hotel for Para"}
        </DialogTitle>
        <DialogDescription>Select recommended options to copy to clipboard</DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-3">
        {!recommendations.length ? (
          <p className="text-sm text-[#6c6c6c] text-center py-8">No hotel information available</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommendations.map((item, index) => {
              const key = `para-${index}`;
              return (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`para-${key}`}
                    className="h-6 w-6 cursor-pointer accent-[#5f259f] border-[#5f259f]"
                    checked={selectedHotels[key] || false}
                    onChange={(event) => onSelectionChange({ ...selectedHotels, [key]: event.target.checked })}
                  />
                  <label htmlFor={`para-${key}`} className="text-xl text-[#d546ab] font-medium cursor-pointer">
                    {item.label}
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => { onOpenChange(false); onSelectionChange({}); }}>
          Cancel
        </Button>
        <Button className="bg-[#8b43d1] hover:bg-[#7c37c1]" onClick={() => void onCopy()}>
          Copy Clipboard
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

