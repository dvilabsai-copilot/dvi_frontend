import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";

import {
  rolePermissionService,
  RolePermissionPayload,
  RolePermissionPageRow,
} from "@/services/rolePermissionService";

function normalizeChecked(v: boolean | "indeterminate") {
  return v === true;
}

export default function RolePermissionFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = !!id;

  const [roleName, setRoleName] = useState("");
  const [rows, setRows] = useState<RolePermissionPageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const title = isEdit ? "Update Role Permission" : "Add Role Permission";

  const breadcrumb = useMemo(() => {
    return (
      <div className="text-sm text-violet-700 flex items-center gap-2">
        <span
          className="hover:underline cursor-pointer"
          onClick={() => navigate("/")}
        >
          Dashboard
        </span>
        <span className="text-slate-400">›</span>
        <span
          className="hover:underline cursor-pointer"
          onClick={() => navigate("/settings/role-permission")}
        >
          Role Permission
        </span>
        <span className="text-slate-400">›</span>
        <span className="text-slate-600">{title}</span>
      </div>
    );
  }, [navigate, title]);

  useEffect(() => {
    boot();
 // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function boot() {
    setLoading(true);
    try {
 // 1) Load pages list (so table renders)
      const pages = await rolePermissionService.listPages();

 // 2) If edit, load existing role permission and merge
      if (isEdit && id) {
        const existing = await rolePermissionService.getOne(id);

        setRoleName(existing.roleName);

        const merged = pages.map((p) => {
          const found = existing.pages.find((x) => x.pageKey === p.pageKey) || null;
          const read = found?.read ?? false;
          const write = found?.write ?? false;
          const modify = found?.modify ?? false;
          const full = found?.full ?? (read && write && modify);

          return { ...p, read, write, modify, full };
        });

        setRows(merged);
      } else {
        setRows(pages);
      }
    } catch {
      toast.error("Failed to load role permission form");
    } finally {
      setLoading(false);
    }
  }

  const setRow = (index: number, updater: (r: RolePermissionPageRow) => RolePermissionPageRow) => {
    setRows((prev) => prev.map((r, i) => (i === index ? updater(r) : r)));
  };

  const onToggleFull = (index: number, checked: boolean) => {
  setRow(index, (r) => {
    const next: RolePermissionPageRow = {
      ...r,
      full: checked,
 // FULL controls all three directly
      read: checked,
      write: checked,
      modify: checked,
    };
    return next;
  });
};

  const onToggleRWM = (index: number, key: "read" | "write" | "modify", checked: boolean) => {
    setRow(index, (r) => {
      const next = { ...r, [key]: checked } as RolePermissionPageRow;
      const full = !!(next.read && next.write && next.modify);
      return { ...next, full };
    });
  };

  const onSave = async () => {
    const name = roleName.trim();
    if (!name) {
      toast.error("Role Name is required");
      return;
    }

    const payload: RolePermissionPayload = {
      roleName: name,
      pages: rows.map((r) => ({
        pageKey: r.pageKey,
        pageName: r.pageName,
        read: !!r.read,
        write: !!r.write,
        modify: !!r.modify,
        full: !!r.full,
      })),
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await rolePermissionService.update(id, payload);
        toast.success("Role permission updated");
      } else {
        await rolePermissionService.create(payload);
        toast.success("Role permission created");
      }
      navigate("/settings/role-permission");
    } catch {
      toast.error(isEdit ? "Failed to update" : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
 {/* Top header like screenshot */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
        {breadcrumb}
      </div>

      <div className="bg-white rounded-lg border p-6">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading...</div>
        ) : (
          <>
            <h2 className="text-center text-2xl font-semibold text-slate-700 mb-8">
              {title}
            </h2>

 {/* Role Name */}
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="h-11"
                placeholder=""
              />
            </div>

 {/* Permissions Table */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-slate-700 mb-4">Role Permissions</h3>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-violet-50/40">
                      <TableHead className="w-[90px]">S.NO</TableHead>
                      <TableHead>PAGE NAME</TableHead>
                      <TableHead className="w-[160px] text-center">READ ACCESS</TableHead>
                      <TableHead className="w-[160px] text-center">WRITE ACCESS</TableHead>
                      <TableHead className="w-[170px] text-center">MODIFY ACCESS</TableHead>
                      <TableHead className="w-[160px] text-center">FULL ACCESS</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={r.pageKey}>
                        <TableCell>{idx + 1}</TableCell>

                        <TableCell className="text-slate-700">{r.pageName}</TableCell>

                        <TableCell className="text-center">
                          <Checkbox
                            checked={!!r.read}
                            onCheckedChange={(v) =>
                              onToggleRWM(idx, "read", normalizeChecked(v))
                            }
                          />
                        </TableCell>

                        <TableCell className="text-center">
                          <Checkbox
                            checked={!!r.write}
                            onCheckedChange={(v) =>
                              onToggleRWM(idx, "write", normalizeChecked(v))
                            }
                          />
                        </TableCell>

                        <TableCell className="text-center">
                          <Checkbox
                            checked={!!r.modify}
                            onCheckedChange={(v) =>
                              onToggleRWM(idx, "modify", normalizeChecked(v))
                            }
                          />
                        </TableCell>

                        <TableCell className="text-center">
                          <Checkbox
                            checked={!!r.full}
                            onCheckedChange={(v) =>
                              onToggleFull(idx, normalizeChecked(v))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

 {/* Footer buttons */}
            <div className="mt-10 flex items-center justify-between">
              <Button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-10"
                onClick={() => navigate("/settings/role-permission")}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white px-10"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Saving..." : isEdit ? "Update" : "Save"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { RolePermissionFormPage };
