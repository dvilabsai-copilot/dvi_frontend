import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationRow, locationsApi } from "@/services/locations";
import { LocationAutosuggestInput } from "./LocationAutosuggestInput";

interface EditLocationDialogProps {
  open: boolean;
  initial: LocationRow | null;
  onClose: () => void;
  onSubmit: (payload: Partial<LocationRow>) => void;
}

export function EditLocationDialog({ open, initial, onClose, onSubmit }: EditLocationDialogProps) {
  const [form, setForm] = useState<Partial<LocationRow>>({});

  useEffect(() => {
    if (initial) {
      setForm({
        source_location: initial.source_location,
        source_city: initial.source_city,
        source_state: initial.source_state,
        source_latitude: initial.source_latitude,
        source_longitude: initial.source_longitude,
        destination_location: initial.destination_location,
        destination_city: initial.destination_city,
        destination_state: initial.destination_state,
        destination_latitude: initial.destination_latitude,
        destination_longitude: initial.destination_longitude,
        distance_km: initial.distance_km,
        duration_text: initial.duration_text,
        location_description: initial.location_description,
      });
    }
  }, [initial, open]);

  const handleChange = (field: keyof Partial<LocationRow>, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Update Location</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Row 1: Source Location, City, State (3 columns) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location *</label>
              <Input
                placeholder="Enter Source Location"
                value={form.source_location || ""}
                onChange={(e) => handleChange("source_location", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location City *</label>
              <LocationAutosuggestInput
                placeholder="Enter Source City"
                value={form.source_city || ""}
                onValueChange={(value) => handleChange("source_city", value)}
                search={locationsApi.searchCities}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location State *</label>
              <LocationAutosuggestInput
                placeholder="Enter Source State"
                value={form.source_state || ""}
                onValueChange={(value) => handleChange("source_state", value)}
                search={locationsApi.searchStates}
              />
            </div>
          </div>

          {/* Row 2: Source Latitude, Longitude, Destination Location (3 columns) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location Latitude *</label>
              <Input
                type="number"
                placeholder="Enter Latitude"
                value={form.source_latitude || ""}
                onChange={(e) => handleChange("source_latitude", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Location Longitude *</label>
              <Input
                type="number"
                placeholder="Enter Longitude"
                value={form.source_longitude || ""}
                onChange={(e) => handleChange("source_longitude", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Location *</label>
              <Input
                placeholder="Enter Destination Location"
                value={form.destination_location || ""}
                onChange={(e) => handleChange("destination_location", e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Destination City, State, Latitude (3 columns) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Location City *</label>
              <Input
                placeholder="Enter Destination City"
                value={form.destination_city || ""}
                onChange={(e) => handleChange("destination_city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Location State *</label>
              <Input
                placeholder="Enter Destination State"
                value={form.destination_state || ""}
                onChange={(e) => handleChange("destination_state", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Location Latitude *</label>
              <Input
                type="number"
                placeholder="Enter Destination Latitude"
                value={form.destination_latitude || ""}
                onChange={(e) => handleChange("destination_latitude", e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Destination Longitude, Distance, Duration (3 columns) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination Location Longitude *</label>
              <Input
                type="number"
                placeholder="Enter Destination Longitude"
                value={form.destination_longitude || ""}
                onChange={(e) => handleChange("destination_longitude", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Distance *</label>
              <Input
                type="number"
                placeholder="Enter Distance"
                value={form.distance_km || ""}
                onChange={(e) => handleChange("distance_km", Number(e.target.value || 0))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (In hours and minutes) *</label>
              <Input
                placeholder="e.g., 5 hours 22 mins"
                value={form.duration_text || ""}
                onChange={(e) => handleChange("duration_text", e.target.value)}
              />
            </div>
          </div>

          {/* Row 5: Description Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the Address"
              rows={3}
              value={form.location_description || ""}
              onChange={(e) => handleChange("location_description", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
