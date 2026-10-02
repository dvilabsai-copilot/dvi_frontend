import { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportAccountsManagerExcel, fetchAccountsList, fetchAccountsSummary, type AccountsRow, type AccountsSummary } from "@/services/accountsManagerApi";
import { exportLedgerExcel, fetchLedgerFromApi, type LedgerRow } from "@/services/accountsLedgerApi";

const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const componentTypes = ["all", "hotel", "vehicle", "guide", "hotspot", "activity"];

export function AccountsReports() {
  const [report, setReport] = useState("components");
  const [quoteId, setQuoteId] = useState("");
  const [status, setStatus] = useState<"all" | "paid" | "due">("all");
  const [componentType, setComponentType] = useState("all");
  const [rows, setRows] = useState<AccountsRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const selectedType = componentType === "all" ? undefined : componentType as any;
      const filters = { quoteId: quoteId.trim() || undefined, status, componentType: selectedType };
      const [accounts, totals, ledger] = await Promise.all([
        fetchAccountsList(filters),
        fetchAccountsSummary(filters),
        fetchLedgerFromApi({ quoteId, componentType: selectedType ?? "all", fromDate: "", toDate: "", guideName: "", hotspotName: "", activityName: "", hotelName: "", branch: "", vehicle: "", vehicleVendor: "", agentName: "" }),
      ]);
      setRows(accounts);
      setSummary(totals);
      setLedgerRows(ledger);
    } catch (cause) {
      setRows([]);
      setLedgerRows([]);
      setSummary(null);
      setError(cause instanceof Error ? cause.message : "Unable to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selling = rows.reduce((total, row) => total + Number(row.amount || 0), 0);
  const purchase = rows.reduce((total, row) => total + Number(row.payable || 0), 0);
  const profit = selling - purchase;
  const agentReceivable = ledgerRows.filter((row) => row.componentType === "agent").reduce((total, row) => total + Number(row.totalReceivable || 0), 0);
  const cards: [string, unknown][] = [
    ["Total Selling", selling],
    ["Total Purchase", purchase],
    ["Gross Profit", profit],
    ["Total Payable", summary?.totalPayable],
    ["Total Paid", summary?.totalPaid],
    ["Outstanding", summary?.totalBalance],
    ["Agent Receivable", agentReceivable],
  ];

  return (
    <main className="min-h-screen bg-[#f5f8fc] p-4 text-[#17233d] md:p-6">
      <section className="rounded-lg border border-[#dbe4f1] bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-[#71809a]">Build reports from Accounts Manager and Ledger data.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <Select value={report} onValueChange={setReport}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["components", "Accounts Components"], ["payables", "Vendor Payables"], ["payments", "Payments"], ["ledger", "Ledger"], ["profitability", "Profitability"], ["receivable", "Agent Receivable"]].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Input value={quoteId} onChange={(event) => setQuoteId(event.target.value)} placeholder="Quote ID" />
          <Select value={componentType} onValueChange={setComponentType}><SelectTrigger><SelectValue placeholder="Component type" /></SelectTrigger><SelectContent>{componentTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{["all", "paid", "due"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
          <Button onClick={() => void load()} disabled={loading} className="bg-[#245bea] hover:bg-[#1749c5]"><Search className="mr-2 h-4 w-4" />Refresh</Button>
        </div>
      </section>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-4 grid gap-3 md:grid-cols-4 xl:grid-cols-7">{cards.map(([label, value]) => <div key={label} className="rounded-lg border border-[#dbe4f1] bg-white p-4 shadow-sm"><p className="text-xs text-[#71809a]">{label}</p><p className="mt-2 text-lg font-bold">{money(value)}</p></div>)}</section>
      <section className="mt-4 overflow-hidden rounded-lg border border-[#dbe4f1] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e7edf5] p-4"><h2 className="font-bold">{report} report</h2><div className="flex gap-2"><Button variant="outline" onClick={() => void exportAccountsManagerExcel({ quoteId: quoteId || undefined, status, componentType: componentType === "all" ? undefined : componentType as any })}><Download className="mr-2 h-4 w-4" />Accounts Excel</Button><Button variant="outline" onClick={() => void exportLedgerExcel(componentType === "all" ? "all" : componentType as any, quoteId)}><Download className="mr-2 h-4 w-4" />Ledger Excel</Button></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[#f7f9fc] text-[#71809a]"><tr>{["Booking", "Type", "Supplier / Vendor", "Selling", "Purchase", "Paid", "Balance", "Profit"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={8} className="px-3 py-10 text-center text-[#71809a]">{loading ? "Loading report..." : "No report data found."}</td></tr> : rows.map((row) => <tr key={row.id} className="border-t border-[#edf1f6]"><td className="px-3 py-3">{row.quoteId}</td><td className="px-3 py-3 capitalize">{row.componentType}</td><td className="px-3 py-3">{row.hotelName || "-"}</td><td className="px-3 py-3">{money(row.amount)}</td><td className="px-3 py-3">{money(row.payable)}</td><td className="px-3 py-3">{money(row.payout)}</td><td className="px-3 py-3">{money(Number(row.payable) - Number(row.payout))}</td><td className="px-3 py-3 font-semibold text-emerald-600">{money(Number(row.amount) - Number(row.payable))}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
