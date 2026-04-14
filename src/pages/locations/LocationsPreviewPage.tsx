import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
//import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  locationsApi,
  LocationRow,
  SuggestedRouteRow,
  TollRow,
  ViaRouteRow,
} from "@/services/locations";
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

    const [viaRoutes, setViaRoutes] = useState<ViaRouteRow[]>([]);
  const [viaRouteDraft, setViaRouteDraft] = useState("");
  const [routeDraft, setRouteDraft] = useState("");
  const [routeSuggestions, setRouteSuggestions] = useState<string[]>([]);
  const [suggestedRoutes, setSuggestedRoutes] = useState<SuggestedRouteRow[]>([]);

  const [viaRouteDialogOpen, setViaRouteDialogOpen] = useState(false);
  const [viaRouteForm, setViaRouteForm] = useState({
    via_route_location: "",
    via_route_location_city: "",
    via_route_location_state: "",
    via_route_location_lattitude: "",
    via_route_location_longitude: "",
  });

  // Load dropdowns and initial data
  useEffect(() => {
    async function init() {
      try {
        const dropdowns = await locationsApi.dropdowns();
        setSources(dropdowns.sources || []);
        setDestinations(dropdowns.destinations || []);

                if (id) {
          const locationId = Number(id);

          const [locData, tollsData] = await Promise.all([
            locationsApi.get(locationId),
            locationsApi.tolls(locationId),
          ]);

          setLocation(locData);
          setSelectedSource(locData.source_location);
          setSelectedDestination(locData.destination_location);
          setTolls(tollsData);

          try {
            const viaRoutesData = await locationsApi.getViaRoutes(locationId);
            setViaRoutes(viaRoutesData.data);
          } catch (error) {
            console.error("Error loading via routes:", error);
            setViaRoutes([]);
          }

          try {
            const suggestedRoutesData =
              await locationsApi.getSuggestedRoutes(locationId);
            setSuggestedRoutes(suggestedRoutesData.data);
          } catch (error) {
            console.error("Error loading suggested routes:", error);
            setSuggestedRoutes([]);
          }
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
        const openAddViaRouteDialog = () => {
    if (!location) {
      toast.warning("Please load a location first");
      return;
    }

    setViaRouteForm({
      via_route_location: viaRouteDraft.trim(),
      via_route_location_city: "",
      via_route_location_state: "",
      via_route_location_lattitude: "",
      via_route_location_longitude: "",
    });

    setViaRouteDialogOpen(true);
  };

  const saveViaRoute = async () => {
    if (!location) {
      toast.warning("Please load a location first");
      return;
    }

    if (!viaRouteForm.via_route_location.trim()) {
      toast.warning("Please enter place location");
      return;
    }

    const result = await locationsApi.addViaRoute(location.location_ID, {
      via_route_location: viaRouteForm.via_route_location.trim(),
      via_route_location_city: viaRouteForm.via_route_location_city.trim(),
      via_route_location_state: viaRouteForm.via_route_location_state.trim(),
      via_route_location_lattitude: viaRouteForm.via_route_location_lattitude.trim(),
      via_route_location_longitude: viaRouteForm.via_route_location_longitude.trim(),
    });

    setViaRoutes(result.data);
    setViaRouteDraft("");
    setViaRouteDialogOpen(false);

    setViaRouteForm({
      via_route_location: "",
      via_route_location_city: "",
      via_route_location_state: "",
      via_route_location_lattitude: "",
      via_route_location_longitude: "",
    });

    toast.success("Via route added");
  };

  const addRoute = async () => {
    const nextValue = routeDraft.trim();
    if (!nextValue) {
      toast.warning("Please enter a route destination");
      return;
    }

    setSelectedDestination(nextValue);
    setRouteDraft("");

    const result = await locationsApi.list({
      source: selectedSource,
      destination: nextValue,
      page: 1,
      pageSize: 50,
    });

    if (result.rows.length > 0) {
      const foundLocation = result.rows[0];
      setLocation(foundLocation);
      const tollsData = await locationsApi.tolls(foundLocation.location_ID);
      setTolls(tollsData);
      toast.success("Route loaded");
      return;
    }

    toast.warning("No route found for this source/destination pair");
  };

  const handleSuggestedRouteClick = async (route: string) => {
    setSelectedDestination(route);

    const result = await locationsApi.list({
      source: selectedSource,
      destination: route,
      page: 1,
      pageSize: 50,
    });

    if (result.rows.length > 0) {
      const foundLocation = result.rows[0];
      setLocation(foundLocation);
      const tollsData = await locationsApi.tolls(foundLocation.location_ID);
      setTolls(tollsData);
      toast.success("Route loaded");
      return;
    }

    toast.warning("No route found for this source/destination pair");
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
            <div className="flex flex-col gap-3">
  <h4 className="font-medium">Via Route List</h4>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={openAddViaRouteDialog}
    className="w-full justify-start"
  >
    Add Via Route
  </Button>
</div>
            <div className="flex flex-col gap-2">
  {viaRoutes.length > 0 ? (
    viaRoutes.map((item) => (
      <div
        key={item.via_route_location_ID}
        className="rounded-md border px-3 py-2 text-sm"
      >
        <div className="font-medium">{item.via_route_location}</div>

        <div className="text-xs text-muted-foreground mt-1">
          {item.via_route_location_city || "—"} • {item.via_route_location_state || "—"}
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          Lat: {item.via_route_location_lattitude || "—"} | Lng: {item.via_route_location_longitude || "—"}
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          {item.distance_from_source_to_via_route || "—"} KM •{" "}
          {item.duration_from_source_to_via_route || "—"}
        </div>
      </div>
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
           placeholder="Type via route"
           value={viaRouteDraft}
           onValueChange={setViaRouteDraft}
           search={locationsApi.searchSources}
        />

                       <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
              {routeSuggestions.length > 0 ? (
                routeSuggestions.map((route) => (
                  <Button
                    key={route}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSuggestedRouteClick(route)}
                  >
                    {route}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No route suggestions available for this source.
                </p>
              )}

              {suggestedRoutes.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {suggestedRoutes.map((route) => (
                    <div
                      key={route.modify}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="font-medium">
                        {route.routes} • {route.no_of_nights} nights
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {route.route_details}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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

          {/* Via Route Details */}
          {viaRoutes.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <label className="text-xs text-gray-500 font-medium block mb-4">
                Via Route Details
              </label>

              <div className="space-y-4">
                {viaRoutes.map((item) => (
                  <div
                    key={item.via_route_location_ID}
                    className="rounded-md border p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place Location
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location || "—"}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place City
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location_city || "—"}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place State
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location_state || "—"}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place Latitude
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location_lattitude || "—"}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place Longitude
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location_longitude || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

            {viaRouteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Via Route Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Place Location *</label>
                <Input
                  value={viaRouteForm.via_route_location}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location: e.target.value,
                    }))
                  }
                  placeholder="Enter place location"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Place City</label>
                <Input
                  value={viaRouteForm.via_route_location_city}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location_city: e.target.value,
                    }))
                  }
                  placeholder="Enter place city"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Place State</label>
                <Input
                  value={viaRouteForm.via_route_location_state}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location_state: e.target.value,
                    }))
                  }
                  placeholder="Enter place state"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Place Latitude</label>
                <Input
                  value={viaRouteForm.via_route_location_lattitude}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location_lattitude: e.target.value,
                    }))
                  }
                  placeholder="Enter place latitude"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Place Longitude</label>
                <Input
                  value={viaRouteForm.via_route_location_longitude}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location_longitude: e.target.value,
                    }))
                  }
                  placeholder="Enter place longitude"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setViaRouteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveViaRoute}>Save</Button>
            </div>
          </div>
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
