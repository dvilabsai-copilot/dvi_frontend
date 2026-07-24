// FILE: src/pages/agent-subscription-plan/AgentSubscriptionPlanListPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

import {
  agentSubscriptionPlanService,
  AgentSubscriptionPlanListItem,
} from "@/services/agentSubscriptionPlanService";

import {
  Copy as CopyIcon,
  FileSpreadsheet,
  FileText,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-violet-600" : "bg-slate-300",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white transition",
          checked ? "translate-x-5" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: AgentSubscriptionPlanListItem[]) {
  const header = [
    "S.NO",
    "PLAN TITLE",
    "TYPE",
    "ITINERARY COUNT",
    "COST",
    "JOINING BONUS",
    "ITINERARY COST",
    "VALIDITY (DAYS)",
    "RECOMMENDED",
    "STATUS",
  ];
  const lines = [header.join(",")];

  rows.forEach((r, idx) => {
    lines.push(
      [
        idx + 1,
        `"${String(r.planTitle ?? "").replace(/"/g, '""')}"`,
 "", // type not in list payload
        r.itineraryCount,
        r.cost,
        r.joiningBonus,
        r.itineraryCost,
        r.validityDays,
        r.recommended ? "1" : "0",
        r.status ? "1" : "0",
      ].join(",")
    );
  });

  return lines.join("\n");
}

export default function AgentSubscriptionPlanListPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [rows, setRows] = useState<AgentSubscriptionPlanListItem[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await agentSubscriptionPlanService.list();
      setRows(data);
    } catch (e) {
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.planTitle?.toLowerCase().includes(q));
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search]);

  const canExport = filtered.length > 0;

  async function onDelete(id: string) {
    const ok = window.confirm("Delete this subscription plan?");
    if (!ok) return;

    setBusyId(id);
    try {
      await agentSubscriptionPlanService.remove(id);
      toast.success("Deleted");
      setRows((p) => p.filter((x) => x.id !== id));
    } catch {
      toast.error("Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleStatus(id: string, next: boolean) {
    setBusyId(id);
    try {
      await agentSubscriptionPlanService.updateStatus(id, next);
      setRows((p) => p.map((x) => (x.id === id ? { ...x, status: next } : x)));
    } catch {
      toast.error("Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  async function onToggleRecommended(id: string, next: boolean) {
    setBusyId(id);
    try {
      await agentSubscriptionPlanService.updateRecommended(id, next);
      setRows((p) => p.map((x) => (x.id === id ? { ...x, recommended: next } : x)));
    } catch {
      toast.error("Failed to update recommended");
    } finally {
      setBusyId(null);
    }
  }

  function onCopy() {
    if (!canExport) return;

    const text = filtered
      .map(
        (r, idx) =>
          `${idx + 1}\t${r.planTitle}\t${r.itineraryCount}\t${r.cost}\t${r.joiningBonus}\t${r.itineraryCost}\t${r.validityDays}\t${
            r.recommended ? "Yes" : "No"
          }\t${r.status ? "On" : "Off"}`
      )
      .join("\n");

    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied table (filtered) to clipboard"))
      .catch(() => toast.error("Copy failed"));
  }

  function onCSV() {
    if (!canExport) return;
    downloadText("agent-subscription-plans.csv", toCSV(filtered));
  }

  function onExcel() {
    if (!canExport) return;
 // Simple CSV download that opens in Excel
    downloadText("agent-subscription-plans.xls", toCSV(filtered));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">
          List of Subscription Plan
        </h1>

        <div className="text-sm text-violet-700 flex items-center gap-2">
          <span
            className="hover:underline cursor-pointer"
            onClick={() => navigate("/")}
          >
            Dashboard
          </span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-600">List of Subscription Plan</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-lg font-semibold text-slate-700">
            List of Agent Subscription Plan
          </h2>

 {/* Match Add Language button style */}
          <button
            type="button"
            className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold
                       bg-violet-50 text-violet-700 hover:bg-violet-100 border border-transparent
                       transition-colors"
            onClick={() => navigate("/agent-subscription-plan/new")}
          >
            + Add Subscription Plan
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
 {/* Show entries (match Language.tsx using Select) */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
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
            <span>entries</span>
          </div>

 {/* Toolbar buttons styled like Language.tsx */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Search:</span>
              <Input
                className="h-9 w-[260px]"
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

        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-violet-50/40">
                <TableHead className="w-[70px]">S.NO</TableHead>
                <TableHead className="w-[140px]">ACTION</TableHead>
                <TableHead className="w-[140px]">RECOMENDED</TableHead>
                <TableHead>PLAN TITLE</TableHead>
                <TableHead className="w-[150px]">ITINERARY COUNT</TableHead>
                <TableHead className="w-[120px]">COST (₹)</TableHead>
                <TableHead className="w-[160px]">JOINING BONUS (₹)</TableHead>
                <TableHead className="w-[160px]">ITINERARY COST (₹)</TableHead>
                <TableHead className="w-[120px]">VALIDITY</TableHead>
                <TableHead className="w-[120px]">STATUS</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    No rows
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>

                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            navigate(`/agent-subscription-plan/${r.id}/preview`)
                          }
                          title="View"
                        >
                          <Eye className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            navigate(`/agent-subscription-plan/${r.id}/edit`)
                          }
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-violet-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(r.id)}
                          disabled={busyId === r.id}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Toggle
                        checked={!!r.recommended}
                        disabled={busyId === r.id}
                        onChange={(next) => onToggleRecommended(r.id, next)}
                      />
                    </TableCell>

                    <TableCell className="text-slate-700">
                      {r.planTitle}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {r.itineraryCount}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {r.cost}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {r.joiningBonus}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {r.itineraryCost}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {r.validityDays} days
                    </TableCell>

                    <TableCell>
                      <Toggle
                        checked={!!r.status}
                        disabled={busyId === r.id}
                        onChange={(next) => onToggleStatus(r.id, next)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <div>
            Showing{" "}
            {filtered.length === 0
              ? 0
              : (page - 1) * pageSize + 1}{" "}
            to {Math.min(page * pageSize, filtered.length)} of{" "}
            {filtered.length} entries
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <div className="w-9 h-9 rounded-md bg-violet-600 text-white flex items-center justify-center">
              {Math.min(page, pageCount)}
            </div>
            <Button
              variant="outline"
              disabled={page >= pageCount}
              onClick={() =>
                setPage((p) => Math.min(pageCount, p + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AgentSubscriptionPlanListPage };
