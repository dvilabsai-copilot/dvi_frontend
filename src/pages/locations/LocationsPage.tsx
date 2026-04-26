// FILE: src/pages/locations/LocationsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Plus, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { locationsApi, LocationRow, TollRow } from "@/services/locations";
import { useNavigate } from "react-router-dom";
import { AddLocationDialog } from "./components/AddLocationDialog";
import { EditLocationDialog } from "./components/EditLocationDialog";
import { AutoSuggestSelect, AutoSuggestOption } from "@/components/AutoSuggestSelect";

const PAGE_SIZES = [10, 25, 50];

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
  const [source, setSource] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [search, setSearch] = useState("");

  const locationOptions: AutoSuggestOption[] = Array.from(
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
    }));

  const sourceOptions: AutoSuggestOption[] = locationOptions;

  const destinationOptions: AutoSuggestOption[] = locationOptions;
  const deleteLocationOptions: AutoSuggestOption[] = locationOptions;

  // dialogs
   const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<LocationRow | null>(null);
  const [selectedRow, setSelectedRow] = useState<LocationRow | null>(null);
  const [renameInfo, setRenameInfo] = useState<{
    open: boolean;
    row: LocationRow | null;
    scope: "source" | "destination";
  }>({ open: false, row: null, scope: "source" });
  const [deleteLocationOpen, setDeleteLocationOpen] = useState(false);
  const [deleteLocationName, setDeleteLocationName] = useState("");
  const [tollInfo, setTollInfo] = useState<{ open: boolean; row: LocationRow | null; items: TollRow[] }>({ open: false, row: null, items: [] });

  useEffect(() => {
    loadDropdowns();
  }, [source]);

  // fetch on page/pageSize/source/destination change
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, source, destination]);

  // debounced fetch on search change
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadList();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function loadDropdowns() {
  const d = await locationsApi.dropdowns({
    source,
  });

  setSources(d?.sources || []);
  setDestinations(d?.destinations || []);
}

  async function loadList() {
    const data = await locationsApi.list({ page, pageSize, source, destination, search });
    const normalized = Array.isArray(data?.rows) ? data.rows.map(normalizeRow) : [];
    setRows(normalized);
    setTotal(Number(data?.total ?? normalized.length));
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
    const rowToRename = selectedRow ?? rows[0] ?? null;

    if (!rowToRename) {
      toast.error("No location available to rename");
      return;
    }

    setSelectedRow(rowToRename);
    setRenameInfo({ open: true, row: rowToRename, scope: "source" });
  }

  function openDeleteLocationName() {
  setDeleteLocationName("");
  setDeleteLocationOpen(true);
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
    async function handleCreate(payload: Omit<LocationRow, "location_ID">) {
    const created = await locationsApi.create(payload);

    toast.success("Location added");
    setAddOpen(false);
    setPage(1);

    setRows((prev) => [created, ...prev]);
    setTotal((prev) => prev + 1);

    void loadList();
  }

  async function handleUpdate(payload: Partial<LocationRow>) {
    if (!editRow) return;
    await locationsApi.update(editRow.location_ID, payload);
    toast.success("Location updated");
    setEditRow(null);
    await loadList();
  }

  async function handleRename(new_name: string) {
    const { row, scope } = renameInfo;
    if (!row) return;
    await locationsApi.modifyName(row.location_ID, scope, new_name);
    toast.success("Location name updated");
    setRenameInfo({ open: false, row: null, scope: "source" });
    await loadList();
  }

   async function handleDeleteLocationName() {
  const locationName = deleteLocationName.trim();

  if (!locationName) {
    toast.error("Please select a location to delete");
    return;
  }

  const result = await locationsApi.deleteLocationName(locationName);

  setDeleteLocationOpen(false);
  setDeleteLocationName("");
  setSelectedRow(null);

  await loadDropdowns();
  await loadList();

  toast.success(
    `Deleted location: ${result.deletedLocation || locationName} (${result.deletedCount || 0} record${Number(result.deletedCount || 0) === 1 ? "" : "s"})`
  );
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">List of Locations</h1>
                      <div className="flex gap-2">
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
            Delete Location Name
          </Button>

          <Button variant="outline" onClick={openSelectedTolls}>
            <IndianRupee className="mr-2 h-4 w-4" />
            Toll Charges
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   
            <div>
  <div className="text-xs mb-1">Source Location *</div>
  <AutoSuggestSelect
    mode="single"
    value={source}
      onChange={(val) => {
      setSource((val as string) || "");
      setPage(1);
    }}
    options={sourceOptions}
    placeholder="Choose Source Location"
  />
</div>

          <div>
  <div className="text-xs mb-1">Destination Location *</div>
  <AutoSuggestSelect
    mode="single"
    value={destination}
    onChange={(val) => {
      setDestination((val as string) || "");
      setPage(1);
    }}
    options={destinationOptions}
    placeholder="Choose Destination Location"
  />
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
    setDeleteLocationName(r.source_location || r.destination_location || "");
    setDeleteLocationOpen(true);
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

      {/* Modify Name */}
      {renameInfo.open && renameInfo.row && (
               <SimpleRenameDialog
          open
          title="Update Location Name"
          currentName={renameInfo.scope === "source" ? renameInfo.row.source_location : renameInfo.row.destination_location}
          onClose={() => setRenameInfo({ open: false, row: null, scope: "source" })}
          onSubmit={handleRename}
        />
      )}

      {/* Delete confirm */}
      <DeleteLocationNameDialog
        open={deleteLocationOpen}
        value={deleteLocationName}
        options={deleteLocationOptions}
        onChange={setDeleteLocationName}
        onClose={() => {
          setDeleteLocationOpen(false);
          setDeleteLocationName("");
        }}
        onConfirm={handleDeleteLocationName}
      />

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
function SimpleConfirmDialog(props: {
  open: boolean;
  title: string;
  locationLabel: string;
  message: string;
  warning?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { open, title, locationLabel, message, warning, onConfirm, onClose } = props;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">{message}</div>

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
            {locationLabel}
          </div>

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
          <Button variant="destructive" onClick={onConfirm}>
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
        <div className="border rounded-md">
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
