import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAccountsList, fetchAccountsSummary, fetchPaymentModes, type AccountsRow, type AccountsSummary, type PaymentModeOption } from "@/services/accountsManagerApi";
import { fetchLedgerFilterOptions, fetchLedgerFromApi, type LedgerOption, type LedgerRow } from "@/services/accountsLedgerApi";
import { PayNowModal } from "./PayNowModal";

const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function AccountsVendorBills() {
  const navigate = useNavigate();
  const [quoteId, setQuoteId] = useState("");
  const [componentType, setComponentType] = useState("all");
  const [status, setStatus] = useState<"all" | "paid" | "due">("all");
  const [vendor, setVendor] = useState("all");
  const [rows, setRows] = useState<AccountsRow[]>([]);
  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [vendors, setVendors] = useState<LedgerOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [selectedRow, setSelectedRow] = useState<AccountsRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const filters = { quoteId: quoteId.trim() || undefined, status, componentType: componentType === "all" ? undefined : componentType as any };
      const [accounts, totals, ledger] = await Promise.all([
        fetchAccountsList(filters),
        fetchAccountsSummary(filters),
        fetchLedgerFromApi({ quoteId, componentType: componentType === "all" ? "all" : componentType as any, fromDate: "", toDate: "", guideName: "", hotspotName: "", activityName: "", hotelName: "", branch: "", vehicle: "", vehicleVendor: vendor === "all" ? "" : vendor, agentName: "" }),
      ]);
      setRows(accounts.filter((row) => vendor === "all" || String(row.vendorId ?? row.hotelName) === vendor));
      setSummary(totals);
      setLedgerRows(ledger);
    } catch (cause) {
      setRows([]);
      setSummary(null);
      setLedgerRows([]);
      setError(cause instanceof Error ? cause.message : "Unable to load vendor bills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      fetchPaymentModes().then(setPaymentModes),
      fetchLedgerFilterOptions({ quoteId: "", componentType: "all", fromDate: "", toDate: "" }).then((options) => setVendors(options.vendors)),
    ]).catch(() => undefined);
    void load();
  }, []);

  const handlePaySuccess = () => {
    setSelectedRow(null);
    void load();
  };

  return (
    <main className="min-h-screen bg-[#f5f8fc] p-4 text-[#17233d] md:p-6">
      <section className="rounded-lg border border-[#dbe4f1] bg-white p-5 shadow-sm"><h1 className="text-xl font-bold">Vendor Bills</h1><p className="mt-1 text-sm text-[#71809a]">Real payable component records and payment history.</p><div className="mt-5 grid gap-3 md:grid-cols-5"><Input value={quoteId} onChange={(event) => setQuoteId(event.target.value)} placeholder="Quote ID" /><Select value={componentType} onValueChange={setComponentType}><SelectTrigger><SelectValue placeholder="Component type" /></SelectTrigger><SelectContent>{["all", "hotel", "vehicle", "guide", "hotspot", "activity"].map((type) => <SelectItem key={type} value={type}>{type === "all" ? "All components" : type}</SelectItem>)}</SelectContent></Select><Select value={vendor} onValueChange={setVendor}><SelectTrigger><SelectValue placeholder="Vendor" /></SelectTrigger><SelectContent><SelectItem value="all">All vendors</SelectItem>{vendors.filter((option) => option.id !== 0).map((option) => <SelectItem key={option.id} value={String(option.id)}>{option.label}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{["all", "due", "paid"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Button onClick={() => void load()} disabled={loading} className="bg-[#245bea] hover:bg-[#1749c5]"><Search className="mr-2 h-4 w-4" />Search</Button></div></section>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-4 grid gap-3 md:grid-cols-4">{[["Total Payable", summary?.totalPayable], ["Total Paid", summary?.totalPaid], ["Outstanding", summary?.totalBalance], ["Rows", summary?.rowCount]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-[#dbe4f1] bg-white p-4 shadow-sm"><p className="text-xs text-[#71809a]">{label}</p><p className="mt-2 text-xl font-bold">{label === "Rows" ? Number(value || 0) : money(value)}</p></div>)}</section>
      <section className="mt-4 overflow-hidden rounded-lg border border-[#dbe4f1] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#e7edf5] p-4"><h2 className="font-bold">Vendor payable records ({rows.length})</h2><span className="text-xs text-[#71809a]">{ledgerRows.length} ledger records</span></div><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-xs"><thead className="bg-[#f7f9fc] text-[#71809a]"><tr>{["#", "Booking", "Type", "Vendor / Supplier", "Service Date", "Payable", "Paid", "Balance", "Status", "Action"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={10} className="px-3 py-10 text-center text-[#71809a]">{loading ? "Loading vendor bills..." : "No vendor balance due."}</td></tr> : rows.map((row, index) => <tr key={row.id} className="border-t border-[#edf1f6]"><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3">{row.quoteId}</td><td className="px-3 py-3 capitalize">{row.componentType}</td><td className="px-3 py-3">{row.hotelName || "-"}</td><td className="px-3 py-3">{row.routeDate || row.startDate}</td><td className="px-3 py-3">{money(row.payable)}</td><td className="px-3 py-3">{money(row.payout)}</td><td className="px-3 py-3 font-semibold">{money(Number(row.payable) - Number(row.payout))}</td><td className="px-3 py-3">{row.status}</td><td className="flex gap-2 px-3 py-3"><Button size="sm" variant="outline" onClick={() => navigate(`/accounts-ledgers?quoteId=${encodeURIComponent(row.quoteId)}&componentType=${row.componentType}`)}><ExternalLink className="mr-1 h-3 w-3" />Ledger</Button>{row.status === "due" && <Button size="sm" onClick={() => setSelectedRow(row)}>Pay Now</Button>}</td></tr>)}</tbody></table></div></section>
      {selectedRow && <PayNowModal row={selectedRow} paymentModes={paymentModes} onClose={() => setSelectedRow(null)} onSuccess={handlePaySuccess} />}
    </main>
  );
}
