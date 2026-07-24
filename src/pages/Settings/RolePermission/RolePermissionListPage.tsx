// src/pages/Settings/RolePermissionListPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

import {
  rolePermissionService,
  RolePermissionListItem,
} from "@/services/rolePermissionService";

export default function RolePermissionListPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<RolePermissionListItem[]>([]);
  const [filtered, setFiltered] = useState<RolePermissionListItem[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    const next = q
      ? rows.filter((r) => r.roleName.toLowerCase().includes(q))
      : rows;

    setFiltered(next);
    setCurrentPage(1);
  }, [search, rows]);

  async function load() {
    setLoading(true);
    try {
      const data = await rolePermissionService.list();
      setRows(data);
      setFiltered(data);
    } catch {
      toast.error("Failed to load role permissions");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const onDelete = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this role permission?");
    if (!ok) return;

    try {
      await rolePermissionService.remove(id);
      toast.success("Deleted successfully");
      await load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const onToggleStatus = async (id: string, next: boolean) => {
    try {
      await rolePermissionService.updateStatus(id, next);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
      setFiltered((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="p-6 space-y-6">
 {/* Top title line (like screenshot) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Role Permission</h1>
        </div>

        <button
          type="button"
          className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold
                     bg-violet-50 text-violet-700 hover:bg-violet-100 border border-transparent
                     transition-colors"
          onClick={() => navigate("/role-permission/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Role Permission
        </button>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="text-lg font-semibold text-slate-700">List of Role Permission</h2>

 {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Show</span>
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
            <span className="text-sm text-slate-600">entries</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Search:</span>
            <Input
              className="w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder=""
            />
          </div>
        </div>

 {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="bg-violet-50/40">
              <TableHead className="w-[90px]">S.NO</TableHead>
              <TableHead className="w-[140px]">ACTION</TableHead>
              <TableHead>ROLE NAME</TableHead>
              <TableHead className="w-[140px] text-center">STATUS</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>

                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/role-permission/${r.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4 text-violet-600" />
                      </Button>

                      <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-700">{r.roleName}</TableCell>

                  <TableCell className="text-center">
                    <div className="inline-flex items-center justify-center">
                      <Switch
                        checked={!!r.status}
                        onCheckedChange={(v) => onToggleStatus(r.id, v)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

 {/* Footer / Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing{" "}
            {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
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

 {/* show up to 5 pages like your HotspotList */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={currentPage === p ? "default" : "outline"}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </Button>
            ))}

            {totalPages > 5 && <span className="px-2 py-2 text-sm text-slate-500">...</span>}

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
    </div>
  );
}
export { RolePermissionListPage };

