import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function HotelAvailabilityReviewDialog({ open, onOpenChange, description, children, actions, dismissible = false }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  children: ReactNode;
  actions: ReactNode;
  dismissible?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl"
        hideClose={!dismissible}
        onEscapeKeyDown={(event) => { if (!dismissible) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (!dismissible) event.preventDefault(); }}
        onInteractOutside={(event) => { if (!dismissible) event.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Hotel Availability Updated</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
