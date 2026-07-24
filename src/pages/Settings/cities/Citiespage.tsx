// FILE: src/pages/Settings/cities/Citiespage.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Copy as CopyIcon,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { CitiesAPI as citiesService, City, State } from "@/services/citiesService";
import { CitiesModal, CityFormValues } from "./CitiesModal";

// ----- export helpers -----
function to2D(rows: City[]) {
  const headers = ["S.NO", "STATE", "CITY"];
  const data = rows.map((r, i) => [
    String(i + 1),
    r.state?.state_name || "N/A",
    r.city_name || "",
  ]);
  return { headers, data };
}

function toCSV({ headers, data }: { headers: string[]; data: string[][] }) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.map(esc).join(","), ...data.map((row) => row.map(esc).join(","))].join("\n");
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
<html><head><meta charset="utf-8"><title>Cities</title></head>
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

export function CitiesPage() {
  const [rows, setRows] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [filtered, setFiltered] = useState<City[]>([]);
  const [search, setSearch] = useState("");

 // "all" means fetch all states cities
  const [selectedStateId, setSelectedStateId] = useState<string>("all");

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<City | null>(null);

  useEffect(() => {
    loadStates();
  }, []);

 // fetch whenever state filter changes (after states loaded)
  useEffect(() => {
    if (!selectedStateId) return;
    if (states.length === 0) return;

    if (selectedStateId === "all") {
      loadAllCitiesForCountry();
    } else {
      loadCitiesByState(Number(selectedStateId));
    }
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStateId, states.length]);

 // search filter
  useEffect(() => {
    const q = search.toLowerCase().trim();
    const next = !q
      ? rows
      : rows.filter((r) => {
          const city = (r.city_name || "").toLowerCase();
          const st = (r.state?.state_name || "").toLowerCase();
          return city.includes(q) || st.includes(q);
        });

    setFiltered(next);
    setCurrentPage(1);
  }, [search, rows]);

  async function loadStates() {
    try {
      const statesData = await citiesService.getStates(101);
      setStates(statesData);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load states");
    }
  }

  async function loadCitiesByState(stateId: number) {
    try {
      const citiesData = await citiesService.getCitiesByState(stateId);

 // ensure state object exists (for UI)
      const st = states.find((s) => s.state_id === stateId);
      const enriched = citiesData.map((c) => ({
        ...c,
        state: c.state ?? (st ? { state_id: st.state_id, state_name: st.state_name } : undefined),
      }));

      setRows(enriched);
      setFiltered(enriched);
      setCurrentPage(1);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load cities");
      setRows([]);
      setFiltered([]);
      setCurrentPage(1);
    }
  }

  async function loadAllCitiesForCountry() {
    try {
 // fetch per-state (because /cities list is not reliable in your current backend)
      const results = await Promise.all(
        states.map(async (s) => {
          const cities = await citiesService.getCitiesByState(s.state_id);
          return cities.map((c) => ({
            ...c,
            state: { state_id: s.state_id, state_name: s.state_name },
          }));
        })
      );

 // flatten + dedupe by city_id
      const flat = results.flat();
      const map = new Map<number, City>();
      for (const c of flat) map.set(c.city_id, c);

 // sort newest first (like your tables)
      const merged = Array.from(map.values()).sort((a, b) => b.city_id - a.city_id);

      setRows(merged);
      setFiltered(merged);
      setCurrentPage(1);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load all cities");
      setRows([]);
      setFiltered([]);
      setCurrentPage(1);
    }
  }

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const canExport = filtered.length > 0;
  const dataset = useMemo(() => to2D(filtered), [filtered]);

  const onCopy = async () => {
    if (!canExport) return;
    const csv = toCSV(dataset);
    try {
      await navigator.clipboard.writeText(csv);
      toast.success("Copied table (filtered) to clipboard as CSV");
    } catch {
      toast.error("Copy failed");
    }
  };

  const onCSV = () => {
    if (!canExport) return;
    downloadBlob("cities.csv", "text/csv;charset=utf-8;", toCSV(dataset));
  };

  const onExcel = () => {
    if (!canExport) return;
    downloadBlob("cities.xls", "application/vnd.ms-excel", toHTMLTable(dataset));
  };

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: City) => {
    setModalMode("edit");
    setEditing(row);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await citiesService.deleteCity(deleteId);
      toast.success("City deleted");
      setDeleteId(null);

      if (selectedStateId === "all") {
        await loadAllCitiesForCountry();
      } else if (selectedStateId) {
        await loadCitiesByState(Number(selectedStateId));
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete city");
    }
  };

  const handleModalSubmit = async (v: CityFormValues) => {
    try {
      if (modalMode === "create") {
        await citiesService.createCity({
          city_name: v.city_name.trim(),
          state_id: Number(v.state_id),
        });
        toast.success("City created");
      } else {
        if (!editing) throw new Error("Missing record to update");
        await citiesService.updateCity(editing.city_id, {
          city_name: v.city_name.trim(),
          state_id: Number(v.state_id),
        });
        toast.success("City updated");
      }

      setModalOpen(false);
      setEditing(null);

 // if you are viewing "all" keep it, else reload selected state
      if (selectedStateId === "all") {
        await loadAllCitiesForCountry();
      } else if (selectedStateId) {
        await loadCitiesByState(Number(selectedStateId));
      }
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
 {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cities</h1>
          <p className="text-sm text-muted-foreground">Manage cities and locations</p>
        </div>

        <button
          type="button"
          className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold
                     bg-violet-50 text-violet-700 hover:bg-violet-100 border border-transparent
                     transition-colors"
          onClick={openCreate}
        >
          + Add City
        </button>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
 {/* Top toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Show</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
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

 {/* State Filter with ALL STATES */}
            <div className="flex items-center gap-2">
              <span className="text-sm">State:</span>
              <Select value={selectedStateId} onValueChange={setSelectedStateId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.state_id} value={String(s.state_id)}>
                      {s.state_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Search:</span>
              <Input className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <button
              type="button"
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold border
                ${
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
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold
                ${
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
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold
                ${
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

 {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.NO</TableHead>
              <TableHead>ACTION</TableHead>
              <TableHead>STATE</TableHead>
              <TableHead>CITY</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.map((r, idx) => (
              <TableRow key={String(r.city_id)}>
                <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>

                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4 text-violet-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(r.city_id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>

                <TableCell className="text-slate-600 font-medium">
                  {r.state?.state_name || "N/A"}
                </TableCell>

                <TableCell className="text-slate-600 font-medium">
                  {r.city_name || "--"}
                </TableCell>
              </TableRow>
            ))}

            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No cities found
                </TableCell>
              </TableRow>
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

            <Button size="sm" variant="default">
              {currentPage}
            </Button>

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

 {/* Modals */}
      <CitiesModal
        open={modalOpen}
        mode={modalMode}
        states={states}
        initial={
          editing
            ? { city_name: editing.city_name, state_id: String(editing.state_id) }
            : selectedStateId && selectedStateId !== "all"
              ? { city_name: "", state_id: selectedStateId }
              : undefined
        }
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleModalSubmit}
      />

      <DeleteModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

export default CitiesPage;
