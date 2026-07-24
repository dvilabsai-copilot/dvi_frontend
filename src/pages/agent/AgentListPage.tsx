// FILE: src/pages/agent/AgentListPage.tsx

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Download, Copy as CopyIcon, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AgentAPI } from "@/services/agentService";
import type { AgentListRow } from "@/types/agent";
import { api } from "@/lib/api";

/** Show '--' for empty/blank values in table cells */
const show = (v?: string | null) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : "--";
};

type FullItem = {
  agent_ID: number;
  login_enabled?: boolean;
};

/** Accepts either array or envelope from /agents/full */
function extractFullItems(payload: any): FullItem[] {
  if (Array.isArray(payload)) return payload as FullItem[];
  if (payload && Array.isArray(payload.data)) return payload.data as FullItem[];
  return [];
}

export default function AgentListPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<AgentListRow[]>([]);
  const [filtered, setFiltered] = useState<AgentListRow[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

 // export/copy button states
  const [copying, setCopying] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [downloadingXLS, setDownloadingXLS] = useState(false);

 // account-login state (id -> boolean) and updating flag
  const [loginEnabled, setLoginEnabled] = useState<Record<number, boolean>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

 // 1) Get table rows (uses AgentAPI.list which prefers /agents/full)
      const data = await AgentAPI.list();
      setRows(data);
      setFiltered(data);

 // 2) Build login map without per-id calls:
 // Query /agents/full once and read login_enabled for each agent.
      try {
        const fullPayload = await api("/agents/full?limit=1000");
        const items = extractFullItems(fullPayload);
        const map: Record<number, boolean> = {};
        for (const it of items) {
          const id = Number((it as any)?.agent_ID);
          if (Number.isFinite(id)) {
            map[id] = !!it.login_enabled;
          }
        }
        setLoginEnabled(map);
      } catch {
 // If /agents/full fails for some reason, keep previous loginEnabled state.
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

 // in-memory search
  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(rows);
      setCurrentPage(1);
      return;
    }
    setFiltered(
      rows.filter((r) => {
        const hay = [
          r.name,
          r.email,
          r.city,
          r.state,
          r.nationality,
          r.mobileNumber,
          r.travelExpert,
          r.subscriptionType,
          (loginEnabled[r.id] ? "login enabled on true yes" : "login disabled off false no"),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      }),
    );
    setCurrentPage(1);
  }, [search, rows, loginEnabled]);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

 // export & copy helpers
  const columns = [
    "S.NO",
    "ACTION",
    "AGENT NAME",
    "AGENT EMAIL",
    "MOBILE NUMBER",
    "TRAVEL EXPERT",
    "CITY",
    "STATE",
    "NATIONALITY",
    "SUBSCRIPTION TITLE",
    "ACCOUNT LOGIN",
  ] as const;

  const buildFlatRows = (src: AgentListRow[]) =>
    src.map((r, idx) => [
      String(idx + 1),
 "", // action column is UI-only
      show(r.name),
      show(r.email),
      show(r.mobileNumber),
      show(r.travelExpert),
      show(r.city),
      show(r.state),
      show(r.nationality),
      show(r.subscriptionType),
      loginEnabled[r.id] ? "ON" : "OFF",
    ]);

  const toCSV = (data: string[][]) => {
    const escapeCell = (v: string) => {
      const s = (v ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const header = columns.map((c) => escapeCell(String(c))).join(",");
    const body = data.map((row) => row.map(escapeCell).join(",")).join("\n");
    return [header, body].join("\n");
  };

  const downloadBlob = (content: string, filename: string, mime = "text/csv;charset=utf-8;") => {
    const blob = new Blob([content], { type: mime });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    try {
      setCopying(true);
      const flat = buildFlatRows(filtered);
      const tsv = [columns.join("\t"), ...flat.map((r) => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(tsv);
      toast.success("Copied to clipboard");
    } catch (e: any) {
      toast.error(e?.message || "Copy failed");
    } finally {
      setCopying(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      setDownloadingCSV(true);
      const flat = buildFlatRows(filtered);
      const csv = toCSV(flat);
      downloadBlob(csv, "agents.csv");
      toast.success("CSV downloaded");
    } catch (e: any) {
      toast.error(e?.message || "CSV export failed");
    } finally {
      setDownloadingCSV(false);
    }
  };

 // Simple .xls (HTML table)
  const handleDownloadExcel = async () => {
    try {
      setDownloadingXLS(true);
      const flat = buildFlatRows(filtered);
      const tableRows = flat
        .map((row) => `<tr>${row.map((c) => `<td>${String(c ?? "").replace(/&/g, "&amp;")}</td>`).join("")}</tr>`)
        .join("");
      const html =
        `<table><thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>`;
      downloadBlob(html, "agents.xls", "application/vnd.ms-excel");
      toast.success("Excel downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Excel export failed");
    } finally {
      setDownloadingXLS(false);
    }
  };

 // toggle login handler (unchanged)
  const toggleLogin = async (agentId: number) => {
    const current = !!loginEnabled[agentId];
    const next = !current;
    try {
      setUpdatingId(agentId);
 setLoginEnabled((m) => ({ ...m, [agentId]: next })); // optimistic

 // Adjust path/payload if your backend differs
      await api(`/agents/${agentId}/login`, {
        method: "PUT",
        body: { enable: next },
      });

      toast.success(`Account login ${next ? "enabled" : "disabled"}`);
    } catch (e: any) {
 setLoginEnabled((m) => ({ ...m, [agentId]: current })); // revert
      const msg = typeof e?.message === "string" ? e.message : "Toggle failed";
      toast.error(msg.includes("404") ? "Login toggle API not implemented on server" : msg);
    } finally {
      setUpdatingId(null);
    }
  };

 // render
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Agent</h1>
        <div className="text-sm text-muted-foreground">Dashboard &gt; Agent</div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">List of Agent</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-primary text-primary">
              <Download className="mr-2 h-4 w-4" /> Download Voucher
            </Button>
          </div>
        </div>

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
          <div className="flex items-center gap-3">
            <span className="text-sm">Search:</span>
            <Input className="w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button
              disabled={copying}
              onClick={handleCopy}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm border border-violet-300 text-violet-700 hover:bg-violet-50 disabled:opacity-60"
              title="Copy visible data as TSV"
            >
              <CopyIcon className="mr-1.5 h-4 w-4" />
              {copying ? "Copying…" : "Copy"}
            </button>
            <button
              disabled={downloadingXLS}
              onClick={handleDownloadExcel}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm border border-emerald-400 text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
              title="Download Excel (.xls)"
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              {downloadingXLS ? "Preparing…" : "Excel"}
            </button>
            <button
              disabled={downloadingCSV}
              onClick={handleDownloadCSV}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              title="Download CSV"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              {downloadingCSV ? "Preparing…" : "CSV"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.NO</TableHead>
                <TableHead>ACTION</TableHead>
                <TableHead>AGENT NAME</TableHead>
                <TableHead>AGENT EMAIL</TableHead>
                <TableHead>MOBILE NUMBER</TableHead>
                <TableHead>TRAVEL EXPERT</TableHead>
                <TableHead>CITY</TableHead>
                <TableHead>STATE</TableHead>
                <TableHead>NATIONALITY</TableHead>
                <TableHead>SUBSCRIPTION TITLE</TableHead>
                <TableHead>ACCOUNT LOGIN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11}>Loading…</TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>No agents found</TableCell>
                </TableRow>
              ) : (
                paginated.map((r, idx) => {
                  const isOn = !!loginEnabled[r.id];
                  const disabled = updatingId === r.id;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/agent/${r.id}/preview`)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/agent/${r.id}/edit`)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{show(r.name)}</TableCell>
                      <TableCell>{show(r.email)}</TableCell>
                      <TableCell>{show(r.mobileNumber)}</TableCell>
                      <TableCell>{show(r.travelExpert)}</TableCell>
                      <TableCell>{show(r.city)}</TableCell>
                      <TableCell>{show(r.state)}</TableCell>
                      <TableCell>{show(r.nationality)}</TableCell>
                      <TableCell>{show(r.subscriptionType)}</TableCell>

 {/* Toggle */}
                      <TableCell>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleLogin(r.id)}
                          title={isOn ? "Click to disable login" : "Click to enable login"}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            isOn ? "bg-violet-500" : "bg-gray-300"
                          } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                          aria-pressed={isOn}
                          aria-label="Toggle account login"
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              isOn ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filtered.length > 0
              ? `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                  currentPage * pageSize,
                  filtered.length,
                )} of ${filtered.length} entries`
              : "No entries"}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            {[1, 2, 3, 4, 5]
              .filter((p) => p <= totalPages)
              .map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={currentPage === p ? "default" : "outline"}
                  className={currentPage === p ? "bg-violet-500" : ""}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </Button>
              ))}
            {totalPages > 5 && <span className="px-2">…</span>}
            {totalPages > 5 && (
              <Button size="sm" variant="outline" onClick={() => setCurrentPage(totalPages)}>
                {totalPages}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
