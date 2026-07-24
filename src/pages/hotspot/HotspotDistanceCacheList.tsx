import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, Pencil, Trash2, Plus, Download, Copy as CopyIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DeleteModal } from "@/components/hotspot/DeleteModal";
import {
  hotspotDistanceCacheService,
  HotspotDistanceCacheListItem,
  FormOptionsResponse,
} from "@/services/hotspotDistanceCacheService";
import { toast } from "sonner";

// ----- Helper functions -----
function to2D(rows: HotspotDistanceCacheListItem[]) {
  const headers = [
    "S.NO",
    "FROM HOTSPOT",
    "TO HOTSPOT",
    "TRAVEL TYPE",
    "DISTANCE (KM)",
    "TIME",
  ];
  const getTravelTypeName = (id: number) => {
    return id === 1 ? "Local" : id === 2 ? "Outstation" : String(id);
  };
  const data = rows.map((r, i) => [
    String(i + 1),
    r.fromHotspotName || `ID: ${r.fromHotspotId}`,
    r.toHotspotName || `ID: ${r.toHotspotId}`,
    getTravelTypeName(r.travelLocationType),
    String(r.distanceKm || ""),
    r.travelTime || "",
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
          .map((v) => `<td style="border:1px solid #e5e7eb;padding:6px 8px;">${v}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Hotspot Distance Cache</title></head>
<body>
<table style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:12px;">
<thead><tr>${th}</tr></thead><tbody>${trs}</tbody>
</table>
</body></html>`;
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

export default function HotspotDistanceCacheList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<HotspotDistanceCacheListItem[]>([]);
  const [filtered, setFiltered] = useState<HotspotDistanceCacheListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

 // Search and filter state
  const [search, setSearch] = useState("");
  const [filterFromHotspot, setFilterFromHotspot] = useState("");
  const [filterToHotspot, setFilterToHotspot] = useState("");
  const [filterTravelType, setFilterTravelType] = useState("");

 // Pagination state
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

 // Form options
  const [formOptions, setFormOptions] = useState<FormOptionsResponse | null>(null);

 // Load data
  useEffect(() => {
    load();
    loadFormOptions();
  }, []);

 // Apply filters
  useEffect(() => {
    let result = rows;

 // Search by hotspot names
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          (r.fromHotspotName?.toLowerCase().includes(q) ?? false) ||
          (r.toHotspotName?.toLowerCase().includes(q) ?? false)
      );
    }

 // Filter by from hotspot
    if (filterFromHotspot && filterFromHotspot !== "__all") {
      result = result.filter((r) => String(r.fromHotspotId) === filterFromHotspot);
    }

 // Filter by to hotspot
    if (filterToHotspot && filterToHotspot !== "__all") {
      result = result.filter((r) => String(r.toHotspotId) === filterToHotspot);
    }

 // Filter by travel type (travelLocationType is now a number, so compare as number)
    if (filterTravelType && filterTravelType !== "__all") {
      result = result.filter((r) => String(r.travelLocationType) === filterTravelType);
    }

    setFiltered(result);
    setCurrentPage(1);
  }, [search, filterFromHotspot, filterToHotspot, filterTravelType, rows]);

  async function load() {
    try {
      setLoading(true);
      const response = await hotspotDistanceCacheService.list({
 size: 10000, // Load all for client-side filtering
      });
 // Backend returns { total, page, size, pages, rows }
      setRows(response.rows || []);
      setFiltered(response.rows || []);
    } catch (error) {
 console.error("Failed to load hotspot distance cache:", error);
      toast.error("Failed to load data");
      setRows([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFormOptions() {
    try {
      const options = await hotspotDistanceCacheService.getFormOptions();
      setFormOptions(options);
    } catch (error) {
 console.error("Failed to load form options:", error);
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await hotspotDistanceCacheService.delete(deleteId);
      toast.success("Record deleted successfully");
      setDeleteId(null);
      load();
    } catch (error) {
 console.error("Failed to delete:", error);
      toast.error("Failed to delete record");
    }
  };

 // Pagination
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );
  const totalPages = Math.ceil(filtered.length / pageSize);

 // Export helpers
  const canExport = filtered.length > 0;
  const dataset = useMemo(() => to2D(filtered), [filtered]);

  const onCopy = async () => {
    if (!canExport) return;
    const csv = toCSV(dataset);
    try {
      await navigator.clipboard.writeText(csv);
      toast.success("Copied to clipboard as CSV");
    } catch {
      toast.error("Copy failed");
    }
  };

  const onCSV = () => {
    if (!canExport) return;
    const csv = toCSV(dataset);
    downloadBlob("hotspot-distance-cache.csv", "text/csv;charset=utf-8;", csv);
  };

  const onExcel = () => {
    if (!canExport) return;
    const html = toHTMLTable(dataset);
    downloadBlob("hotspot-distance-cache.xls", "application/vnd.ms-excel", html);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
 {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">
          Hotspot Distance Cache
        </h1>

        <button
          type="button"
          className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold
                     bg-violet-50 text-violet-700 hover:bg-violet-100 border border-transparent
                     transition-colors"
          onClick={() => navigate("/hotspot-distance-cache/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Record
        </button>
      </div>

 {/* Main Card */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
 {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pb-4 border-b">
 {/* Search by names */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Search (From/To Name)
            </label>
            <Input
              placeholder="Search hotspots..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>

 {/* From Hotspot Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              From Hotspot
            </label>
            <Select value={filterFromHotspot} onValueChange={setFilterFromHotspot}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                {formOptions?.hotspots.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

 {/* To Hotspot Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              To Hotspot
            </label>
            <Select value={filterToHotspot} onValueChange={setFilterToHotspot}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                {formOptions?.hotspots.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

 {/* Travel Type Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Travel Type
            </label>
            <Select value={filterTravelType} onValueChange={setFilterTravelType}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                {formOptions?.travelTypes.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

 {/* Export Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              aria-label="Copy"
              className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold
                         border ${
                           canExport
                             ? "border-violet-300 text-violet-700 hover:bg-violet-50"
                             : "border-gray-200 text-gray-300 cursor-not-allowed"
                         }`}
              onClick={onCopy}
              disabled={!canExport}
            >
              <CopyIcon className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="Excel"
              className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold
                         ${
                           canExport
                             ? "bg-emerald-500 text-white hover:bg-emerald-600"
                             : "bg-emerald-200 text-white cursor-not-allowed"
                         }`}
              onClick={onExcel}
              disabled={!canExport}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

 {/* Top Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm">entries</span>
          </div>

          <div className="text-sm text-muted-foreground">
            Total: {filtered.length} records
          </div>
        </div>

 {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.NO</TableHead>
              <TableHead>ACTION</TableHead>
              <TableHead>FROM HOTSPOT</TableHead>
              <TableHead>TO HOTSPOT</TableHead>
              <TableHead>TRAVEL TYPE</TableHead>
              <TableHead>DISTANCE (KM)</TableHead>
              <TableHead>TIME</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((record, index) => (
                <TableRow key={record.id}>
                  <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(`/hotspot-distance-cache/${record.id}/edit`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(record.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.fromHotspotName || `ID: ${record.fromHotspotId}`}
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.toHotspotName || `ID: ${record.toHotspotId}`}
                  </TableCell>
                  <TableCell>
                    {record.travelLocationType === 1 ? "Local" : record.travelLocationType === 2 ? "Outstation" : String(record.travelLocationType)}
                  </TableCell>
                  <TableCell>{record.distanceKm} km</TableCell>
                  <TableCell>{record.travelTime}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

 {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
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
              disabled={currentPage === totalPages}
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
