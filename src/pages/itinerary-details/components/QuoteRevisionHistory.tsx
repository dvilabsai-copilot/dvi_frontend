import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

const reasonLabels: Record<string, string> = {
  ROUTE_CHANGED: "Route changed",
  ROOM_COUNT_CHANGED: "Room count changed",
  OCCUPANCY_CHANGED: "Occupancy changed",
  MEAL_PLAN_CHANGED: "Itinerary meal plan changed",
  HOTEL_CATEGORY_CHANGED: "Hotel category changed",
  EARLY_ARRIVAL_CONFIRMED: "Early arrival confirmed",
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export function QuoteRevisionHistory({ quoteId, revision }: {
  quoteId: string;
  revision: NonNullable<ItineraryDetailsResponse["quoteRevision"]>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 py-2 text-sm text-slate-600">
      {revision.historical && <span>Historical revision · Read only</span>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
            Revision History
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Revision History</DialogTitle>
            <DialogDescription className="sr-only">Open a saved version of this itinerary.</DialogDescription>
          </DialogHeader>
          <ul aria-label="Quote revisions" className="max-h-[65vh] divide-y divide-slate-200 overflow-y-auto">
            {revision.entries.map((entry) => (
              <li key={entry.quoteId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <Link
                    to={`/itinerary-details/${encodeURIComponent(entry.quoteId)}`}
                    onClick={() => setOpen(false)}
                    aria-current={entry.quoteId === quoteId ? "page" : undefined}
                    className="break-words font-semibold text-violet-700 underline-offset-4 hover:underline"
                  >{entry.quoteId}</Link>
                  <p className="mt-1 text-slate-600">{entry.number === 0 ? "Original quote" : entry.reasons.map((reason) => reasonLabels[reason] ?? "Hotel search rerun").join(" · ")}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{dateTime.format(new Date(entry.changedAt))}{entry.changedBy ? ` · ${entry.changedBy}` : ""}</p>
                </div>
                <div className="text-right">
                  {entry.overallCost !== null && <p className="font-medium tabular-nums">{money.format(Number(entry.overallCost))}</p>}
                  {entry.current && <p className="mt-1 text-xs text-slate-500">Current quote</p>}
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
