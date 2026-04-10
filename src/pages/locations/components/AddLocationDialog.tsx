import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateLocationPayload, locationsApi } from "@/services/locations";
import { LocationAutosuggestInput } from "./LocationAutosuggestInput";

interface AddLocationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateLocationPayload) => void;
}

export function AddLocationDialog({ open, onClose, onSubmit }: AddLocationDialogProps) {
  const [form, setForm] = useState<CreateLocationPayload>({
    source_location: "",
    source_city: "",
    source_state: "",
    source_latitude: "",
    source_longitude: "",
  });

    const parseLatLngPair = (value: string) => {
    const match = String(value || "")
      .trim()
      .match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);

    if (!match) return null;

    return {
      latitude: match[1],
      longitude: match[2],
    };
  };

  const handleCoordinatePaste =
    (latitudeField: keyof CreateLocationPayload, longitudeField: keyof CreateLocationPayload) =>
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData("text");
      const coords = parseLatLngPair(pastedText);

      if (!coords) return;

      e.preventDefault();

      setForm((prev) => ({
        ...prev,
        [latitudeField]: coords.latitude,
        [longitudeField]: coords.longitude,
      }));
    };

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit(form);
    setForm({
      source_location: "",
      source_city: "",
      source_state: "",
      source_latitude: "",
      source_longitude: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Add Location</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Row 1: Source Location, City, State (3 columns) */}
          <div className="grid grid-cols-3 gap-4">
                       <div className="space-y-2">
              <label className="text-sm font-medium">Source Location *</label>
              <LocationAutosuggestInput
                placeholder="Type Source Location"
                value={form.source_location}
                onValueChange={(value) => handleChange("source_location", value)}
                search={locationsApi.searchSources}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location City *</label>
              <LocationAutosuggestInput
                placeholder="Enter Source City"
                value={form.source_city}
                onValueChange={(value) => handleChange("source_city", value)}
                search={locationsApi.searchCities}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location State *</label>
              <LocationAutosuggestInput
                placeholder="Enter Source State"
                value={form.source_state}
                onValueChange={(value) => handleChange("source_state", value)}
                search={locationsApi.searchStates}
              />
            </div>
          </div>

          {/* Row 2: Latitude, Longitude (2 columns) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location Latitude *</label>
                           <Input
                type="text"
                inputMode="decimal"
                placeholder="Enter Latitude"
                value={form.source_latitude}
                onChange={(e) => handleChange("source_latitude", e.target.value)}
                onPaste={handleCoordinatePaste("source_latitude", "source_longitude")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location Longitude *</label>
                           <Input
                type="text"
                inputMode="decimal"
                placeholder="Enter Longitude"
                value={form.source_longitude}
                onChange={(e) => handleChange("source_longitude", e.target.value)}
                onPaste={handleCoordinatePaste("source_latitude", "source_longitude")}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
