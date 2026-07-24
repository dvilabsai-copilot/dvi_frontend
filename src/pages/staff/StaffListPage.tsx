// FILE: src/pages/staff/StaffListPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Copy as CopyIcon,
  FileSpreadsheet,
  FileText,
  FileDown,
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { StaffAPI } from "@/services/staffService";
import type { StaffListRow } from "@/types/staff";

function to2D(rows: StaffListRow[]) {
  const headers = ["S.NO", "NAME", "MOBILE NO", "EMAIL", "AGENT NAME", "STATUS", "ROLE ACCESS"];
  const data = rows.map((r, i) => [
    String(i + 1),
    r.name,
    r.mobileNumber,
    r.email,
    r.agentName,
    r.status === 1 ? "Active" : "Inactive",
    r.roleAccess,
  ]);
  return { headers, data };
}

function toCSV({ headers, data }: { headers: string[]; data: string[][] }) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.map(esc).join(","), ...data.map((row) => row.map(esc).join(","))].join("\n");
}

function toHTMLTable({ headers, data }: { headers: string[]; data: string[][] }) {
  const th = headers.map((h) => `<th style="background:#f3f4f6;border:1px solid #e5e7eb;padding:6px 8px;text-align:left;">${h}</th>`).join("");
  const trs = data.map((row) => `<tr>${row.map((v) => `<td style="border:1px solid #e5e7eb;padding:6px 8px;">${v}</td>`).join("")}</tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Staff</title></head><body><table style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:12px;"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
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

export default function StaffListPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<StaffListRow[]>([]);
  const [filtered, setFiltered] = useState<StaffListRow[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await StaffAPI.list();
      setRows(data);
      setFiltered(data);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(
      rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.mobileNumber.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.agentName.toLowerCase().includes(q)
      )
    );
    setCurrentPage(1);
  }, [search, rows]);

  async function toggleStatus(row: StaffListRow, nextOn: boolean) {
    const id = row.id;
    const nextVal: 0 | 1 = nextOn ? 1 : 0;

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextVal } : r)));
    setFiltered((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextVal } : r)));
    setBusyIds((s) => new Set(s).add(id));

    try {
      await StaffAPI.toggleStatus(id, nextVal);
      toast.success(`Status ${nextOn ? "enabled" : "disabled"}`);
    } catch {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextOn ? 0 : 1 } : r)));
      setFiltered((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextOn ? 0 : 1 } : r)));
      toast.error("Failed to update status");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  const openDeleteModal = (id: number) => {
    setDeletingId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await StaffAPI.delete(deletingId);
      setRows((r) => r.filter((x) => x.id !== deletingId));
      setFiltered((r) => r.filter((x) => x.id !== deletingId));
      toast.success("Staff deleted successfully");
    } catch {
      toast.error("Failed to delete staff");
    } finally {
      setDeleteModalOpen(false);
      setDeletingId(null);
    }
  };

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const canExport = filtered.length > 0;
  const dataset = useMemo(() => to2D(filtered), [filtered]);

  const onCopy = async () => {
    if (!canExport) return;
    try {
      await navigator.clipboard.writeText(toCSV(dataset));
      toast.success(`Copied ${filtered.length} rows to clipboard`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const onCSV = () => {
    if (!canExport) return;
    downloadBlob("staff.csv", "text/csv;charset=utf-8;", toCSV(dataset));
  };

  const onExcel = () => {
    if (!canExport) return;
    downloadBlob("staff.xls", "application/vnd.ms-excel", toHTMLTable(dataset));
  };

 // --- PDF export (working) ---
  const onPDF = async () => {
    if (!canExport) return;
    try {
      const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
 // Title + timestamp
      doc.setFontSize(14);
      doc.text("Staff List", 14, 12);
      doc.setFontSize(10);
      doc.text(new Date().toLocaleString(), 14, 18);

      autoTable(doc, {
        head: [dataset.headers],
        body: dataset.data,
        startY: 22,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [0, 0, 0] },
        margin: { left: 14, right: 14 },
      });

      doc.save("staff-list.pdf");
      toast.success("PDF exported");
    } catch (e) {
 console.error("PDF export failed:", e);
      toast.error("PDF export failed — opening print dialog");
 window.print(); // fallback so the user can "Save as PDF"
    }
  };

 // Pagination helper
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3, 4, 5);
      if (currentPage > 5 && currentPage < totalPages - 1) {
        pages.push("...", currentPage);
      }
      pages.push("...", totalPages);
    }
    return pages;
  };

  return (
    <div className="p-6 space-y-6">
 {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Staff</h1>
        <div className="text-sm text-muted-foreground">
          Dashboard &gt; Staff
        </div>
      </div>

 {/* Card */}
      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
 {/* Title + Add Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">List of Staff</h2>
          <Button
            onClick={() => navigate("/staff/new")}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/5"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </div>

 {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
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
              </SelectContent>
            </Select>
            <span className="text-sm">entries</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm">Search:</span>
              <Input
                className="w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border ${
                canExport
                  ? "border-violet-300 text-violet-700 hover:bg-violet-50"
                  : "border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
              onClick={onCopy}
              disabled={!canExport}
            >
              <CopyIcon className="mr-1.5 h-4 w-4" />
              Copy
            </button>

            <button
              type="button"
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border ${
                canExport
                  ? "border-emerald-400 text-emerald-600 hover:bg-emerald-50"
                  : "border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
              onClick={onExcel}
              disabled={!canExport}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Excel
            </button>

            <button
              type="button"
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border ${
                canExport
                  ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                  : "border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
              onClick={onCSV}
              disabled={!canExport}
            >
              <FileText className="mr-1.5 h-4 w-4" />
              CSV
            </button>

            <button
              type="button"
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border ${
                canExport
                  ? "border-red-300 text-red-600 hover:bg-red-50"
                  : "border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
              onClick={onPDF}
              disabled={!canExport}
            >
              <FileDown className="mr-1.5 h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

 {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">S.NO</TableHead>
              <TableHead className="w-28">ACTION</TableHead>
              <TableHead>NAME</TableHead>
              <TableHead>MOBILE NO</TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead>AGENT NAME</TableHead>
              <TableHead className="w-24">STATUS</TableHead>
              <TableHead>ROLE ACCESS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>Loading…</TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>No staff found</TableCell>
              </TableRow>
            ) : (
              paginated.map((r, idx) => {
                const checked = r.status === 1;
                const disabled = busyIds.has(r.id);

                return (
                  <TableRow key={r.id}>
                    <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/staff/${r.id}/preview`)}
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/staff/${r.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => openDeleteModal(r.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.mobileNumber}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.agentName}</TableCell>
                    <TableCell>
                      <Switch
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(next) => toggleStatus(r, next)}
                        className="data-[state=checked]:bg-violet-500 data-[state=unchecked]:bg-violet-300"
                      />
                    </TableCell>
                    <TableCell>{r.roleAccess}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

 {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filtered.length > 0 ? (
              <>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
              </>
            ) : (
              "No entries"
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {getVisiblePages().map((page, i) =>
              page === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1">…</span>
              ) : (
                <Button
                  key={page}
                  size="sm"
                  variant={currentPage === page ? "default" : "outline"}
                  className={currentPage === page ? "bg-violet-500 hover:bg-violet-600" : ""}
                  onClick={() => setCurrentPage(page as number)}
                >
                  {page}
                </Button>
              )
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

 {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Are you sure?</DialogTitle>
            <DialogDescription className="text-center">
              Do you really want to delete this record? This process cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-center sm:justify-center">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Close
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}