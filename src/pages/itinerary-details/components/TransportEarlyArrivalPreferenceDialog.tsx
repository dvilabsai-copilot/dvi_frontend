
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
  TRANSPORT_DEFAULT_REFRESHMENT_MINUTES,
  TRANSPORT_EARLY_ARRIVAL_CUTOFF,
  TRANSPORT_EARLY_ARRIVAL_HOTEL_MESSAGE,
  type TransportEarlyArrivalOption,
} from "../../CreateItinerary/helpers/transportEarlyArrival";

export type TransportEarlyArrivalPreferenceValue = {
  option: TransportEarlyArrivalOption;
  hotelName: string;
  locationName: string;
  restMinutes: number;
};

type Props = {
  open: boolean;
  option: TransportEarlyArrivalOption | "";
  hotelName: string;
  locationName?: string;
  restMinutes: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: TransportEarlyArrivalPreferenceValue) => void;
};

const CHOICES: Array<{
  option: TransportEarlyArrivalOption;
  title: string;
  description: string;
}> = [
  {
    option: "REFRESHMENT_BEFORE_SIGHTSEEING",
    title: "Refreshment Break",
    description: "Take a refreshment or waiting break before sightseeing.",
  },
  {
    option: "AIRPORT_LOUNGE",
    title: "Airport Lounge",
    description: "Rest or freshen up at an airport lounge, subject to availability.",
  },
  {
    option: "HOTEL_REST",
    title: "Hotel Rest",
    description: "Proceed to a hotel. Early check-in and charges are subject to availability.",
  },
  {
    option: "RESTAURANT_REST",
    title: "Nearby Restaurant",
    description: "Take a refreshment break at a suitable restaurant.",
  },
  {
    option: "OTHER_LOCATION",
    title: "Other Location",
    description: "Enter the guest's preferred resting location.",
  },
];

export function TransportEarlyArrivalPreferenceDialog({
  open,
  option,
  hotelName,
  locationName = "",
  restMinutes,
  onOpenChange,
  onConfirm,
}: Props) {
  const [draftOption, setDraftOption] =
    useState<TransportEarlyArrivalOption | "">(option);
  const [draftHotelName, setDraftHotelName] = useState(hotelName);
  const [draftLocationName, setDraftLocationName] = useState(locationName);
  const [draftRestMinutes, setDraftRestMinutes] = useState(
    restMinutes || TRANSPORT_DEFAULT_HOTEL_REST_MINUTES,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraftOption(option);
    setDraftHotelName(hotelName);
    setDraftLocationName(locationName);
    setDraftRestMinutes(
      restMinutes || TRANSPORT_DEFAULT_HOTEL_REST_MINUTES,
    );
    setError("");
  }, [open, option, hotelName, locationName, restMinutes]);

  const handleConfirm = () => {
    if (!draftOption) {
      setError("Select how Day 1 should begin.");
      return;
    }

    const minutes =
      draftOption === "REFRESHMENT_BEFORE_SIGHTSEEING"
        ? TRANSPORT_DEFAULT_REFRESHMENT_MINUTES
        : draftRestMinutes;

    if (!Number.isInteger(minutes) || minutes < 30 || minutes > 720) {
      setError("Rest duration must be between 30 and 720 minutes.");
      return;
    }

    if (
      draftOption === "OTHER_LOCATION" &&
      !draftLocationName.trim()
    ) {
      setError("Enter the preferred resting location.");
      return;
    }

    if (
      draftHotelName.trim().length > 255 ||
      draftLocationName.trim().length > 255
    ) {
      setError("Location names must be 255 characters or fewer.");
      return;
    }

    onConfirm({
      option: draftOption,
      hotelName:
        draftOption === "HOTEL_REST" ? draftHotelName.trim() : "",
      locationName:
        draftOption === "AIRPORT_LOUNGE" ||
        draftOption === "RESTAURANT_REST" ||
        draftOption === "OTHER_LOCATION"
          ? draftLocationName.trim()
          : "",
      restMinutes: minutes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-field="transportEarlyArrivalOption"
        className="sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Early-morning arrival preference</DialogTitle>
          <DialogDescription>
            Guest arrives before {TRANSPORT_EARLY_ARRIVAL_CUTOFF}.
            Choose where they would like to rest before sightseeing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          {CHOICES.map((choice) => (
            <button
              key={choice.option}
              type="button"
              aria-pressed={draftOption === choice.option}
              onClick={() => {
                setDraftOption(choice.option);
                setDraftRestMinutes(
                  choice.option === "HOTEL_REST"
                    ? TRANSPORT_DEFAULT_HOTEL_REST_MINUTES
                    : TRANSPORT_DEFAULT_REFRESHMENT_MINUTES,
                );
                setError("");
              }}
              className={
                draftOption === choice.option
                  ? "rounded-lg border-2 border-purple-600 bg-white p-4 text-left"
                  : "rounded-lg border bg-white p-4 text-left"
              }
            >
              <div className="font-medium">{choice.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {choice.description}
              </div>
            </button>
          ))}
        </div>

        {draftOption === "REFRESHMENT_BEFORE_SIGHTSEEING" && (
          <p className="text-sm text-muted-foreground">
            Existing refreshment preference selected.
          </p>
        )}

        {draftOption === "HOTEL_REST" && (
          <div>
            <Label htmlFor="details-transport-hotel">
              Hotel name (optional)
            </Label>
            <Input
              id="details-transport-hotel"
              maxLength={255}
              value={draftHotelName}
              onChange={(event) =>
                setDraftHotelName(event.target.value)
              }
              placeholder="Enter hotel name"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Hotel availability and early check-in must be confirmed separately.
            </p>
          </div>
        )}

        {(draftOption === "AIRPORT_LOUNGE" ||
          draftOption === "RESTAURANT_REST" ||
          draftOption === "OTHER_LOCATION") && (
          <div>
            <Label htmlFor="details-transport-location">
              {draftOption === "AIRPORT_LOUNGE"
                ? "Lounge name (optional)"
                : draftOption === "RESTAURANT_REST"
                  ? "Restaurant name (optional)"
                  : "Preferred location"}
            </Label>
            <Input
              id="details-transport-location"
              maxLength={255}
              value={draftLocationName}
              onChange={(event) =>
                setDraftLocationName(event.target.value)
              }
              placeholder="Enter location name"
            />
          </div>
        )}

        {draftOption &&
          draftOption !== "REFRESHMENT_BEFORE_SIGHTSEEING" && (
            <div>
              <Label htmlFor="details-transport-rest-minutes">
                Rest duration (minutes)
              </Label>
              <Input
                id="details-transport-rest-minutes"
                type="number"
                min={30}
                max={720}
                value={draftRestMinutes}
                onChange={(event) =>
                  setDraftRestMinutes(Number(event.target.value))
                }
              />
            </div>
          )}

        {draftOption === "HOTEL_REST" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {TRANSPORT_EARLY_ARRIVAL_HOTEL_MESSAGE}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Sightseeing timing and travel feasibility remain subject to
          the itinerary's scheduling rules.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!draftOption}
          >
            Use this preference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
