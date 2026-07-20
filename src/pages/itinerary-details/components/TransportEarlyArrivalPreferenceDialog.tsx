import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TRANSPORT_DEFAULT_HOTEL_REST_MINUTES,
  TRANSPORT_EARLY_ARRIVAL_CUTOFF,
  TRANSPORT_EARLY_ARRIVAL_HOTEL_MESSAGE,
  type TransportEarlyArrivalOption,
} from "../../CreateItinerary/helpers/transportEarlyArrival";

export type TransportEarlyArrivalPreferenceValue = {
  option: TransportEarlyArrivalOption;
  hotelName: string;
  restMinutes: number;
};

type Props = {
  open: boolean;
  option: TransportEarlyArrivalOption | "";
  hotelName: string;
  restMinutes: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: TransportEarlyArrivalPreferenceValue) => void;
};

export function TransportEarlyArrivalPreferenceDialog({
  open,
  option,
  hotelName,
  restMinutes,
  onOpenChange,
  onConfirm,
}: Props) {
  const [draftOption, setDraftOption] = useState<TransportEarlyArrivalOption | "">(option);
  const [draftHotelName, setDraftHotelName] = useState(hotelName);
  const [draftRestMinutes, setDraftRestMinutes] = useState(restMinutes || TRANSPORT_DEFAULT_HOTEL_REST_MINUTES);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraftOption(option);
    setDraftHotelName(hotelName);
    setDraftRestMinutes(restMinutes || TRANSPORT_DEFAULT_HOTEL_REST_MINUTES);
    setError("");
  }, [hotelName, open, option, restMinutes]);

  const handleConfirm = () => {
    if (!draftOption) {
      setError("Select how Day 1 should begin.");
      return;
    }

    onConfirm({
      option: draftOption,
      hotelName: draftOption === "HOTEL_REST" ? draftHotelName.trim() : "",
      restMinutes: draftOption === "HOTEL_REST" ? draftRestMinutes : 60,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-field="transportEarlyArrivalOption" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Early-morning arrival preference</DialogTitle>
          <DialogDescription>
            Ask the guest: Would you like to choose how Day 1 should begin before {TRANSPORT_EARLY_ARRIVAL_CUTOFF} AM?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => { setDraftOption("HOTEL_REST"); setError(""); }}
            className={draftOption === "HOTEL_REST" ? "rounded-lg border-2 border-purple-600 bg-white p-4 text-left" : "rounded-lg border bg-white p-4 text-left"}
          >
            <div className="font-medium">Proceed directly to a hotel for freshening up and rest</div>
            <div className="mt-1 text-sm text-muted-foreground">Hotel charges may apply.</div>
          </button>

          <button
            type="button"
            onClick={() => { setDraftOption("REFRESHMENT_BEFORE_SIGHTSEEING"); setError(""); }}
            className={draftOption === "REFRESHMENT_BEFORE_SIGHTSEEING" ? "rounded-lg border-2 border-purple-600 bg-white p-4 text-left" : "rounded-lg border bg-white p-4 text-left"}
          >
            <div className="font-medium">Take a refreshment or waiting break before sightseeing</div>
            <div className="mt-1 text-sm text-muted-foreground">Begin sightseeing at the earliest practical time after the refreshment or waiting break.</div>
          </button>
        </div>

        {draftOption === "HOTEL_REST" && (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="details-transport-early-arrival-hotel">Hotel name (optional)</Label>
              <Input
                id="details-transport-early-arrival-hotel"
                value={draftHotelName}
                onChange={(event) => setDraftHotelName(event.target.value)}
                placeholder="Enter hotel name"
              />
              <p className="mt-1 text-xs text-muted-foreground">Leave blank if the guest will decide after reaching the arrival city.</p>
            </div>
            <div>
              <Label htmlFor="details-transport-early-arrival-rest">Rest duration (minutes)</Label>
              <Input
                id="details-transport-early-arrival-rest"
                type="number"
                min={30}
                max={720}
                value={draftRestMinutes}
                onChange={(event) => setDraftRestMinutes(Number(event.target.value || 0))}
              />
            </div>
          </div>
        )}

        {draftOption === "HOTEL_REST" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">{TRANSPORT_EARLY_ARRIVAL_HOTEL_MESSAGE}</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleConfirm} disabled={!draftOption}>Use this preference</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
