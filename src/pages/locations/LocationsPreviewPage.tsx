import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
//import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { locationsApi, LocationRow, TollRow } from "@/services/locations";
import { LocationAutosuggestInput } from "./components/LocationAutosuggestInput";

export default function LocationsPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [sources, setSources] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");

  const [location, setLocation] = useState<LocationRow | null>(null);
  const [tolls, setTolls] = useState<TollRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [viaRoutes, setViaRoutes] = useState<string[]>([]);
  const [viaRouteDraft, setViaRouteDraft] = useState("");
  const [routeDraft, setRouteDraft] = useState("");
  const [routeSuggestions, setRouteSuggestions] = useState<string[]>([]);

  // Load dropdowns and initial data
  useEffect(() => {
    async function init() {
      try {
        const dropdowns = await locationsApi.dropdowns();
        setSources(dropdowns.sources || []);
        setDestinations(dropdowns.destinations || []);

        if (id) {
          const locData = await locationsApi.get(Number(id));
          setLocation(locData);
          setSelectedSource(locData.source_location);
          setSelectedDestination(locData.destination_location);

          const tollsData = await locationsApi.tolls(Number(id));
          setTolls(tollsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load location data");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [id]);

    useEffect(() => {
    async function loadSuggestions() {
      if (!selectedSource.trim()) {
        setRouteSuggestions([]);
        return;
      }

      try {
        const suggestions = await locationsApi.getRouteSuggestions(
          selectedSource,
          selectedDestination
        );
        setRouteSuggestions(suggestions);
      } catch (error) {
        console.error("Error loading route suggestions:", error);
        setRouteSuggestions([]);
      }
    }

    loadSuggestions();
  }, [selectedSource, selectedDestination]);

   
   // Get Info button handler
    const addViaRoute = () => {
    const nextValue = viaRouteDraft.trim();
    if (!nextValue) return;

    setViaRoutes((prev) =>
      prev.includes(nextValue) ? prev : [...prev, nextValue]
    );
    setViaRouteDraft("");
  };

  const removeViaRoute = (value: string) => {
    setViaRoutes((prev) => prev.filter((item) => item !== value));
  };

  const addRoute = () => {
    const nextValue = routeDraft.trim();
    if (!nextValue) return;

    setSelectedDestination(nextValue);
    setRouteDraft("");
  };
  // Get Info button handler
  const handleGetInfo = async () => {
    if (!selectedSource || !selectedDestination) {
      toast.warning("Please select both source and destination");
      return;
    }

    try {
      setLoading(true);
      // If values match current location, just reload
      if (selectedSource === location?.source_location && selectedDestination === location?.destination_location) {
        const locData = await locationsApi.get(Number(id));
        setLocation(locData);
        const tollsData = await locationsApi.tolls(Number(id));
        setTolls(tollsData);
      } else {
        // Search for matching location in the list
        const result = await locationsApi.list({
          source: selectedSource,
          destination: selectedDestination,
          page: 1,
          pageSize: 50,
        });

        if (result.rows && result.rows.length > 0) {
          const foundLocation = result.rows[0];
          setLocation(foundLocation);
          const tollsData = await locationsApi.tolls(foundLocation.location_ID);
          setTolls(tollsData);
          toast.success("Location data loaded");
        } else {
          toast.warning("No location found for this source/destination pair");
        }
      }
    } catch (error) {
      console.error("Error getting info:", error);
      toast.error("Failed to load location data");
    } finally {
      setLoading(false);
    }
  };
  // Update toll charges
  const handleUpdateTolls = async () => {
    if (!location) {
      toast.warning("Please select a location first");
      return;
    }

    try {
      await locationsApi.saveTolls(
        location.location_ID,
        tolls.map((t) => ({
          vehicle_type_id: t.vehicle_type_id,
          toll_charge: Number(t.toll_charge || 0),
        }))
      );
      toast.success("Toll charges updated");
    } catch (error) {
      console.error("Error saving tolls:", error);
      toast.error("Failed to save toll charges");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading...</p>
      </div>
    );
  }

 

  

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <Button variant="outline" onClick={() => navigate("/locations")}>
        ← Back to List
      </Button>

      {/* Filter Bar */}
           <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4">Filter</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Source Location *</label>
            <LocationAutosuggestInput
              placeholder="Type source location"
              value={selectedSource}
              onValueChange={(value) => {
                setSelectedSource(value);
                setSelectedDestination("");
              }}
              search={locationsApi.searchSources}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Destination Location *</label>
            <LocationAutosuggestInput
              placeholder="Type destination location"
              value={selectedDestination}
              onValueChange={setSelectedDestination}
              search={(phrase) =>
                locationsApi.searchDestinations(phrase, selectedSource)
              }
            />
          </div>

          <div className="flex items-end">
            <Button onClick={handleGetInfo} className="w-full">
              Get Info
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Via Route List</h4>
              <Button type="button" variant="outline" size="sm" onClick={addViaRoute}>
                Add Via Route
              </Button>
            </div>

            <LocationAutosuggestInput
              placeholder="Type via route"
              value={viaRouteDraft}
              onValueChange={setViaRouteDraft}
              search={locationsApi.searchSources}
            />

            <div className="flex flex-wrap gap-2">
              {viaRoutes.length > 0 ? (
                viaRoutes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-md border px-3 py-1 text-sm"
                    onClick={() => removeViaRoute(item)}
                  >
                    {item} ×
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No via routes added yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Route Suggestions</h4>
              <Button type="button" variant="outline" size="sm" onClick={addRoute}>
                Add Route
              </Button>
            </div>

            <LocationAutosuggestInput
              placeholder="Type route destination"
              value={routeDraft}
              onValueChange={setRouteDraft}
              search={(phrase) =>
                locationsApi.searchDestinations(phrase, selectedSource)
              }
            />

            <div className="flex flex-wrap gap-2">
              {routeSuggestions.length > 0 ? (
                routeSuggestions.map((route) => (
                  <Button
                    key={route}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedDestination(route)}
                  >
                    {route}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No route suggestions available for this source.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Details Section */}
      {location && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-6 text-pink-600">Location Details</h3>
          <div className="grid grid-cols-4 gap-6">
            {/* Row 1: Source info */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Source</label>
              <p className="text-sm text-gray-700">{location.source_location}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Source Latitude</label>
              <p className="text-sm text-gray-700">{location.source_latitude}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Source Longitude</label>
              <p className="text-sm text-gray-700">{location.source_longitude}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Source City</label>
              <p className="text-sm text-gray-700">{location.source_city}</p>
            </div>

            {/* Row 2: Destination info */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Destination</label>
              <p className="text-sm text-gray-700">{location.destination_location}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Destination Latitude</label>
              <p className="text-sm text-gray-700">{location.destination_latitude}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Destination Longitude</label>
              <p className="text-sm text-gray-700">{location.destination_longitude}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Destination City</label>
              <p className="text-sm text-gray-700">{location.destination_city}</p>
            </div>

            {/* Row 3: Distance & Duration */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Distance</label>
              <p className="text-sm text-gray-700">{location.distance_km}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Duration</label>
              <p className="text-sm text-gray-700">{location.duration_text}</p>
            </div>
            <div></div>
            <div></div>
          </div>

          {/* Description if present */}
          {location.location_description && (
            <div className="mt-6 pt-6 border-t">
              <label className="text-xs text-gray-500 font-medium block mb-2">Description</label>
              <p className="text-sm text-gray-700">{location.location_description}</p>
            </div>
          )}
        </div>
      )}

      {/* Vehicle Toll Details Section */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-6 text-pink-600">Vehicle Toll Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {tolls.map((toll, idx) => (
            <div key={toll.vehicle_type_id} className="space-y-2">
              <label className="text-xs text-gray-600 font-medium capitalize block">{toll.vehicle_type_name}</label>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">₹</span>
                <Input
                  type="number"
                  className="flex-1"
                  value={String(toll.toll_charge || 0)}
                  onChange={(e) => {
                    const updated = [...tolls];
                    updated[idx] = { ...toll, toll_charge: Number(e.target.value || 0) };
                    setTolls(updated);
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-start">
          <Button onClick={handleUpdateTolls} className="bg-pink-600 hover:bg-pink-700 text-white">
            Update Toll Charges
          </Button>
        </div>
      </div>
    </div>
  );
}
