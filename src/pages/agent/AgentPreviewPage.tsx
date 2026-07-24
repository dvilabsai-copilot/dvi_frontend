// FILE: src/pages/agent/AgentPreviewPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
import { toast } from "sonner";
import { AgentAPI } from "@/services/agentService";
import type { Agent } from "@/services/agentService";
import { api } from "@/lib/api";

/** ---------- Local types for subscription history ---------- */
type SubscriptionRow = {
  id?: number;
  title: string;
 amount: string; // formatted currency or raw
 start: string; // human date
 end: string; // human date
  txnId: string;
 paymentStatus: string; // e.g. "Free", "Paid", "Pending"
};

/** Small util: show -- for empty */
const show = (v?: string | null) => {
  const s = (v ?? "").toString().trim();
  return s ? s : "--";
};

/** Badge classes for payment status */
function statusBadgeClasses(status: string) {
  const s = (status || "").trim().toLowerCase();
  if (s === "paid") {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }
  if (s === "free") {
    return "bg-orange-50 text-orange-700 border border-orange-200";
  }
 // fallback (pending/others)
  return "bg-gray-50 text-gray-700 border border-gray-200";
}

export default function AgentPreviewPage() {
  const { id } = useParams();
  const agentId = Number(id);
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);

 // subscription history
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [q, setQ] = useState("");

 // ---- load agent details ----
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await AgentAPI.get(agentId);
        if (active) setAgent(data);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load agent");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [agentId]);

 // ---- load subscription history ----
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = (await api(`/agents/${agentId}/subscriptions`).catch(() => [])) as
          | any[]
          | { data?: any[] };
        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

        const mapped: SubscriptionRow[] = rows.map((r: any, i: number) => ({
          id: Number(r.id ?? i + 1),
          title: String(r.subscription_title ?? r.title ?? "Free"),
          amount: String(r.amount ?? r.price ?? "₹0.00"),
          start: String(r.validity_start ?? r.start ?? ""),
          end: String(r.validity_end ?? r.end ?? ""),
          txnId: String(r.transaction_id ?? r.txnId ?? ""),
          paymentStatus: String(r.payment_status ?? r.status ?? "Free"),
        }));
        if (active) setSubs(mapped);
      } catch {
        if (active) setSubs([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [agentId]);

 // ---- search + pagination for subscription table ----
  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return subs;
    return subs.filter((r) =>
      [r.title, r.amount, r.start, r.end, r.txnId, r.paymentStatus]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [subs, q]);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div className="p-6 space-y-6">
 {/* Header / Breadcrumb-ish */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-primary">
            {agent ? `» ${agent.firstName.toUpperCase()}${agent.lastName ? " " + agent.lastName.toUpperCase() : ""}` : "Agent"}
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">Dashboard &gt; Agent</div>
      </div>

 {/* Card: Agent Details */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">Agent Details</h2>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : !agent ? (
          <div className="text-sm text-muted-foreground">No data</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-6">
            <Detail label="First Name" value={show(agent.firstName)} />
            <Detail label="Last Name" value={show(agent.lastName)} />
            <Detail label="Email Address" value={show(agent.email)} />
            <Detail label="Nationality" value={show(agent.nationality)} />

            <Detail label="State" value={show(agent.state)} />
            <Detail label="City" value={show(agent.city)} />
            <Detail label="Mobile No" value={show(agent.mobileNumber)} />
            <Detail label="Alternative Mobile No" value={show(agent.alternativeMobile)} />

 <Detail label="Travel Expert" value={show(/* reserved */ "")} />
            <Detail label="GSTIN Number" value={show(agent.gstin)} />
            <Detail
              label="GST Attachment"
              value={
                agent.gstAttachment ? (
                  <a
                    className="text-primary underline"
                    href={agent.gstAttachment}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View file
                  </a>
                ) : (
                  "No file uploaded"
                )
              }
            />
          </div>
        )}
      </div>

 {/* Card: Subscription History */}
      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">List of Subscription History</h2>

          <div className="flex items-center gap-3">
            <span className="text-sm">Show</span>
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span className="text-sm">entries</span>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm">Search:</span>
            <Input className="w-48" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.NO</TableHead>
                <TableHead>SUBSCRIPTION TITLE</TableHead>
                <TableHead>AMOUNT</TableHead>
                <TableHead>VALIDITY START</TableHead>
                <TableHead>VALIDITY END</TableHead>
                <TableHead>TRANSACTION ID</TableHead>
                <TableHead>PAYMENT STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>No entries</TableCell>
                </TableRow>
              ) : (
                paginated.map((r, idx) => (
                  <TableRow key={r.id ?? idx}>
                    <TableCell>{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell>{show(r.title)}</TableCell>
                    <TableCell>{show(r.amount)}</TableCell>
                    <TableCell>{show(r.start)}</TableCell>
                    <TableCell>{show(r.end)}</TableCell>
                    <TableCell>{show(r.txnId)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                          statusBadgeClasses(r.paymentStatus)
                        }
                      >
                        {show(r.paymentStatus)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
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

        <div className="pt-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Small presentational helper (label/value cell) */
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
