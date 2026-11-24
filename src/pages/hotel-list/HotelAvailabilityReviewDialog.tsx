import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HotelRoomBatchPrice } from "../itinerary-details/itinerary-details.types";

export function HotelRoomBatchPrices({ prices, nights }: { prices: HotelRoomBatchPrice[]; nights?: number }) {
  return (
    <div className="my-2 rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
      <p className="mb-1 font-semibold">Room prices{nights ? ` for ${nights} ${nights === 1 ? "night" : "nights"}` : ""}</p>
      <ul className="space-y-1">
        {prices.map(({ batchIndex, roomCount, roomType, amount, currency }) => (
          <li key={batchIndex} className="flex justify-between gap-3">
            <span>{roomCount} {roomCount === 1 ? "room" : "rooms"} · {roomType}</span>
            <span className="shrink-0 font-medium">{new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
