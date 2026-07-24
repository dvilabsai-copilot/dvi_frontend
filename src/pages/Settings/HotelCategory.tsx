// FILE: src/pages/Settings/HotelCategory.tsx

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { DeleteModal } from "@/components/hotspot/DeleteModal";
import {
  hotelCategoryService,
  type HotelCategoryRow,
  type HotelCategoryUpsertInput,
} from "@/services/hotelCategoryService";

// ---------- export helpers (CSV / Excel / Copy) ----------

function to2D(rows: HotelCategoryRow[]) {
  const headers = ["S.NO", "HOTELS CATEGORY TITLE", "HOTELS CATEGORY CODE", "STATUS"];
  const data = rows.map((r, i) => [
    String(i + 1),
    r.title,
    r.code,
    r.status ? "Active" : "Inactive",
  ]);
  return { headers, data };
}

function toCSV({ headers, data }: { headers: string[]; data: string[][] }) {
  const esc = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [headers.map(esc).join(","), ...data.map((row) => row.map(esc).join(","))].join(
    "\n",
  );
}

function toHTMLTable({ headers, data }: { headers: string[]; data: string[][] }) {
  const th = headers
    .map(
      (h) =>
        `<th style="background:#f3f4f6;border:1px solid #e5e7eb;padding:6px 8px;text-align:left;">${h}</th>`,
    )
    .join("");
  const trs = data
    .map(
      (row) =>
        `<tr>${row
          .map(
            (v) =>
              `<td style="border:1px solid #e5e7eb;padding:6px 8px;">${v}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Hotel Category</title></head>
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

// ---------- small UI helpers ----------

function StatusToggle(props: { value: boolean; onChange: (v: boolean) => void }) {
  const { value, onChange } = props;
  return (
    <button
      type="button"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${value ? "bg-violet-600" : "bg-slate-300"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition
          ${value ? "translate-x-5" : "translate-x-1"}`}
      />
    </button>
  );
}

// ---------- modal for Add / Edit (like PHP add/edit popup) ----------

export type HotelCategoryFormValues = {
  code: string;
  title: string;
};

type HotelCategoryModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: HotelCategoryFormValues;
  onClose: () => void;
  onSubmit: (values: HotelCategoryFormValues) => Promise<void> | void;
};

function HotelCategoryModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: HotelCategoryModalProps) {
  const [values, setValues] = useState<HotelCategoryFormValues>({
    code: "",
    title: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(
        initial ?? {
          code: "",
          title: "",
        },
      );
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!values.code.trim() || !values.title.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      setSaving(true);
      await onSubmit({
        code: values.code.trim(),
        title: values.title.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Hotel Category" : "Edit Hotel Category"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new hotel category"
              : "Update hotel category information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Hotels Category Title *
            </label>
            <Input
              value={values.title}
              onChange={(e) =>
                setValues((v) => ({ ...v, title: e.target.value }))
              }
              placeholder="e.g., Budget, STD, 5*, 4*"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Hotels Category Code *
            </label>
            <Input
              value={values.code}
              onChange={(e) =>
                setValues((v) => ({ ...v, code: e.target.value }))
              }
              placeholder="e.g., DVIB-918791"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-gradient-to-r from-[#ff68b4] to-[#9b5cff]"
          >
            {mode === "create" ? "Create" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- main page (1:1 with PHP + LanguagePage layout) ----------

export function HotelCategoryPage() {
  const [rows, setRows] = useState<HotelCategoryRow[]>([]);
  const [filtered, setFiltered] = useState<HotelCategoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [deleteId, setDeleteId] = useState<string | number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<HotelCategoryRow | null>(null);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    const next = !q
      ? rows
      : rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.code.toLowerCase().includes(q),
        );
    setFiltered(next);
    setCurrentPage(1);
  }, [search, rows]);

  async function load() {
    try {
      const data = await hotelCategoryService.list();
      setRows(data);
      setFiltered(data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load hotel categories");
    }
  }

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const canExport = filtered.length > 0;
  const dataset = useMemo(() => to2D(filtered), [filtered]);

  const onCopy = async () => {
    if (!canExport) return;
    try {
      await navigator.clipboard.writeText(toCSV(dataset));
      toast.success("Copied table (filtered) to clipboard as CSV");
    } catch {
      toast.error("Copy failed");
    }
  };
  const onCSV = () => {
    if (!canExport) return;
    downloadBlob(
      "hotel-categories.csv",
      "text/csv;charset=utf-8;",
      toCSV(dataset),
    );
  };
  const onExcel = () => {
    if (!canExport) return;
    downloadBlob(
      "hotel-categories.xls",
      "application/vnd.ms-excel",
      toHTMLTable(dataset),
    );
  };

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: HotelCategoryRow) => {
    setModalMode("edit");
    setEditing(row);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await hotelCategoryService.remove(deleteId);
      toast.success("Hotel category deleted");
      setDeleteId(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete hotel category");
    }
  };

  const handleToggleStatus = async (
    row: HotelCategoryRow,
    nextStatus: boolean,
  ) => {
 // optimistic update
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)),
    );

    try {
      const payload: Partial<HotelCategoryUpsertInput> = {
        status: nextStatus,
      };
      await hotelCategoryService.update(row.id, payload);
      toast.success("Status updated");
      await load();
    } catch (e: any) {
 // revert on error
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)),
      );
      toast.error(e?.message || "Failed to update status");
    }
  };

  const handleModalSubmit = async (v: HotelCategoryFormValues) => {
    const payload: HotelCategoryUpsertInput = {
      code: v.code,
      title: v.title,
    };

    try {
      if (modalMode === "create") {
        await hotelCategoryService.create(payload);
        toast.success("Hotel category created");
      } else {
        if (!editing) throw new Error("Missing record to update");
        await hotelCategoryService.update(editing.id, payload);
        toast.success("Hotel category updated");
      }

      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
 {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">List of Hotel Category</h1>

        <button
          type="button"
          className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold
                     bg-violet-50 text-violet-700 hover:bg-violet-100 border border-transparent
                     transition-colors"
          onClick={openCreate}
        >
          + Add Hotel Category
        </button>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
 {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
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
                onChange={(e) => setSearch(e.target.value)}
              />
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
              <TableHead>HOTELS CATEGORY TITLE</TableHead>
              <TableHead>HOTELS CATEGORY CODE</TableHead>
              <TableHead>STATUS</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.map((r, idx) => (
              <TableRow key={String(r.id)}>
                <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>

                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4 text-violet-600" />
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

                <TableCell className="text-slate-600 font-medium">
                  {r.title}
                </TableCell>

                <TableCell className="text-slate-600">
                  {r.code}
                </TableCell>

                <TableCell>
                  <StatusToggle
                    value={r.status}
                    onChange={(v) => handleToggleStatus(r, v)}
                  />
                </TableCell>
              </TableRow>
            ))}

            {paginated.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-slate-500"
                >
                  No hotel categories found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

 {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {filtered.length === 0
              ? 0
              : (currentPage - 1) * pageSize + 1}{" "}
            to {Math.min(currentPage * pageSize, filtered.length)} of{" "}
            {filtered.length} entries
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
      <HotelCategoryModal
        open={modalOpen}
        mode={modalMode}
        initial={
          editing
            ? { code: editing.code, title: editing.title }
            : undefined
        }
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleModalSubmit}
      />

      <DeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}