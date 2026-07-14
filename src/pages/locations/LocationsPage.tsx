// FILE: src/pages/locations/LocationsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Plus, IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { locationsApi, LocationRow, TollRow, CreateLocationPayload } from "@/services/locations";
import { useNavigate } from "react-router-dom";
import { AddLocationDialog } from "./components/AddLocationDialog";
import { EditLocationDialog } from "./components/EditLocationDialog";
import { AutoSuggestSelect, AutoSuggestOption } from "@/components/AutoSuggestSelect";
import { ItineraryPageLoader } from "../itinerary-details/components/ItineraryPageLoader";

const PAGE_SIZES = [10, 25, 50];
const MIN_SAME_LOCATION_DISTANCE_KM = 10;

// safe lowercase helper
const lo = (v: unknown) => (v === null || v === undefined ? "" : String(v)).toLowerCase();

// normalize a backend row to our UI shape (handles mismatched keys)
function normalizeRow(raw: any): LocationRow {
  return {
    location_ID: Number(raw.location_ID ?? raw.location_id ?? raw.id ?? 0),

    source_location: raw.source_location ?? "",
    source_city: raw.source_city ?? raw.source_location_city ?? "",
    source_state: raw.source_state ?? raw.source_location_state ?? "",
    source_latitude:
      raw.source_latitude ??
      raw.source_location_latitude ??
      raw.source_location_lattitude ?? // typo from API
      "",
    source_longitude:
      raw.source_longitude ??
      raw.source_location_longitude ??
      "",

    destination_location: raw.destination_location ?? "",
    destination_city: raw.destination_city ?? raw.destination_location_city ?? "",
    destination_state: raw.destination_state ?? raw.destination_location_state ?? "",
    destination_latitude:
      raw.destination_latitude ??
      raw.destination_location_latitude ??
      raw.destination_location_lattitude ?? // typo from API
      "",
    destination_longitude:
      raw.destination_longitude ??
      raw.destination_location_longitude ??
      "",

        distance_km: Number(raw.distance_km ?? raw.distance ?? 0),
    duration_text:
      String(raw.duration_text ?? raw.duration ?? "").trim() ||
      (
        String(raw.source_location ?? "").trim().toLowerCase() ===
          String(raw.destination_location ?? "").trim().toLowerCase() &&
        Number(raw.distance_km ?? raw.distance ?? 0) === 0
          ? "0 hours 0 mins"
          : ""
      ),

    location_description: raw.location_description ?? null,
  };
}

export default function LocationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sources, setSources] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);
  const [source, setSource] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const locationOptions: AutoSuggestOption[] = useMemo(
    () =>
      Array.from(
        new Set(
          [...sources, ...destinations]
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        )
      )
        .sort((a, b) => a.localeCompare(b))
        .map((item) => ({
          value: item,
          label: item,
        })),
    [sources, destinations]
  );

  const sourceOptions: AutoSuggestOption[] = locationOptions;

  const destinationOptions: AutoSuggestOption[] = locationOptions;

  // dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [locationAddProgress, setLocationAddProgress] = useState<{
    stage: string;
    detail: string;
    history: string[];
  } | null>(null);
  const [editRow, setEditRow] = useState<LocationRow | null>(null);
  const [selectedRow, setSelectedRow] = useState<LocationRow | null>(null);
  const [renameInfo, setRenameInfo] = useState<{
    open: boolean;
    row: LocationRow | null;
    scope: "source" | "destination";
  }>({ open: false, row: null, scope: "source" });
const [renameLocationOpen, setRenameLocationOpen] = useState(false);
const [renameOldName, setRenameOldName] = useState("");
const [renameNewName, setRenameNewName] = useState("");
const [renameDialogOptions, setRenameDialogOptions] = useState<AutoSuggestOption[]>([]);
const [deleteLocationOpen, setDeleteLocationOpen] = useState(false);
const [deleteLocationName, setDeleteLocationName] = useState("");
const [deleteDialogOptions, setDeleteDialogOptions] = useState<AutoSuggestOption[]>([]);
const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
const [deleteSelectedSource, setDeleteSelectedSource] = useState("");
const [deleteSelectedDestination, setDeleteSelectedDestination] = useState("");
const [deletePopupSelectedIds, setDeletePopupSelectedIds] = useState<number[]>([]);
const [deletePopupRows, setDeletePopupRows] = useState<LocationRow[]>([]);
const [deletePopupPage, setDeletePopupPage] = useState(1);
const [deletePopupPageSize, setDeletePopupPageSize] = useState(10);
const [deletePopupTotal, setDeletePopupTotal] = useState(0);
const [tollInfo, setTollInfo] = useState<{ open: boolean; row: LocationRow | null; items: TollRow[] }>({ open: false, row: null, items: [] });

  useEffect(() => {
    void loadDropdowns();
  }, []);

  // fetch on page/pageSize/source/destination change
  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, source, destination, debouncedSearch]);

  // debounced fetch on search change
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function loadDropdowns() {
    setDropdownsLoading(true);
    try {
      const d = await locationsApi.dropdowns();
      setSources(d?.sources || []);
      setDestinations(d?.destinations || []);
    } catch (error) {
      console.error("Error loading location dropdowns:", error);
      toast.error("Failed to load location filters");
      setSources([]);
      setDestinations([]);
    } finally {
      setDropdownsLoading(false);
    }
  }

  async function loadList() {
  const sourceValue = source.trim();
  const destinationValue = destination.trim();
  const sourceLower = sourceValue.toLowerCase();
  const sameLocationSelected =
    Boolean(sourceValue) &&
    Boolean(destinationValue) &&
    sourceLower === destinationValue.toLowerCase();

  if (!sameLocationSelected) {
    const data = await locationsApi.list({
      page,
      pageSize,
      source,
      destination,
      search: debouncedSearch,
    });

    const normalized = Array.isArray(data?.rows) ? data.rows : [];
    setRows(normalized);
    setTotal(Number(data?.total ?? normalized.length));
    return;
  }

  const exactData = await locationsApi.list({
    page,
    pageSize,
    source: sourceValue,
    destination: destinationValue,
    search: debouncedSearch,
  });

  const exactRows = Array.isArray(exactData?.rows) ? exactData.rows : [];

  if (exactRows.length || Number(exactData?.total ?? 0) > 0) {
    setRows(exactRows);
    setTotal(Number(exactData?.total ?? exactRows.length));
    return;
  }

  const sourceOnlyPageSize = 200;
  const firstPage = await locationsApi.list({
    page: 1,
    pageSize: sourceOnlyPageSize,
    source: sourceValue,
    destination: "",
    search: debouncedSearch,
  });

  const firstRows = Array.isArray(firstPage?.rows) ? firstPage.rows : [];
  const backendTotal = Number(firstPage?.total ?? firstRows.length);
  const backendTotalPages = Math.max(1, Math.ceil(backendTotal / sourceOnlyPageSize));

  let allRows = [...firstRows];

  for (let nextPage = 2; nextPage <= backendTotalPages; nextPage += 1) {
    const nextData = await locationsApi.list({
      page: nextPage,
      pageSize: sourceOnlyPageSize,
      source: sourceValue,
      destination: "",
      search: debouncedSearch,
    });

    const nextRows = Array.isArray(nextData?.rows) ? nextData.rows : [];
    if (!nextRows.length) break;
    allRows = allRows.concat(nextRows);
  }

  const sameLocationRows = allRows.filter((row) => {
    const rowSource = row.source_location.trim().toLowerCase();
    const rowDestination = row.destination_location.trim().toLowerCase();
    const distance = Number(row.distance_km || 0);

    return (
      rowSource === sourceLower &&
      rowDestination === sourceLower &&
      distance >= MIN_SAME_LOCATION_DISTANCE_KM
    );
  });

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  setRows(sameLocationRows.slice(startIndex, endIndex));
  setTotal(sameLocationRows.length);
}

function focusLocationRecords(sourceValue?: string, destinationValue?: string, searchValue?: string) {
  setPage(1);
  setSource(String(sourceValue || "").trim());
  setDestination(String(destinationValue || "").trim());
  setSearch(String(searchValue || "").trim());
  setDebouncedSearch(String(searchValue || "").trim());
}
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // client-side filter fallback (resilient if backend search is absent)
  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = lo(search);
    return rows.filter((r) =>
      [r.source_location, r.destination_location, r.source_city, r.destination_city]
        .some((v) => lo(v).includes(s))
    );
  }, [rows, search]);

  const currentPageRows = useMemo(() => rows, [rows]);

const deleteSelectedFilteredRows = useMemo(() => {
  if (!deleteSelectedOpen) return [];

  if (!deleteSelectedSource && !deleteSelectedDestination) {
    return currentPageRows;
  }

  return deletePopupRows;
}, [currentPageRows, deletePopupRows, deleteSelectedDestination, deleteSelectedOpen, deleteSelectedSource]);

const deleteSelectedFilteredIds = useMemo(
  () => deleteSelectedFilteredRows.map((row) => row.location_ID),
  [deleteSelectedFilteredRows]
);

const allDeletePopupRowsSelected =
  deleteSelectedFilteredIds.length > 0 &&
  deleteSelectedFilteredIds.every((id) => deletePopupSelectedIds.includes(id));

useEffect(() => {
  if (!deleteSelectedOpen) return;

  setDeletePopupSelectedIds((prev) =>
    prev.filter((id) => deleteSelectedFilteredIds.includes(id))
  );
}, [deleteSelectedOpen, deleteSelectedFilteredIds]);

useEffect(() => {
  if (!deleteSelectedOpen) return;

  const sourceValue = deleteSelectedSource.trim();
  const destinationValue = deleteSelectedDestination.trim();

  if (!sourceValue && !destinationValue) {
    setDeletePopupRows([]);
    return;
  }

  let cancelled = false;

  const loadDeletePopupRows = async () => {
    try {
      const result = await locationsApi.list({
        page: deletePopupPage,
        pageSize: deletePopupPageSize,
        source: sourceValue,
        destination: destinationValue,
      });

      if (cancelled) return;
      setDeletePopupRows(result.rows || []);
      setDeletePopupTotal(Number(result.total ?? result.rows?.length ?? 0));
    } catch (error) {
      if (cancelled) return;
      console.error("Error loading records for delete popup:", error);
      setDeletePopupRows([]);
      setDeletePopupTotal(0);
      toast.error("Failed to load matching records");
    }
  };

  void loadDeletePopupRows();

  return () => {
    cancelled = true;
  };
}, [deletePopupPage, deletePopupPageSize, deleteSelectedDestination, deleteSelectedOpen, deleteSelectedSource]);

useEffect(() => {
  if (!deleteLocationOpen) {
    setDeleteDialogOptions([]);
    return;
  }

  const frameId = window.requestAnimationFrame(() => {
    setDeleteDialogOptions(locationOptions);
  });

  return () => window.cancelAnimationFrame(frameId);
}, [deleteLocationOpen, locationOptions]);

useEffect(() => {
  if (!renameLocationOpen) {
    setRenameDialogOptions([]);
    return;
  }

  const frameId = window.requestAnimationFrame(() => {
    setRenameDialogOptions(locationOptions);
  });

  return () => window.cancelAnimationFrame(frameId);
}, [renameLocationOpen, locationOptions]);

  // ---------- handlers ----------
             function openModifyLocation() {
    const rowToEdit = selectedRow ?? rows[0] ?? null;

    if (!rowToEdit) {
      toast.error("No location available to modify");
      return;
    }

    setSelectedRow(rowToEdit);
    setEditRow(rowToEdit);
  }

  function openRenameLocation() {
  setRenameOldName("");
  setRenameNewName("");
  setRenameLocationOpen(true);
}

  function openDeleteLocationName() {
  setDeleteLocationName("");
  setDeleteLocationOpen(true);
}

function openDeleteSelectedRecords() {
  setDeleteSelectedSource("");
  setDeleteSelectedDestination("");
  setDeletePopupRows([]);
  setDeletePopupPage(1);
  setDeletePopupTotal(0);
  setDeletePopupSelectedIds(currentPageRows.map((row) => row.location_ID));
  setDeleteSelectedOpen(true);
}

function toggleDeletePopupRecord(id: number, checked: boolean) {
  setDeletePopupSelectedIds((prev) => {
    if (checked) {
      return prev.includes(id) ? prev : [...prev, id];
    }

    return prev.filter((item) => item !== id);
  });
}

function toggleAllDeletePopupRecords(checked: boolean) {
  setDeletePopupSelectedIds((prev) => {
    if (!checked) {
      return prev.filter((id) => !deleteSelectedFilteredIds.includes(id));
    }

    return Array.from(new Set([...prev, ...deleteSelectedFilteredIds]));
  });
}

  async function openSelectedTolls() {
    const rowForTolls = selectedRow ?? rows[0] ?? null;

    if (!rowForTolls) {
      toast.error("No location available for toll charges");
      return;
    }

    setSelectedRow(rowForTolls);
    await openTolls(rowForTolls);
  }
  async function handleCreate(payload: CreateLocationPayload) {
    const startingTotal = total;

    // Close the form immediately and use the same loader as itinerary details while
    // the API creates the replicated location rows.
    setAddOpen(false);
    setLocationAddProgress({
      stage: "Adding locations",
      detail: "Saving the new location and preparing replicated routes.",
      history: ["Saving location"],
    });

    try {
      const created = await locationsApi.create(payload);
      const createdRows = created.rows;

      if (!createdRows.length) {
        setLocationAddProgress(null);
        void Promise.all([loadDropdowns(), loadList()]);
        toast.success("No new locations were added");
        return;
      }

      const totalToAdd = createdRows.length;

      // The POST response already contains every replicated row. Do not animate
      // through hundreds of rows after the response has completed.
      const firstCreatedRow = createdRows[0];
      setRows((previous) => [
        firstCreatedRow,
        ...previous.filter((existing) => existing.location_ID !== firstCreatedRow.location_ID),
      ]);
      setTotal(startingTotal + totalToAdd);
      setLocationAddProgress(null);
      toast.success(
        `${totalToAdd} location${totalToAdd === 1 ? "" : "s"} added`
      );

      // Refresh the table and dropdowns without keeping the loader open.
      void Promise.all([loadDropdowns(), loadList()]);
    } catch (error) {
      console.error("Error adding locations:", error);
      setLocationAddProgress(null);
      toast.error("Failed to add locations");
    }
  }

  async function handleUpdate(payload: Partial<LocationRow>) {
    if (!editRow) return;

    const nextSource = String(payload.source_location ?? editRow.source_location ?? "").trim();
    const nextDestination = String(payload.destination_location ?? editRow.destination_location ?? "").trim();
    const nextDistance = Number(payload.distance_km ?? editRow.distance_km ?? 0);

    if (
      nextSource &&
      nextDestination &&
      nextSource.toLowerCase() === nextDestination.toLowerCase() &&
      nextDistance < MIN_SAME_LOCATION_DISTANCE_KM
    ) {
      toast.error(`When source and destination are the same, distance must be at least ${MIN_SAME_LOCATION_DISTANCE_KM} km.`);
      return;
    }

    const updated = await locationsApi.update(editRow.location_ID, payload);

toast.success("Location updated");
setEditRow(null);

focusLocationRecords(
  updated.source_location || nextSource,
  updated.destination_location || nextDestination,
  ""
);

await loadDropdowns();
  }

  async function handleRename(new_name: string) {
  const { row, scope } = renameInfo;
  if (!row) return;

  await locationsApi.modifyName(row.location_ID, scope, new_name);

  toast.success("Location name updated");
  setRenameInfo({ open: false, row: null, scope: "source" });

  focusLocationRecords("", "", new_name);

  await loadDropdowns();
}

  async function handleUpdateLocationName() {
  const oldName = renameOldName.trim();
  const newName = renameNewName.trim();

  if (!oldName) {
    toast.error("Please select the existing location name");
    return;
  }

  if (!newName) {
    toast.error("Please enter the new location name");
    return;
  }

  if (oldName.toLowerCase() === newName.toLowerCase()) {
    toast.error("Old and new location names cannot be the same");
    return;
  }

  const updatingToastId = toast.loading("Updating location name...");

  try {
    const result = await locationsApi.updateLocationName(oldName, newName, "both");

    setRenameLocationOpen(false);
    setRenameOldName("");
    setRenameNewName("");
    setSelectedRow(null);

toast.success(
  `Updated location name: ${result.oldName || oldName} → ${result.newName || newName} (${result.updatedCount || 0} record${Number(result.updatedCount || 0) === 1 ? "" : "s"})`,
  { id: updatingToastId }
);

focusLocationRecords("", "", result.newName || newName);

await loadDropdowns();
  } catch (error) {
    console.error("Error updating location name:", error);
    toast.error("Failed to update location name", { id: updatingToastId });
  }
}

   async function handleDeleteLocationName() {
  const locationName = deleteLocationName.trim();

  if (!locationName) {
    toast.error("Please select a location to delete");
    return;
  }

  const deletingToastId = toast.loading("Deleting location...");

  try {
    const result = await locationsApi.deleteLocationName(locationName);

    setDeleteLocationOpen(false);
    setDeleteLocationName("");
    setSelectedRow(null);

    toast.success(
      `Deleted location: ${result.deletedLocation || locationName} (${result.deletedCount || 0} record${Number(result.deletedCount || 0) === 1 ? "" : "s"})`,
      { id: deletingToastId }
    );

    void Promise.all([loadDropdowns(), loadList()]);
  } catch (error) {
    console.error("Error deleting location name:", error);
    toast.error("Failed to delete location", { id: deletingToastId });
  }
}

async function handleDeleteSelectedRecords(ids?: number[]) {
  const idsToDelete = [...(ids && ids.length ? ids : deletePopupSelectedIds)];

  if (!idsToDelete.length) {
    toast.error("Please select at least one record to delete");
    return;
  }

  const deletingToastId = toast.loading(
    `Deleting ${idsToDelete.length} selected record${idsToDelete.length === 1 ? "" : "s"}...`
  );

  try {
    await Promise.all(idsToDelete.map((id) => locationsApi.remove(id)));

    setDeleteSelectedOpen(false);
    setDeleteSelectedSource("");
    setDeleteSelectedDestination("");
    setDeletePopupRows([]);
    setDeletePopupPage(1);
    setDeletePopupTotal(0);
    setDeletePopupSelectedIds([]);
    setSelectedRow(null);

    toast.success(
      `Deleted ${idsToDelete.length} selected record${idsToDelete.length === 1 ? "" : "s"}`,
      {
        id: deletingToastId,
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            const restoreToastId = toast.loading(
              `Restoring ${idsToDelete.length} selected record${idsToDelete.length === 1 ? "" : "s"}...`
            );

            try {
              await Promise.all(idsToDelete.map((id) => locationsApi.restore(id)));
              toast.success(
                `Restored ${idsToDelete.length} selected record${idsToDelete.length === 1 ? "" : "s"}`,
                { id: restoreToastId }
              );
              void Promise.all([loadDropdowns(), loadList()]);
            } catch (error) {
              console.error("Error restoring selected records:", error);
              toast.error("Failed to restore selected records", { id: restoreToastId });
            }
          },
        },
      }
    );

    void Promise.all([loadDropdowns(), loadList()]);
  } catch (error) {
    console.error("Error deleting selected records:", error);
    toast.error("Failed to delete selected records", { id: deletingToastId });
  }
}

  async function openTolls(row: LocationRow) {
    const items = await locationsApi.tolls(row.location_ID);
    setTollInfo({ open: true, row, items });
  }
  async function saveTolls() {
    if (!tollInfo.row) return;
    await locationsApi.saveTolls(
      tollInfo.row.location_ID,
      tollInfo.items.map((i) => ({ vehicle_type_id: i.vehicle_type_id, toll_charge: Number(i.toll_charge || 0) }))
    );
    toast.success("Toll charges saved");
    setTollInfo({ open: false, row: null, items: [] });
  }

  if (locationAddProgress) {
    return <ItineraryPageLoader {...locationAddProgress} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
  <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Locations
          </Button>

          <Button variant="outline" onClick={openModifyLocation}>
            Modify Location
          </Button>

          <Button variant="outline" onClick={openRenameLocation}>
            Update Location Name
          </Button>

          <Button variant="outline" onClick={openDeleteLocationName}>
  Delete Location
</Button>

<Button variant="outline" onClick={openDeleteSelectedRecords}>
  Delete Selected Records
</Button>

<Button variant="outline" onClick={openSelectedTolls}>
            <IndianRupee className="mr-2 h-4 w-4" />
            Toll Charges
          </Button>
          <h1 className="text-2xl font-bold text-primary">List of Locations</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   
            <div>
  <div className="text-xs mb-1">Source Location *</div>
    {dropdownsLoading ? (
      <div className="h-9 px-3 rounded-md border border-[#e5d7f6] bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading source locations...
      </div>
    ) : (
      <AutoSuggestSelect
        mode="single"
        value={source}
        onChange={(val) => {
          setSource((val as string) || "");
          setPage(1);
        }}
        options={sourceOptions}
        placeholder="Choose Source Location"
        disabled={dropdownsLoading}
      />
    )}
</div>

          <div>
  <div className="text-xs mb-1">Destination Location *</div>
    {dropdownsLoading ? (
      <div className="h-9 px-3 rounded-md border border-[#e5d7f6] bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading destination locations...
      </div>
    ) : (
      <AutoSuggestSelect
        mode="single"
        value={destination}
        onChange={(val) => {
          setDestination((val as string) || "");
          setPage(1);
        }}
        options={destinationOptions}
        placeholder="Choose Destination Location"
        disabled={dropdownsLoading}
      />
    )}
</div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => { setSource(""); setDestination(""); setSearch(""); setPage(1); }}
            >
              Clear
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm">Search:</span>
              <Input className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search…" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-sm">entries</span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.NO</TableHead>
              <TableHead>ACTION</TableHead>
              <TableHead>SOURCE LOCATION</TableHead>
              <TableHead>DESTINATION LOCATION</TableHead>
              <TableHead>DISTANCE (KM)</TableHead>
              <TableHead>DURATION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, idx) => (
              <TableRow
                key={r.location_ID}
                onClick={() => setSelectedRow(r)}
                className={selectedRow?.location_ID === r.location_ID ? "bg-muted/50" : "cursor-pointer"}
              >
                <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/locations/${r.location_ID}/preview`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRow(r);
                        setEditRow(r);
                      }}
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteSelectedSource("");
                        setDeleteSelectedDestination("");
                        setDeletePopupSelectedIds([r.location_ID]);
                        setDeleteSelectedOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{r.source_location}</TableCell>
                <TableCell>{r.destination_location}</TableCell>
                <TableCell>{Number(r.distance_km ?? 0).toFixed(6)}</TableCell>
                <TableCell>{r.duration_text}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, search ? filtered.length : total)} of {search ? filtered.length : total} entries
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AddLocationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Edit Modal */}
      <EditLocationDialog
        open={!!editRow}
        initial={editRow}
        onClose={() => setEditRow(null)}
        onSubmit={(payload) => handleUpdate(payload)}
      />

      {/* Update Location Name */}
<UpdateLocationNameDialog
  open={renameLocationOpen}
  oldName={renameOldName}
  newName={renameNewName}
  options={renameDialogOptions}
  onOldNameChange={setRenameOldName}
  onNewNameChange={setRenameNewName}
  onClose={() => {
    setRenameLocationOpen(false);
    setRenameOldName("");
    setRenameNewName("");
  }}
  onConfirm={handleUpdateLocationName}
/>

 

      {/* Delete confirm */}
      <DeleteLocationNameDialog
        open={deleteLocationOpen}
        value={deleteLocationName}
        options={deleteDialogOptions}
        onChange={setDeleteLocationName}
        onClose={() => {
          setDeleteLocationOpen(false);
          setDeleteLocationName("");
        }}
        onConfirm={handleDeleteLocationName}
      />

      {deleteSelectedOpen && (
        <DeleteSelectedRecordsDialog
          open
          title="Delete Selected Records"
          selectedLabel={`${currentPageRows.length} record${currentPageRows.length === 1 ? "" : "s"} on page ${page}`}
          message="Do you really want to delete the selected location records?"
          warning="You can undo this immediately after deletion."
          source={deleteSelectedSource}
          destination={deleteSelectedDestination}
          sourceOptions={sourceOptions}
          destinationOptions={destinationOptions}
          rows={deleteSelectedFilteredRows}
          selectedIds={deletePopupSelectedIds}
          allSelected={allDeletePopupRowsSelected}
          onSourceChange={setDeleteSelectedSource}
          onDestinationChange={setDeleteSelectedDestination}
          onToggleRecord={toggleDeletePopupRecord}
          onToggleAll={toggleAllDeletePopupRecords}
          onClose={() => {
            setDeleteSelectedOpen(false);
            setDeleteSelectedSource("");
            setDeleteSelectedDestination("");
            setDeletePopupRows([]);
            setDeletePopupPage(1);
            setDeletePopupTotal(0);
            setDeletePopupSelectedIds([]);
          }}
          onConfirm={() =>
            handleDeleteSelectedRecords(
              deletePopupSelectedIds.filter((id) => deleteSelectedFilteredIds.includes(id))
            )
          }
          deletePopupPage={deletePopupPage}
          deletePopupPageSize={deletePopupPageSize}
          deletePopupTotal={deletePopupTotal}
          onDeletePopupPageChange={setDeletePopupPage}
          onDeletePopupPageSizeChange={(size) => {
            setDeletePopupPageSize(size);
            setDeletePopupPage(1);
          }}
          hasBackendFilter={Boolean(deleteSelectedSource || deleteSelectedDestination)}
        />
      )}

    

      {/* Toll charges */}
      {tollInfo.open && tollInfo.row && (
        <TollDialog
          open
          rows={tollInfo.items}
          title={`Toll Charges — ${tollInfo.row.source_location} → ${tollInfo.row.destination_location}`}
          onClose={() => setTollInfo({ open: false, row: null, items: [] })}
          onChange={(items) => setTollInfo((s) => ({ ...s, items }))}
          onSubmit={saveTolls}
        />
      )}
    </div>
  );
}

// ---------- Dialogs ----------
function DeleteSelectedRecordsDialog(props: {
  open: boolean;
  title: string;
  selectedLabel: string;
  message: string;
  warning?: string;
  source: string;
  destination: string;
  sourceOptions: AutoSuggestOption[];
  destinationOptions: AutoSuggestOption[];
  rows: LocationRow[];
  selectedIds: number[];
  allSelected: boolean;
  onSourceChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onToggleRecord: (id: number, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
  deletePopupPage?: number;
  deletePopupPageSize?: number;
  deletePopupTotal?: number;
  onDeletePopupPageChange?: (page: number) => void;
  onDeletePopupPageSizeChange?: (size: number) => void;
  hasBackendFilter?: boolean;
}) {
  const {
    open,
    title,
    selectedLabel,
    message,
    warning,
    source,
    destination,
    sourceOptions,
    destinationOptions,
    rows,
    selectedIds,
    allSelected,
    onSourceChange,
    onDestinationChange,
    onToggleRecord,
    onToggleAll,
    onConfirm,
    onClose,
  } = props;

  const deletePopupPage = (props as any).deletePopupPage ?? 1;
  const deletePopupPageSize = (props as any).deletePopupPageSize ?? 10;
  const deletePopupTotal = (props as any).deletePopupTotal ?? 0;
  const onDeletePopupPageChange = (props as any).onDeletePopupPageChange ?? (() => {});
  const onDeletePopupPageSizeChange = (props as any).onDeletePopupPageSizeChange ?? (() => {});
  const hasBackendFilter = (props as any).hasBackendFilter ?? false;
  const deletePopupTotalPages = Math.max(1, Math.ceil(deletePopupTotal / deletePopupPageSize));

  const selectedCount = rows.filter((row) => selectedIds.includes(row.location_ID)).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">{message}</div>

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
            {selectedLabel}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs">Source Location</div>
              <AutoSuggestSelect
                mode="single"
                value={source}
                onChange={(val) => onSourceChange((val as string) || "")}
                options={sourceOptions}
                placeholder="Choose Source Location"
                openOnFocus={false}
              />
            </div>
            <div>
              <div className="mb-1 text-xs">Destination Location</div>
              <AutoSuggestSelect
                mode="single"
                value={destination}
                onChange={(val) => onDestinationChange((val as string) || "")}
                options={destinationOptions}
                placeholder="Choose Destination Location"
                openOnFocus={false}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
              Matching records: {hasBackendFilter ? deletePopupTotal : rows.length} | Selected in popup: {selectedCount}
            </div>
            <div className="max-h-56 overflow-auto">
              {rows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => onToggleAll(e.target.checked)}
                          aria-label="Select all matching records in popup"
                        />
                      </TableHead>
                      <TableHead>S.NO</TableHead>
                      <TableHead>SOURCE LOCATION</TableHead>
                      <TableHead>DESTINATION LOCATION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={row.location_ID}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.location_ID)}
                            onChange={(e) => onToggleRecord(row.location_ID, e.target.checked)}
                            aria-label={`Select popup record ${row.location_ID}`}
                          />
                        </TableCell>
                        <TableCell>{(deletePopupPage - 1) * deletePopupPageSize + index + 1}</TableCell>
                        <TableCell>{row.source_location}</TableCell>
                        <TableCell>{row.destination_location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="px-3 py-5 text-center text-sm text-muted-foreground">
                  No selected records found for the chosen source/destination.
                </div>
              )}
            </div>
          </div>

          {hasBackendFilter && deletePopupTotal > 0 && (
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <Select value={String(deletePopupPageSize)} onValueChange={(v) => onDeletePopupPageSizeChange(Number(v))}>
                  <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 25].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletePopupPage === 1}
                  onClick={() => onDeletePopupPageChange(deletePopupPage - 1)}
                >
                  Previous
                </Button>
                <span className="px-2 py-1 text-xs">Page {deletePopupPage} of {deletePopupTotalPages}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletePopupPage >= deletePopupTotalPages}
                  onClick={() => onDeletePopupPageChange(deletePopupPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {warning ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {warning}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!selectedCount}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLocationNameDialog(props: {
  open: boolean;
  value: string;
  options: AutoSuggestOption[];
  onChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { open, value, options, onChange, onConfirm, onClose } = props;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Location</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Select the location you want to delete from the database.
          </div>

          <div>
            <div className="text-xs mb-1">Location *</div>
            <AutoSuggestSelect
              mode="single"
              value={value}
              onChange={(val) => onChange((val as string) || "")}
              options={options}
              placeholder="Choose Location"
              openOnFocus={false}
            />
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This will delete the selected location from stored locations.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateLocationNameDialog(props: {
  open: boolean;
  oldName: string;
  newName: string;
  options: AutoSuggestOption[];
  onOldNameChange: (value: string) => void;
  onNewNameChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const {
    open,
    oldName,
    newName,
    options,
    onOldNameChange,
    onNewNameChange,
    onConfirm,
    onClose,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Location Name</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Select the existing location name and enter the new name. This will update all matching source and destination records in the database.
          </div>

          <div>
            <div className="text-xs mb-1">Existing Location *</div>
            <AutoSuggestSelect
              mode="single"
              value={oldName}
              onChange={(val) => onOldNameChange((val as string) || "")}
              options={options}
              placeholder="Choose Existing Location"
              openOnFocus={false}
            />
          </div>

          <div>
            <div className="text-xs mb-1">New Location Name *</div>
            <Input
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
              placeholder="Enter New Location Name"
            />
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This will update the selected location name wherever it appears as Source Location or Destination Location.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimpleRenameDialog(props: { open: boolean; title: string; currentName: string; onSubmit: (v: string) => void; onClose: () => void }) {
  const { open, title, currentName, onSubmit, onClose } = props;
  const [value, setValue] = useState(currentName);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input value={value} onChange={(e) => setValue(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => onSubmit(value)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TollDialog(props: { open: boolean; title: string; rows: TollRow[]; onClose: () => void; onSubmit: () => void; onChange: (r: TollRow[]) => void }) {
  const { open, title, rows, onClose, onSubmit, onChange } = props;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle Type</TableHead>
                <TableHead className="text-right">Toll (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={r.vehicle_type_id}>
                  <TableCell>{r.vehicle_type_name}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      className="w-32 ml-auto"
                      type="number"
                      value={String(r.toll_charge ?? 0)}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        const next = [...rows];
                        next[idx] = { ...r, toll_charge: v };
                        onChange(next);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
