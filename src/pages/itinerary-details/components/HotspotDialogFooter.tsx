import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

type HotspotDialogFooterProps = {
  disabled: boolean;
  onClose: () => void;
};

export function HotspotDialogFooter({ disabled, onClose }: HotspotDialogFooterProps) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onClose} disabled={disabled}>
        Close
      </Button>
    </DialogFooter>
  );
}

