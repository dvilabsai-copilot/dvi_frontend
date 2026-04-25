import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Copy, FileSpreadsheet, FileText } from "lucide-react";
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
import { AutoSuggestSelect, AutoSuggestOption } from "@/components/AutoSuggestSelect";

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
const [pageLoading, setPageLoading] = useState(true);
const [viaRoutesLoading, setViaRoutesLoading] = useState(false);
const [viaRouteLookupLoading, setViaRouteLookupLoading] = useState(false);
const [lastViaRouteLookupValue, setLastViaRouteLookupValue] = useState("");
const [viaRouteSaving, setViaRouteSaving] = useState(false);
const [viaRouteDeleting, setViaRouteDeleting] = useState(false);

    const [viaRoutes, setViaRoutes] = useState<ViaRouteRow[]>([]);
  const [viaRouteDraft, setViaRouteDraft] = useState("");
  const [routeDraft, setRouteDraft] = useState("");
  const [routeSuggestions, setRouteSuggestions] = useState<string[]>([]);
  const [suggestedRoutes, setSuggestedRoutes] = useState<SuggestedRouteRow[]>([]);
  //const [selectedSuggestions, setSelectedSuggestions] = useState<SuggestedRouteRow[]>([]);
    const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editingSuggestionForm, setEditingSuggestionForm] = useState({
    routes: "",
    no_of_nights: "",
    route_details: "",
  });
  const [addingSuggestionForm, setAddingSuggestionForm] = useState({
    routes: "",
    no_of_nights: "",
    route_details: "",
  });
  const [addingSuggestionDays, setAddingSuggestionDays] = useState<string[]>([]);
  const [editingSuggestionDays, setEditingSuggestionDays] = useState<string[]>([]);

  const [isAddSuggestionDetailsStep, setIsAddSuggestionDetailsStep] = useState(false);
    const [viaRouteDialogOpen, setViaRouteDialogOpen] = useState(false);
  const [editingViaRouteId, setEditingViaRouteId] = useState<number | null>(null);
    const [deleteViaRouteId, setDeleteViaRouteId] = useState<number | null>(null);
  const [addRouteModalOpen, setAddRouteModalOpen] = useState(false);
  const [deleteSuggestedRouteId, setDeleteSuggestedRouteId] = useState<string | null>(null);
  //const [lastViaRouteLookupValue, setLastViaRouteLookupValue] = useState("");
  const [viaRoutePageSize, setViaRoutePageSize] = useState(10);
  const [viaRouteCurrentPage, setViaRouteCurrentPage] = useState(1);
  const [suggestedRoutePageSize, setSuggestedRoutePageSize] = useState(10);
  const [suggestedRouteCurrentPage, setSuggestedRouteCurrentPage] = useState(1);
  const [viaRouteForm, setViaRouteForm] = useState({
    via_route_location: "",
    via_route_location_city: "",
    via_route_location_state: "",
    via_route_location_lattitude: "",
    via_route_location_longitude: "",
    distance_from_source_location: "",
    duration_from_source_location: "",
  });

  const sourceOptions: AutoSuggestOption[] = useMemo(
  () =>
    (sources || []).map((item) => ({
      value: item,
      label: item,
    })),
  [sources]
);

const destinationOptions: AutoSuggestOption[] = useMemo(
  () =>
    (destinations || [])
      .filter((item) => !selectedSource || item !== selectedSource)
      .map((item) => ({
        value: item,
        label: item,
      })),
  [destinations, selectedSource]
);
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

         await loadPreviewCollections(locationId);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load location data");
      } finally {
        setPageLoading(false);
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

 useEffect(() => {
  if (!viaRouteDialogOpen) return;
  if (!location?.location_ID) return;
  if (editingViaRouteId) return;

  const placeValue = viaRouteForm.via_route_location.trim();
  if (placeValue.length < 3) return;

  const timer = window.setTimeout(() => {
    autofillViaRoutePlaceDetails(placeValue);
  }, 800);

  return () => window.clearTimeout(timer);
}, [
  viaRouteDialogOpen,
  editingViaRouteId,
  viaRouteForm.via_route_location,
  location?.location_ID,
]);

useEffect(() => {
  async function reloadDestinationDropdown() {
    try {
      const dropdowns = await locationsApi.dropdowns({
        source: selectedSource,
      });

      setSources(dropdowns.sources || []);
      setDestinations(dropdowns.destinations || []);
    } catch (error) {
      console.error("Error loading filter dropdowns:", error);
    }
  }

  reloadDestinationDropdown();
}, [selectedSource]);
    async function loadPreviewCollections(locationId: number) {
  try {
    setViaRoutesLoading(true);

    const [viaRes, suggestedRes] = await Promise.all([
      locationsApi.getViaRoutes(locationId),
      locationsApi.getSuggestedRoutes(locationId),
    ]);

    setViaRoutes(viaRes.data || []);
    setSuggestedRoutes(suggestedRes.data || []);

    setViaRouteCurrentPage(1);
    setSuggestedRouteCurrentPage(1);
  } catch (err) {
    console.error("Error loading preview collections:", err);
    toast.error("Failed to load via routes");
  } finally {
    setViaRoutesLoading(false);
  }
}
      const resetAddSuggestionState = () => {
    setIsAddSuggestionDetailsStep(false);
    setAddingSuggestionForm({
      routes: "",
      no_of_nights: "",
      route_details: "",
    });
    setAddingSuggestionDays([]);
  };

    const buildRouteNameFromEndpoints = () => {
    const source = selectedSource.trim();
    const destination = selectedDestination.trim();

    if (source && destination) {
      return `${source} - ${destination}`;
    }

    return source || destination || "";
  };

  const parseRouteDetailsToDays = (value: string, nightsValue?: string) => {
    const items = value
      .split(/\r?\n|→|,/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const totalNights = Math.max(Number(nightsValue || items.length || 0), 0);

    if (!totalNights) return [];

    return Array.from({ length: totalNights }, (_, index) => items[index] || "");
  };

  const resizeSuggestionDays = (
    countValue: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const total = Math.max(Number(countValue || 0), 0);

    setter((prev) => {
      if (!total) return [];
      return Array.from({ length: total }, (_, index) => prev[index] || "");
    });
  };

  const resetViaRouteForm = () => {
    setViaRouteForm({
      via_route_location: "",
      via_route_location_city: "",
      via_route_location_state: "",
      via_route_location_lattitude: "",
      via_route_location_longitude: "",
      distance_from_source_location: "",
      duration_from_source_location: "",
    });
  };

  const autofillViaRoutePlaceDetails = async (place: string) => {
  if (!location) return;

  const placeValue = place.trim();
  if (!placeValue) return;

  const normalizedPlace = placeValue.toLowerCase();

  if (viaRouteLookupLoading) return;
  if (lastViaRouteLookupValue === normalizedPlace) return;

  try {
    setViaRouteLookupLoading(true);
    setLastViaRouteLookupValue(normalizedPlace);

    const result = await locationsApi.lookupViaRoutePlace(
      location.location_ID,
      placeValue
    );

    if (!result.found || !result.data) return;

    setViaRouteForm((prev) => {
      if (prev.via_route_location.trim().toLowerCase() !== normalizedPlace) {
        return prev;
      }

      return {
        ...prev,
        via_route_location_city:
          result.data.via_route_location_city || prev.via_route_location_city,
        via_route_location_state:
          result.data.via_route_location_state || prev.via_route_location_state,
        via_route_location_lattitude:
          result.data.via_route_location_lattitude || prev.via_route_location_lattitude,
        via_route_location_longitude:
          result.data.via_route_location_longitude || prev.via_route_location_longitude,
        distance_from_source_location:
          result.data.distance_from_source_location || prev.distance_from_source_location,
        duration_from_source_location:
          result.data.duration_from_source_location || prev.duration_from_source_location,
      };
    });
  } catch (error) {
    console.error("Error fetching via route place details:", error);
  } finally {
    setViaRouteLookupLoading(false);
  }
};
  

   
   // Get Info button handler
   const openAddViaRouteDialog = () => {
  if (!location) {
    toast.warning("Please load a location first");
    return;
  }

  setEditingViaRouteId(null);
  setLastViaRouteLookupValue("");
  setViaRouteForm({
    via_route_location: viaRouteDraft.trim(),
    via_route_location_city: "",
    via_route_location_state: "",
    via_route_location_lattitude: "",
    via_route_location_longitude: "",
    distance_from_source_location: "",
    duration_from_source_location: "",
  });

  setViaRouteDialogOpen(true);
};
 const openEditViaRouteDialog = (item: ViaRouteRow) => {
  setEditingViaRouteId(item.via_route_location_ID);
  setLastViaRouteLookupValue("");
  setViaRouteForm({
    via_route_location: item.via_route_location || "",
    via_route_location_city: item.via_route_location_city || "",
    via_route_location_state: item.via_route_location_state || "",
    via_route_location_lattitude: item.via_route_location_lattitude || "",
    via_route_location_longitude: item.via_route_location_longitude || "",
    distance_from_source_location: item.distance_from_source_to_via_route || "",
    duration_from_source_location: item.duration_from_source_to_via_route || "",
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

  try {
    setViaRouteSaving(true);

    const payload = {
      via_route_location: viaRouteForm.via_route_location.trim(),
      via_route_location_city: viaRouteForm.via_route_location_city.trim(),
      via_route_location_state: viaRouteForm.via_route_location_state.trim(),
      via_route_location_lattitude: viaRouteForm.via_route_location_lattitude.trim(),
      via_route_location_longitude: viaRouteForm.via_route_location_longitude.trim(),
      distance_from_source_location: viaRouteForm.distance_from_source_location.trim(),
      duration_from_source_location: viaRouteForm.duration_from_source_location.trim(),
    };

    const result = editingViaRouteId
      ? await locationsApi.updateViaRoute(
          location.location_ID,
          editingViaRouteId,
          payload
        )
      : await locationsApi.addViaRoute(location.location_ID, payload);

setViaRoutes(result.data || []);
setViaRouteDraft("");
setViaRouteDialogOpen(false);
setLastViaRouteLookupValue("");
setEditingViaRouteId(null);
resetViaRouteForm();

    toast.success(editingViaRouteId ? "Via route updated" : "Via route added");
  } catch (error) {
    console.error("Error saving via route:", error);
    toast.error("Failed to save via route");
  } finally {
    setViaRouteSaving(false);
  }
};

  const handleCopyViaRoutes = () => {
    const headers = ["S.NO", "VIA ROUTE LOCATION", "CITY", "STATE", "LATITUDE", "LONGITUDE"];
    const rows = viaRoutes.map((route, idx) => [
      String(idx + 1),
      route.via_route_location || "—",
      route.via_route_location_city || "—",
      route.via_route_location_state || "—",
      route.via_route_location_lattitude || "—",
      route.via_route_location_longitude || "—",
    ]);
    const text = [
      headers.join("\t"),
      ...rows.map((row) => row.join("\t")),
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Via routes copied to clipboard");
  };

 const handleCopySuggestedRoutes = () => {
  const headers = ["S.NO", "ROUTES", "NO OF NIGHTS", "ROUTE DETAILS"];
  const rows = suggestedRoutes.map((route, idx) => [
    String(idx + 1),
    route.routes || "—",
    route.no_of_nights || "—",
    route.route_details || "—",
  ]);
  const text = [
    headers.join("\t"),
    ...rows.map((row) => row.join("\t")),
  ].join("\n");
  navigator.clipboard.writeText(text);
  toast.success("Suggested routes copied to clipboard");
};

const downloadFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeCsvValue = (value: string | number | null | undefined) => {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const handleExportViaRoutesCSV = () => {
  const headers = ["S.NO", "VIA ROUTE LOCATION", "CITY", "STATE", "LATITUDE", "LONGITUDE"];
  const rows = viaRoutes.map((route, idx) => [
    String(idx + 1),
    route.via_route_location || "—",
    route.via_route_location_city || "—",
    route.via_route_location_state || "—",
    route.via_route_location_lattitude || "—",
    route.via_route_location_longitude || "—",
  ]);

  const csv = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");

  downloadFile(csv, "via-routes.csv", "text/csv;charset=utf-8;");
  toast.success("Via routes CSV downloaded");
};

const handleExportViaRoutesExcel = () => {
  const headers = ["S.NO", "VIA ROUTE LOCATION", "CITY", "STATE", "LATITUDE", "LONGITUDE"];
  const rows = viaRoutes.map((route, idx) => [
    String(idx + 1),
    route.via_route_location || "—",
    route.via_route_location_city || "—",
    route.via_route_location_state || "—",
    route.via_route_location_lattitude || "—",
    route.via_route_location_longitude || "—",
  ]);

  const tableHtml = `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr>${row.map((cell) => `<td>${String(cell)}</td>`).join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  downloadFile(tableHtml, "via-routes.xls", "application/vnd.ms-excel");
  toast.success("Via routes Excel downloaded");
};

const handleExportSuggestedRoutesCSV = () => {
  const headers = ["S.NO", "ROUTES", "NO OF NIGHTS", "ROUTE DETAILS"];
  const rows = suggestedRoutes.map((route, idx) => [
    String(idx + 1),
    route.routes || "—",
    route.no_of_nights || "—",
    route.route_details || "—",
  ]);

  const csv = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");

  downloadFile(csv, "suggested-routes.csv", "text/csv;charset=utf-8;");
  toast.success("Suggested routes CSV downloaded");
};

const handleExportSuggestedRoutesExcel = () => {
  const headers = ["S.NO", "ROUTES", "NO OF NIGHTS", "ROUTE DETAILS"];
  const rows = suggestedRoutes.map((route, idx) => [
    String(idx + 1),
    route.routes || "—",
    route.no_of_nights || "—",
    route.route_details || "—",
  ]);

  const tableHtml = `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr>${row.map((cell) => `<td>${String(cell)}</td>`).join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  downloadFile(tableHtml, "suggested-routes.xls", "application/vnd.ms-excel");
  toast.success("Suggested routes Excel downloaded");
};

const handleDeleteViaRoute = async () => {
  if (!location || !deleteViaRouteId) return;

  try {
    setViaRouteDeleting(true);

    const result = await locationsApi.deleteViaRoute(
      location.location_ID,
      deleteViaRouteId
    );

    setViaRoutes(result.data || []);
    setDeleteViaRouteId(null);
    toast.success("Via route deleted");
  } catch (error) {
    console.error("Error deleting via route:", error);
    toast.error("Failed to delete via route");
  } finally {
    setViaRouteDeleting(false);
  }
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

      const handleAddToSuggestedRoutes = (route: string) => {
  const routeName = route.trim();
  if (!routeName) {
    toast.warning("Invalid route");
    return;
  }

  const alreadyExists = suggestedRoutes.some(
    (item) => item.routes.trim().toLowerCase() === routeName.toLowerCase()
  );

  if (alreadyExists) {
    toast.warning("This route is already added");
    return;
  }

  setAddingSuggestionForm({
    routes: buildRouteNameFromEndpoints(),
    no_of_nights: "",
    route_details: "",
  });
  setAddingSuggestionDays([]);
  setIsAddSuggestionDetailsStep(true);
};

const handleSaveNewSuggestedRoute = async () => {
  if (!location) {
    toast.warning("Please load a location first");
    return;
  }

  const routeName = buildRouteNameFromEndpoints();
  const totalNights = String(addingSuggestionForm.no_of_nights || "").trim();
  const routeDetails = addingSuggestionDays
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join(" → ");

  if (!routeName) {
    toast.warning("Source and destination are required");
    return;
  }

  if (!totalNights || Number(totalNights) <= 0) {
    toast.warning("Please enter total number of nights");
    return;
  }

  if (addingSuggestionDays.length !== Number(totalNights)) {
    toast.warning("Night-wise route fields are incomplete");
    return;
  }

  if (addingSuggestionDays.some((item) => !item.trim())) {
    toast.warning("Please fill all day-wise route locations");
    return;
  }

  try {
    const result = await locationsApi.addSuggestedRoute(location.location_ID, {
      routes: routeName,
      no_of_nights: totalNights,
      route_details: routeDetails,
    });

    setSuggestedRoutes(result.data);
    resetAddSuggestionState();
    setAddRouteModalOpen(false);
    toast.success("Route added");
  } catch (error) {
    console.error("Error adding suggested route:", error);
    toast.error("Failed to add suggested route");
  }
};

  const handleDeleteSelectedSuggestion = (id: string) => {
  setDeleteSuggestedRouteId(id);
};

const confirmDeleteSelectedSuggestion = async () => {
  if (!location || !deleteSuggestedRouteId) {
    toast.warning("Please load a location first");
    return;
  }

  try {
    const result = await locationsApi.deleteSuggestedRoute(
      location.location_ID,
      Number(deleteSuggestedRouteId)
    );

    setSuggestedRoutes(result.data);
    setDeleteSuggestedRouteId(null);
    toast.success("Route removed");
  } catch (error) {
    console.error("Error deleting suggested route:", error);
    toast.error("Failed to delete suggested route");
  }
};

    const handleEditSelectedSuggestion = (route: SuggestedRouteRow) => {
    setEditingSuggestionId(route.modify);
    setEditingSuggestionForm({
      routes: route.routes,
      no_of_nights: route.no_of_nights,
      route_details: route.route_details,
    });
    setEditingSuggestionDays(
      parseRouteDetailsToDays(route.route_details, route.no_of_nights)
    );
  };

   const handleSaveEditedSuggestion = async () => {
  if (!location || !editingSuggestionId) return;

  const routeName = buildRouteNameFromEndpoints();
  const totalNights = String(editingSuggestionForm.no_of_nights || "").trim();
  const routeDetails = editingSuggestionDays
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join(" → ");

  if (!routeName) {
    toast.warning("Source and destination are required");
    return;
  }

  if (!totalNights || Number(totalNights) <= 0) {
    toast.warning("Please enter total number of nights");
    return;
  }

  if (editingSuggestionDays.length !== Number(totalNights)) {
    toast.warning("Night-wise route fields are incomplete");
    return;
  }

  if (editingSuggestionDays.some((item) => !item.trim())) {
    toast.warning("Please fill all day-wise route locations");
    return;
  }

  try {
    const result = await locationsApi.updateSuggestedRoute(
      location.location_ID,
      Number(editingSuggestionId),
      {
        routes: routeName,
        no_of_nights: totalNights,
        route_details: routeDetails,
      }
    );

    setSuggestedRoutes(result.data);
    setEditingSuggestionId(null);
    setEditingSuggestionForm({
      routes: "",
      no_of_nights: "",
      route_details: "",
    });
    setEditingSuggestionDays([]);
    toast.success("Route updated");
  } catch (error) {
    console.error("Error updating suggested route:", error);
    toast.error("Failed to update suggested route");
  }
};
  const handleSuggestedRouteClick = async (route: string) => {
    if (!location) {
      toast.warning("Please load a location first");
      return;
    }

    const routeName = route.trim();
    if (!routeName) {
      toast.warning("Invalid suggested route");
      return;
    }

    const alreadyExists = viaRoutes.some(
      (item) =>
        item.via_route_location.trim().toLowerCase() ===
        routeName.toLowerCase()
    );

    if (alreadyExists) {
      toast.warning("This via route is already added");
      return;
    }

    const result = await locationsApi.addViaRoute(location.location_ID, {
      via_route_location: routeName,
      via_route_location_city: "",
      via_route_location_state: "",
      via_route_location_lattitude: "",
      via_route_location_longitude: "",
    });

    setViaRoutes(result.data);
    toast.success("Route added to via routes");
  };
  // Get Info button handler
          const handleGetInfo = async () => {
    if (!selectedSource || !selectedDestination) {
      toast.warning("Please select both source and destination");
      return;
    }

    try {
      setPageLoading(true);
      if (selectedSource === location?.source_location && selectedDestination === location?.destination_location) {
        const currentLocationId = Number(id);
        const locData = await locationsApi.get(currentLocationId);
        setLocation(locData);
        const tollsData = await locationsApi.tolls(currentLocationId);
        setTolls(tollsData);
        await loadPreviewCollections(currentLocationId);
      } else {
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
          await loadPreviewCollections(foundLocation.location_ID);
          toast.success("Location data loaded");
        } else {
          toast.warning("No location found for this source/destination pair");
        }
      }
    } catch (error) {
      console.error("Error getting info:", error);
      toast.error("Failed to load location data");
    } finally {
      setPageLoading(false);
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

 if (pageLoading) {
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
    <AutoSuggestSelect
      mode="single"
      value={selectedSource}
      onChange={(value) => {
        const nextValue = String(value || "");
        setSelectedSource(nextValue);
        setSelectedDestination("");
      }}
      options={sourceOptions}
      placeholder="Choose Source Location"
    />
  </div>

  <div>
    <label className="text-sm font-medium mb-2 block">Destination Location *</label>
    <AutoSuggestSelect
      mode="single"
      value={selectedDestination}
      onChange={(value) => setSelectedDestination(String(value || ""))}
      options={destinationOptions}
      placeholder="Choose Destination Location"
    />
  </div>

  <div className="flex items-end">
    <Button onClick={handleGetInfo} className="w-full">
      Get Info
    </Button>
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

      {/* Via Route List Section */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-pink-600">List Of Via Routes</h3>
          <Button
            type="button"
            size="sm"
            onClick={openAddViaRouteDialog}
            className="bg-pink-100 text-pink-600 hover:bg-pink-200"
          >
            + Add Via Route
          </Button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
            <select
              value={viaRoutePageSize}
              onChange={(e) => {
                setViaRoutePageSize(Number(e.target.value));
                setViaRouteCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm">entries</span>
          </div>

          <div className="flex items-center gap-2">
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleCopyViaRoutes}
    className="border-blue-600 text-blue-600 hover:bg-blue-50"
  >
    <Copy className="h-4 w-4 mr-2" />
    Copy
  </Button>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleExportViaRoutesExcel}
    className="border-green-600 text-green-600 hover:bg-green-50"
  >
    <FileSpreadsheet className="h-4 w-4 mr-2" />
    Excel
  </Button>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleExportViaRoutesCSV}
    className="border-orange-600 text-orange-600 hover:bg-orange-50"
  >
    <FileText className="h-4 w-4 mr-2" />
    CSV
  </Button>
</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">S.NO</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">VIA ROUTE LOCATION</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CITY</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">STATE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">LATITUDE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">LONGITUDE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {viaRoutes.length > 0 ? (
                viaRoutes
                  .slice(
                    (viaRouteCurrentPage - 1) * viaRoutePageSize,
                    viaRouteCurrentPage * viaRoutePageSize
                  )
                  .map((item, index) => (
                    <tr key={item.via_route_location_ID} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{(viaRouteCurrentPage - 1) * viaRoutePageSize + index + 1}</td>
                      <td className="px-4 py-3">{item.via_route_location || "—"}</td>
                      <td className="px-4 py-3">{item.via_route_location_city || "—"}</td>
                      <td className="px-4 py-3">{item.via_route_location_state || "—"}</td>
                      <td className="px-4 py-3">{item.via_route_location_lattitude || "—"}</td>
                      <td className="px-4 py-3">{item.via_route_location_longitude || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditViaRouteDialog(item)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteViaRouteId(item.via_route_location_ID)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    No via routes added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
          <span>
            Showing {viaRoutes.length === 0 ? 0 : (viaRouteCurrentPage - 1) * viaRoutePageSize + 1} to{" "}
            {Math.min(viaRouteCurrentPage * viaRoutePageSize, viaRoutes.length)} of {viaRoutes.length} entries
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViaRouteCurrentPage(Math.max(1, viaRouteCurrentPage - 1))}
              disabled={viaRouteCurrentPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => setViaRouteCurrentPage(1)}
              className={viaRouteCurrentPage === 1 ? "bg-purple-600 text-white" : ""}
            >
              1
            </Button>
            {Math.ceil(viaRoutes.length / viaRoutePageSize) > 1 && (
              <Button
                size="sm"
                onClick={() => setViaRouteCurrentPage(2)}
                className={viaRouteCurrentPage === 2 ? "bg-purple-600 text-white" : ""}
              >
                2
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setViaRouteCurrentPage(
                  Math.min(Math.ceil(viaRoutes.length / viaRoutePageSize), viaRouteCurrentPage + 1)
                )
              }
              disabled={viaRouteCurrentPage === Math.ceil(viaRoutes.length / viaRoutePageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Route Suggestions Section */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-pink-600">List Of Routes Suggestions</h3>
          <Button
            type="button"
            size="sm"
            onClick={() => {
  setAddRouteModalOpen(true);
  setIsAddSuggestionDetailsStep(false);
  setAddingSuggestionForm({
    routes: "",
            no_of_nights: "",
            route_details: "",
          });
}}
            className="bg-pink-100 text-pink-600 hover:bg-pink-200"
          >
            + Add Route
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
            <select
              value={suggestedRoutePageSize}
              onChange={(e) => {
                setSuggestedRoutePageSize(Number(e.target.value));
                setSuggestedRouteCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm">entries</span>
          </div>

         <div className="flex items-center gap-2">
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleCopySuggestedRoutes}
    className="border-blue-600 text-blue-600 hover:bg-blue-50"
  >
    <Copy className="h-4 w-4 mr-2" />
    Copy
  </Button>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleExportSuggestedRoutesExcel}
    className="border-green-600 text-green-600 hover:bg-green-50"
  >
    <FileSpreadsheet className="h-4 w-4 mr-2" />
    Excel
  </Button>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleExportSuggestedRoutesCSV}
    className="border-orange-600 text-orange-600 hover:bg-orange-50"
  >
    <FileText className="h-4 w-4 mr-2" />
    CSV
  </Button>
</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">S.NO</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ROUTES</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">NO OF NIGHTS</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ROUTE DETAILS</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ACTION</th>
              </tr>
            </thead>
            <tbody>
             {suggestedRoutes.length > 0 ? (
              suggestedRoutes
                  .slice(
                    (suggestedRouteCurrentPage - 1) * suggestedRoutePageSize,
                    suggestedRouteCurrentPage * suggestedRoutePageSize
                  )
                  .map((route, index) => (
                    <tr key={route.modify} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{(suggestedRouteCurrentPage - 1) * suggestedRoutePageSize + index + 1}</td>
                      <td className="px-4 py-3">{route.routes || "—"}</td>
                      <td className="px-4 py-3">{route.no_of_nights || "—"}</td>
                      <td className="px-4 py-3">{route.route_details || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSelectedSuggestion(route)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSelectedSuggestion(route.modify)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
          <span>
           Showing {suggestedRoutes.length === 0 ? 0 : (suggestedRouteCurrentPage - 1) * suggestedRoutePageSize + 1} to{" "}
{Math.min(suggestedRouteCurrentPage * suggestedRoutePageSize, suggestedRoutes.length)} of {suggestedRoutes.length} entries
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuggestedRouteCurrentPage(Math.max(1, suggestedRouteCurrentPage - 1))}
              disabled={suggestedRouteCurrentPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => setSuggestedRouteCurrentPage(1)}
              className={suggestedRouteCurrentPage === 1 ? "bg-purple-600 text-white" : ""}
            >
              1
            </Button>
            {Math.ceil(suggestedRoutes.length / suggestedRoutePageSize) > 1 && (
              <Button
                size="sm"
                onClick={() => setSuggestedRouteCurrentPage(2)}
                className={suggestedRouteCurrentPage === 2 ? "bg-purple-600 text-white" : ""}
              >
                2
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSuggestedRouteCurrentPage(
                  Math.min(Math.ceil(suggestedRoutes.length / suggestedRoutePageSize), suggestedRouteCurrentPage + 1)
                )
              }
              disabled={suggestedRouteCurrentPage === Math.ceil(suggestedRoutes.length / suggestedRoutePageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

            {viaRouteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
  {editingViaRouteId ? "Edit Via Route Details" : "Add Via Route Details"}
</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Place Location *</label>
  <LocationAutosuggestInput
      placeholder="Search location..."
     value={viaRouteForm.via_route_location}
  onValueChange={(value) =>
    setViaRouteForm((prev) => ({
      ...prev,
      via_route_location: value,
      via_route_location_city: "",
      via_route_location_state: "",
      via_route_location_lattitude: "",
      via_route_location_longitude: "",
      distance_from_source_location: "",
      duration_from_source_location: "",
    }))
  }
  search={(phrase) => locationsApi.searchDestinations(phrase)}
/>
<p className="mt-1 text-xs text-gray-500">
  If this place already exists in the database, city, state, latitude, longitude, distance and duration will autofill automatically.
</p>
{viaRouteLookupLoading && (
  <p className="mt-3 text-sm text-gray-500">Fetching stored place details...</p>
)}
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

              <div>
                <label className="text-sm font-medium mb-2 block">Distance from Source</label>
                <Input
                  value={viaRouteForm.distance_from_source_location}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      distance_from_source_location: e.target.value,
                    }))
                  }
                  placeholder="Enter distance from source"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Duration from Source</label>
                <Input
                  value={viaRouteForm.duration_from_source_location}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      duration_from_source_location: e.target.value,
                    }))
                  }
                  placeholder="Enter duration from source"
                />
              </div>
            </div>

            

            <div className="mt-6 flex justify-end gap-2">
              <Button
  variant="outline"
  onClick={() => {
    setViaRouteDialogOpen(false);
    setLastViaRouteLookupValue("");
    setEditingViaRouteId(null);
    resetViaRouteForm();
  }}
>
  Cancel
</Button>
              <Button onClick={saveViaRoute} disabled={viaRouteSaving}>
  {viaRouteSaving ? "Saving..." : "Save"}
</Button>
            </div>
          </div>
        </div>
      )}

            {deleteViaRouteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Delete Via Route</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Do you really want to delete this via route?
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteViaRouteId(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteViaRoute} disabled={viaRouteDeleting}>
                {viaRouteDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

            {deleteSuggestedRouteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Delete Suggested Route</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this suggested route?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteSuggestedRouteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteSelectedSuggestion}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingSuggestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Edit Route Suggestion</h3>

                  <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            {selectedSource || "Source"}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            {selectedDestination || "Destination"}
          </span>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Total No. of Nights</label>
          <Input
            type="number"
            min="0"
            value={editingSuggestionForm.no_of_nights}
            onChange={(e) => {
              const value = e.target.value;
              setEditingSuggestionForm((prev) => ({
                ...prev,
                no_of_nights: value,
              }));
              resizeSuggestionDays(value, setEditingSuggestionDays);
            }}
            placeholder="Enter total number of nights"
          />
        </div>

        {editingSuggestionDays.length > 0 && (
          <div className="space-y-3">
            {editingSuggestionDays.map((dayValue, index) => (
              <div key={index}>
                <label className="text-sm font-medium mb-2 block">
                  #{`Day ${index + 1}`}
                </label>
                <LocationAutosuggestInput
                  placeholder="Search location..."
                  value={dayValue}
                  onValueChange={(value) =>
                    setEditingSuggestionDays((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? value : item
                      )
                    )
                  }
                  search={(phrase) => locationsApi.searchDestinations(phrase)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setEditingSuggestionId(null);
            setEditingSuggestionForm({
              routes: "",
              no_of_nights: "",
              route_details: "",
            });
            setEditingSuggestionDays([]);
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSaveEditedSuggestion}>Save</Button>
      </div>
          </div>
        </div>
      )}

      {addRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
  {isAddSuggestionDetailsStep ? "Add Route Suggestion Details" : "Select Route Suggestion"}
</h3>

{!isAddSuggestionDetailsStep ? (
  <>
        {routeSuggestions.length > 0 ? (
      <div className="space-y-2">
        {routeSuggestions.map((route) => (
          <Button
            key={route}
            type="button"
            variant="outline"
            className="w-full justify-start text-left text-gray-700 border-gray-300 hover:bg-gray-50"
            onClick={() => handleAddToSuggestedRoutes(route)}
          >
            {route}
          </Button>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500 text-center py-4">
        No route suggestions available. You can still add a route manually.
      </p>
    )}

    <div className="mt-6 flex justify-end gap-2">
      <Button
        variant="outline"
        onClick={() => {
          resetAddSuggestionState();
          setIsAddSuggestionDetailsStep(true);
        }}
      >
        Add Manually
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          resetAddSuggestionState();
          setAddRouteModalOpen(false);
        }}
      >
        Close
      </Button>
    </div>
  </>
) : (
  <>
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
          {selectedSource || "Source"}
        </span>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {selectedDestination || "Destination"}
        </span>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Total No. of Nights</label>
        <Input
          type="number"
          min="0"
          value={addingSuggestionForm.no_of_nights}
          onChange={(e) => {
            const value = e.target.value;
            setAddingSuggestionForm((prev) => ({
              ...prev,
              no_of_nights: value,
            }));
            resizeSuggestionDays(value, setAddingSuggestionDays);
          }}
          placeholder="Enter total number of nights"
        />
      </div>

      {addingSuggestionDays.length > 0 && (
        <div className="space-y-3">
          {addingSuggestionDays.map((dayValue, index) => (
            <div key={index}>
              <label className="text-sm font-medium mb-2 block">
                #{`Day ${index + 1}`}
              </label>
              <LocationAutosuggestInput
                placeholder="Search location..."
                value={dayValue}
                onValueChange={(value) =>
                  setAddingSuggestionDays((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? value : item
                    )
                  )
                }
                search={(phrase) => locationsApi.searchDestinations(phrase)}
              />
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="mt-6 flex justify-end gap-2">
      <Button
        variant="outline"
        onClick={() => {
          resetAddSuggestionState();
        }}
      >
        Back
      </Button>
      <Button onClick={handleSaveNewSuggestedRoute}>
        Save
      </Button>
    </div>
  </>
)}
          </div>
        </div>
      )}

    </div>
  );
}
