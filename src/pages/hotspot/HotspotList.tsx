// FILE: src/pages/hotspot/HotspotList.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Upload,
  Copy as CopyIcon,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteModal } from "@/components/hotspot/DeleteModal";
import { hotspotService, HotspotListItem } from "@/services/hotspotService";
import { toast } from "sonner";

function to2D(rows: HotspotListItem[]) {
  const headers = [
    "S.NO",
    "HOTSPOT NAME",
    "HOTSPOT PRIORITY",
    "HOTSPOT PLACE (first 3)",
    "LOCAL (Adult/Child/Infant)",
    "FOREIGN (Adult/Child/Infant)",
  ];

  const data = rows.map((r, i) => [
    String(i + 1),
    r.name,
    String(r.priority ?? ""),
    r.places.slice(0, 3).join(" | "),
    (r.localHtml || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    (r.foreignHtml || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
  ]);

  return { headers, data };
}

function toCSV({ headers, data }: { headers: string[]; data: string[][] }) {
  const esc = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

  return [
    headers.map(esc).join(","),
    ...data.map((row) => row.map(esc).join(",")),
  ].join("\n");
}

function toHTMLTable({ headers, data }: { headers: string[]; data: string[][] }) {
  const th = headers
    .map(
      (h) =>
        `<th style="background:#f3f4f6;border:1px solid #e5e7eb;padding:6px 8px;text-align:left;">${h}</th>`
    )
    .join("");

  const trs = data
    .map(
      (row) =>
        `<tr>${row
          .map(
            (v) =>
              `<td style="border:1px solid #e5e7eb;padding:6px 8px;">${v}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Hotspots</title></head>
<body>
<table style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:12px;">
<thead><tr>${th}</tr></thead>
<tbody>${trs}</tbody>
</table>
</body>
</html>`;
}

function downloadBlob(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function getHotspotImageUrl(row: HotspotListItem): string {
  const rawImage = String(row.imageUrl || "").trim();

  if (!rawImage) {
    return "/placeholder.svg";
  }

  if (rawImage.startsWith("http")) {
    return rawImage;
  }

  if (rawImage.startsWith("/uploads/")) {
    return `${hotspotService.fileBase()}${rawImage}`;
  }

  if (rawImage.includes("uploads/")) {
    return `${hotspotService.fileBase()}/${rawImage.replace(/^\/+/, "")}`;
  }

  return `${hotspotService.fileBase()}/uploads/hotspot_gallery/${rawImage.replace(/^\/+/, "")}`;
}

function compareHotspotPriority(a: HotspotListItem, b: HotspotListItem) {
  const aPriority = Number(a.priority);
  const bPriority = Number(b.priority);
  const aAssigned = Number.isFinite(aPriority) && aPriority > 0;
  const bAssigned = Number.isFinite(bPriority) && bPriority > 0;

  if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
  if (aAssigned && aPriority !== bPriority) return aPriority - bPriority;

  return a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
    String(a.id).localeCompare(String(b.id), "en", { numeric: true });
}


async function fetchAllHotspotRows(): Promise<HotspotListItem[]> {
  const result: HotspotListItem[] = [];
  const seen = new Set<string>();
  for (let page = 1; ; page++) {
    const batch = await hotspotService.listHotspots(page);
    for (const row of batch) {
      if (seen.has(row.id)) {
        throw new Error("Hotspot list changed while loading. Please refresh.");
      }
      seen.add(row.id);
      result.push(row);
    }
    if (batch.length < 5000) return result;
  }
}

function HotspotPriorityInput({
  value, name, maximum, disabled, onSave,
}: {
  value: number;
  name: string;
  maximum: number;
  disabled: boolean;
  onSave: (priority: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    setDraft(String(value));
    dirty.current = false;
  }, [value]);

  const save = async () => {
    if (pending.current || disabled || !dirty.current) return;
    const text = draft.trim();
    const priority = Number(text);
    if (!text || !Number.isSafeInteger(priority) ||
        priority < 1 || priority > maximum) {
      toast.error("Enter a whole-number priority from 1 to " + maximum);
      setDraft(String(value));
      dirty.current = false;
      return;
    }

    pending.current = true;
    dirty.current = false;
    setSaving(true);
    try {
      await onSave(priority);
    } catch (error) {
      console.error(error);
      setDraft(String(value));
      toast.error("Could not confirm the priority save. Refresh before retrying.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <Input
        type="number"
        min={1}
        max={maximum}
        step={1}
        value={draft}
        readOnly={saving || disabled}
        aria-label={`Priority for ${name}`}
        aria-busy={saving}
        onChange={(event) => {
          dirty.current = true;
          setDraft(event.target.value);
        }}
        onBlur={() => { void save(); }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            dirty.current = false;
            setDraft(String(value));
          }
        }}
        className="w-20"
      />
      {saving && (
        <span role="status" className="text-xs text-muted-foreground">
          Saving...
        </span>
      )}
    </div>
  );
}

export default function HotspotList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [rows, setRows] = useState<HotspotListItem[]>([]);
  const prioritySaveLock = useRef(false);
  const loadVersion = useRef(0);
  const [prioritySaving, setPrioritySaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const prefill = String((location.state as any)?.prefillSearch || "").trim();

    if (!prefill) return;

    setSearch(prefill);
    toast.success(`Showing newly saved hotspot: ${prefill}`);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...rows].sort(compareHotspotPriority).filter(
      row => row.name.toLowerCase().includes(q) ||
        row.places.some(place => place.toLowerCase().includes(q))
    );
  }, [search, rows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize));
    setCurrentPage(page => Math.min(page, lastPage));
  }, [filtered.length, pageSize]);

  async function load() {
    const version = ++loadVersion.current;
    try {
      const data = await fetchAllHotspotRows();
      if (version !== loadVersion.current) return;
      setRows(data);
      setLoadFailed(false);
    } catch (error) {
      if (version !== loadVersion.current) return;
      console.error(error);
      setLoadFailed(true);
      toast.error("Failed to load hotspots. Please refresh.");
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await hotspotService.deleteHotspot(deleteId);
      toast.success("Hotspot deleted successfully");
      setDeleteId(null);
      load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete hotspot");
    }
  };


  const handlePriorityChange = async (id: string, priority: number) => {
    if (prioritySaveLock.current) {
      throw new Error("Another priority save is in progress.");
    }
    if (!Number.isSafeInteger(priority) || priority < 1 || priority > 2147483647) {
      throw new Error("Enter a whole-number priority from 1 to 2147483647.");
    }
    const query = search.trim().toLowerCase();
    prioritySaveLock.current = true;
    setPrioritySaving(true);
    ++loadVersion.current;

    try {
      await hotspotService.updatePriorityValue(id, priority);
      try {
        const data = await fetchAllHotspotRows();
        const saved = data.find(row => row.id === id);
        const ordered = [...data].sort(compareHotspotPriority).filter(row =>
          !query || row.name.toLowerCase().includes(query) ||
          row.places.some(place => place.toLowerCase().includes(query))
        );
        const index = ordered.findIndex(row => row.id === id);
        setRows(data);
        setCurrentPage(index < 0 ? 1 : Math.floor(index / pageSize) + 1);

        if (!saved || Number(saved.priority) !== priority) {
          setLoadFailed(true);
          toast.error("The saved priority could not be confirmed. Reload hotspots.");
          return;
        }
        setLoadFailed(false);
        toast.success("Hotspot priority saved: " + priority);
      } catch (error) {
        console.error(error);
        setLoadFailed(true);
        toast.error("Priority was saved, but the list could not reload. Refresh before editing again.");
      }
    } catch (error) {
      setLoadFailed(true);
      throw error;
    } finally {
      prioritySaveLock.current = false;
      setPrioritySaving(false);
    }
  };

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const canExport = filtered.length > 0;
  const dataset = useMemo(() => to2D(filtered), [filtered]);

  const onCopy = async () => {
    if (!canExport) return;

    const csv = toCSV(dataset);

    try {
      await navigator.clipboard.writeText(csv);
      toast.success("Copied table (filtered) to clipboard as CSV");
    } catch (error) {
      console.error(error);
      toast.error("Copy failed");
    }
  };

  const onCSV = () => {
    if (!canExport) return;

    const csv = toCSV(dataset);
    downloadBlob("hotspots.csv", "text/csv;charset=utf-8;", csv);
  };

  const onExcel = () => {
    if (!canExport) return;

    const html = toHTMLTable(dataset);
    downloadBlob("hotspots.xls", "application/vnd.ms-excel", html);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">List of Hotspot</h1>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-transparent transition-colors"
            onClick={() => navigate("/hotspots/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Hotspot
          </button>

          <button
            type="button"
            className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-transparent transition-colors"
            onClick={() => navigate("/parking-charge-bulk-import")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Parking charges
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>

            <Select
              value={String(pageSize)}
              disabled={prioritySaving}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-sm">entries</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Search:</span>
              <Input
                className="w-64"
                value={search}
                disabled={prioritySaving}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <button
              type="button"
              aria-label="Copy"
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold border ${
                canExport
                  ? "border-violet-300 text-violet-700 hover:bg-violet-50"
                  : "border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
              onClick={onCopy}
              disabled={!canExport}
            >
              <CopyIcon className="mr-2 h-4 w-4" />
              Copy
            </button>

            <button
              type="button"
              aria-label="Excel"
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold ${
                canExport
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-emerald-200 text-white cursor-not-allowed"
              }`}
              onClick={onExcel}
              disabled={!canExport}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </button>

            <button
              type="button"
              aria-label="CSV"
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold ${
                canExport
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              onClick={onCSV}
              disabled={!canExport}
            >
              <FileText className="mr-2 h-4 w-4" />
              CSV
            </button>
          </div>
        </div>

        {loadFailed && (
          <div role="alert" className="flex items-center gap-3 text-sm">
            <span>Reload the saved list before changing another priority.</span>
            <Button variant="outline" onClick={() => { void load(); }}>
              Reload hotspots
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.NO</TableHead>
              <TableHead>ACTION</TableHead>
              <TableHead>HOTSPOT IMAGE</TableHead>
              <TableHead>HOTSPOT NAME</TableHead>
              <TableHead title="Enter a saved priority. Multiple hotspots may share the same number.">HOTSPOT PRIORITY</TableHead>
              <TableHead>HOTSPOT PLACE</TableHead>
              <TableHead>LOCAL PERSON</TableHead>
              <TableHead>FOREIGN PERSON</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.map((r, index) => (
              <TableRow key={r.id}>
                <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>

                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/hotspots/${r.id}/preview`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
  size="sm"
  variant="ghost"
  asChild
>
  <Link
    to={`/hotspots/${r.id}/edit`}
    aria-label={`Edit ${r.name}`}
  >
    <Pencil className="h-4 w-4" />
  </Link>
</Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>

                <TableCell>
                  <img
                    src={getHotspotImageUrl(r)}
                    alt={r.name || "Hotspot"}
                    className="h-12 w-16 object-cover rounded"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </TableCell>

                <TableCell>{r.name}</TableCell>

                <TableCell>
                  <HotspotPriorityInput
                    key={search}
                    value={r.priority}
                    name={r.name}
                    maximum={2147483647}
                    disabled={prioritySaving || loadFailed}
                    onSave={(priority) => handlePriorityChange(r.id, priority)}
                  />
                </TableCell>

                <TableCell>
                  <div className="text-sm space-y-1">
                    {r.places.slice(0, 3).map((place, placeIndex) => (
                      <div key={placeIndex}>{place}</div>
                    ))}
                  </div>
                </TableCell>

                <TableCell>
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: r.localHtml }}
                  />
                </TableCell>

                <TableCell>
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: r.foreignHtml }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filtered.length > 0 ? (
              <>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filtered.length)} of{" "}
                {filtered.length} entries
              </>
            ) : (
              "Showing 0 entries"
            )}
          </div>

          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? "default" : "outline"}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}

            {totalPages > 5 && <span className="px-2">...</span>}

            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <DeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
