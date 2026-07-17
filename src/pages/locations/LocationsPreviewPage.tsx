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
import { LocationsPreviewView } from "./LocationsPreviewView";
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
  const [routeSuggestionSearch, setRouteSuggestionSearch] = useState("");
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
const viaRoutePlaceOptions = useMemo(
  () =>
    Array.from(
      new Set(
        [
          ...(sources || []),
          ...(destinations || []),
          selectedSource,
          selectedDestination,
          ...(routeSuggestions || []),
        ]
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b)),
  [sources, destinations, selectedSource, selectedDestination, routeSuggestions]
);
const suggestionDayOptions: AutoSuggestOption[] = useMemo(
  () =>
    viaRoutePlaceOptions.map((item) => ({
      value: item,
      label: item,
    })),
  [viaRoutePlaceOptions]
);
const filteredRouteSuggestions = useMemo(() => {
  const query = routeSuggestionSearch.trim().toLowerCase();
  if (!query) return routeSuggestions;
  return routeSuggestions.filter((route) =>
    route.toLowerCase().includes(query)
  );
}, [routeSuggestions, routeSuggestionSearch]);
const viaRouteTotalPages = Math.max(
  1,
  Math.ceil(viaRoutes.length / viaRoutePageSize)
);
const suggestedRouteTotalPages = Math.max(
  1,
  Math.ceil(suggestedRoutes.length / suggestedRoutePageSize)
);
type PaginationItem = number | "ellipsis";
const getCompactPaginationItems = (
  totalPages: number,
  currentPage: number
): PaginationItem[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
};
const renderHighlightedRouteSuggestion = (route: string) => {
  const query = routeSuggestionSearch.trim();
  if (!query) return route;
  const normalizedQuery = query.toLowerCase();
  const tokens = route.split(/(\s+|[,()/-]+)/g);
  return (
    <>
      {tokens.map((token, index) => {
        const isMatch =
          /[a-z0-9]/i.test(token) && token.toLowerCase().includes(normalizedQuery);
        if (!isMatch) {
          return <span key={`${token}-${index}`}>{token}</span>;
        }
        return (
          <span
            key={`${token}-${index}`}
            className="rounded bg-purple-100 px-0.5 font-medium text-purple-800"
          >
            {token}
          </span>
        );
      })}
    </>
  );
};
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
useEffect(() => {
  setViaRouteCurrentPage((prev) => Math.min(prev, viaRouteTotalPages));
}, [viaRouteTotalPages]);
useEffect(() => {
  setSuggestedRouteCurrentPage((prev) => Math.min(prev, suggestedRouteTotalPages));
}, [suggestedRouteTotalPages]);
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
    setRouteSuggestionSearch("");
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
      .split(/\r?\n|â†’|,/g)
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
    const normalizeSuggestionLocationKey = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const buildSuggestionLocationKeys = (value: string) => {
    const trimmed = String(value || "").trim();
    const fullKey = normalizeSuggestionLocationKey(trimmed);
    const firstTokenKey = normalizeSuggestionLocationKey(
      trimmed.split(",")[0] || ""
    );
    return Array.from(
      new Set([fullKey, firstTokenKey].filter((item) => item.length > 0))
    );
  };
  const validateSuggestionDayLocations = async (days: string[]) => {
    const values = days
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (values.length === 0) return true;
    try {
      const dropdowns = await locationsApi.dropdowns();
      const backendLocations = [
        ...(dropdowns.sources || []),
        ...(dropdowns.destinations || []),
        selectedSource,
        selectedDestination,
        ...(viaRoutePlaceOptions || []),
      ];
      const backendSet = new Set<string>();
      backendLocations.forEach((locationName) => {
        buildSuggestionLocationKeys(String(locationName || "")).forEach((key) => {
          backendSet.add(key);
        });
      });
      const invalidLocations = Array.from(
        new Set(
          values.filter((item) => {
            const itemKeys = buildSuggestionLocationKeys(item);
            return !itemKeys.some((key) => backendSet.has(key));
          })
        )
      );
      if (invalidLocations.length > 0) {
        toast.error(
          `Not found in backend locations: ${invalidLocations.join(", ")}`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error validating route locations:", error);
      toast.error("Could not validate locations with backend");
      return false;
    }
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
      route.via_route_location || "â€”",
      route.via_route_location_city || "â€”",
      route.via_route_location_state || "â€”",
      route.via_route_location_lattitude || "â€”",
      route.via_route_location_longitude || "â€”",
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
    route.routes || "â€”",
    route.no_of_nights || "â€”",
    route.route_details || "â€”",
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
    route.via_route_location || "â€”",
    route.via_route_location_city || "â€”",
    route.via_route_location_state || "â€”",
    route.via_route_location_lattitude || "â€”",
    route.via_route_location_longitude || "â€”",
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
    route.via_route_location || "â€”",
    route.via_route_location_city || "â€”",
    route.via_route_location_state || "â€”",
    route.via_route_location_lattitude || "â€”",
    route.via_route_location_longitude || "â€”",
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
    route.routes || "â€”",
    route.no_of_nights || "â€”",
    route.route_details || "â€”",
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
    route.routes || "â€”",
    route.no_of_nights || "â€”",
    route.route_details || "â€”",
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
    .join(" â†’ ");
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
  const areDayLocationsValid = await validateSuggestionDayLocations(
    addingSuggestionDays
  );
  if (!areDayLocationsValid) {
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
    .join(" â†’ ");
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
  const areDayLocationsValid = await validateSuggestionDayLocations(
    editingSuggestionDays
  );
  if (!areDayLocationsValid) {
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
  const locationsViewContext = {
    addRouteModalOpen,
    addingSuggestionDays,
    addingSuggestionForm,
    confirmDeleteSelectedSuggestion,
    deleteSuggestedRouteId,
    destinationOptions,
    editingSuggestionDays,
    editingSuggestionForm,
    editingViaRouteId,
    filteredRouteSuggestions,
    getCompactPaginationItems,
    handleCopySuggestedRoutes,
    handleCopyViaRoutes,
    handleDeleteSelectedSuggestion,
    handleDeleteViaRoute,
    handleExportSuggestedRoutesCSV,
    handleExportSuggestedRoutesExcel,
    handleExportViaRoutesCSV,
    handleExportViaRoutesExcel,
    handleGetInfo,
    handleAddToSuggestedRoutes,
    handleEditSelectedSuggestion,
    handleSaveEditedSuggestion,
    handleSaveNewSuggestedRoute,
    handleUpdateTolls,
    isAddSuggestionDetailsStep,
    location,
    navigate,
    locationsApi,
    viaRoutes,
    editingSuggestionId,
    viaRouteDialogOpen,
    deleteViaRouteId,
    setViaRouteDialogOpen,
    setDeleteViaRouteId,
    setEditingSuggestionId,
    openAddViaRouteDialog,
    resetAddSuggestionState,
    openEditViaRouteDialog,
    pageLoading,
    renderHighlightedRouteSuggestion,
    resetViaRouteForm,
    resizeSuggestionDays,
    routeSuggestionSearch,
    routeSuggestions,
    saveViaRoute,
    selectedDestination,
    selectedSource,
    setAddRouteModalOpen,
    setAddingSuggestionDays,
    setAddingSuggestionForm,
    setDeleteSuggestedRouteId,
    setEditingSuggestionDays,
    setEditingSuggestionForm,
    setEditingViaRouteId,
    setIsAddSuggestionDetailsStep,
    setLastViaRouteLookupValue,
    setRouteSuggestionSearch,
    setSelectedDestination,
    setSelectedSource,
    setSuggestedRouteCurrentPage,
    setSuggestedRoutePageSize,
    setTolls,
    setViaRouteCurrentPage,
    setViaRouteForm,
    setViaRoutePageSize,
    sourceOptions,
    suggestedRouteCurrentPage,
    suggestedRoutePageSize,
    suggestedRouteTotalPages,
    suggestedRoutes,
    suggestionDayOptions,
    tolls,
    viaRouteCurrentPage,
    viaRouteDeleting,
    viaRouteForm,
    viaRouteLookupLoading,
    viaRoutePageSize,
    viaRoutePlaceOptions,
    viaRouteSaving,
    viaRouteTotalPages
  };
  return <LocationsPreviewView context={locationsViewContext} />;
}
