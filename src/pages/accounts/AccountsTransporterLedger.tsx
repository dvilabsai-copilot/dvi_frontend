import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Eye,
  FileText, Loader2, RefreshCw, Search, Truck, Wallet, X,
} from "lucide-react";
import { toast } from "sonner";
import { getAuthenticatedRoleId } from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";
import {
  fetchLedgerFilterOptions, fetchLedgerFromApi,
  type LedgerRow, type LedgerOption,
} from "@/services/accountsLedgerApi";
import {
  fetchAccountsList, fetchPaymentModes,
  type AccountsRow, type PaymentModeOption,
} from "@/services/accountsManagerApi";
import { ItineraryService } from "@/services/itinerary";
import type { ItineraryDetailsResponse } from "@/pages/itinerary-details/itinerary-details.types";
import {
  getFinanceLedgerTargets,
  matchesLedgerBooking,
  countFailedRequests,
  shouldShowFinanceRequestError,
} from "./transporterLedgerLogic";

type PaymentStatus = "Paid" | "Partial" | "Pending";
type ConfirmedVehicleQuote = {
  key: string;
  booking: string;
  vendor: string;
  vehicleType: string;
  quotedAmount: number;
  assigned: boolean;
};
const uniqueBy = <T,>(items: T[], getKey: (item: T) => string): T[] => {
  const result = new Map<string, T>();
  items.forEach((item) => result.set(getKey(item), item));
  return Array.from(result.values());
};
const asRows = (data: unknown): AccountsRow[] => {
  if (Array.isArray(data)) return data as AccountsRow[];
  const wrapped = data as { data?: unknown; items?: unknown } | null;
  const found = wrapped?.data ?? wrapped?.items;
  return Array.isArray(found) ? found as AccountsRow[] : [];
};
type Filters = { vendor: string; booking: string; from: string; to: string; status: string };
type SourceRow = AccountsRow & { arrivalLocation?: string | null; departureLocation?: string | null };
type DisplayRow = {
  key: string;
  bookingId: string;
  date: string;
  transporter: string;
  vendorKey: string;
  route: string;
  payable: number;
  paid: number;
  balance: number;
  mode: string;
  status: PaymentStatus;
  transactions: LedgerRow["transactions"];
  fromAccountsOnly: boolean;
};

const blankFilters = (): Filters => ({ vendor: "all", booking: "", from: "", to: "", status: "all" });
const amount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const money = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);
const ymd = (input: string | null | undefined) => {
  const v = String(input || "").trim();
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "";
};
const dateLabel = (value: string) => {
  const d = ymd(value);
  if (!d) return "-";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const clean = (v: unknown): string => String(v ?? "").trim();
const normalize = (v: unknown): string => clean(v).toLowerCase();
const statusFor = (payable: number, paid: number, balance: number): PaymentStatus => {
  if (payable > 0 && balance <= 0.009) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
};
const vendorIdFromLedger = (row: LedgerRow): number => {
  const m = /Vendor\s*#\s*(\d+)/i.exec(clean(row.vehicleVendor));
  return m ? Number(m[1]) : 0;
};
const colors: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-100 text-emerald-800",
  Partial: "bg-amber-100 text-amber-800",
  Pending: "bg-rose-100 text-rose-800",
};
const labelCurrency = (title: string) => `${title} (INR)`;

export default function AccountsTransporterLedger() {
  const navigate = useNavigate();
  const allowed = getAuthenticatedRoleId() === USER_ROLES.ACCOUNTS;
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [accounts, setAccounts] = useState<SourceRow[]>([]);
  const [vendors, setVendors] = useState<LedgerOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [draft, setDraft] = useState<Filters>(blankFilters);
  const [applied, setApplied] = useState<Filters>(blankFilters);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmedQuotes, setConfirmedQuotes] = useState<ConfirmedVehicleQuote[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState("");
  const [bookingAliases, setBookingAliases] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"date" | "booking" | "transporter" | "route" | "debit" | "credit" | "balance" | "mode" | "status">("date");
  const [ascending, setAscending] = useState(false);
  const [selected, setSelected] = useState<DisplayRow | null>(null);

  // Exact booking searches must reach the Accounts API, not just filter
  // a previously fetched ledger snapshot. Keep invoices/payments read only.
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    const lookup = applied.booking.trim();
    setLoading(true);
    setError("");
    setNotice("");
    setAccounts([]);
    setLedger([]);
    setConfirmedQuotes([]);
    setConfirmedBooking("");
    setBookingAliases([]);

    const ledgerFilters = (quoteId: string) => ({
      quoteId, componentType: "vehicle" as const, fromDate: "", toDate: "",
      guideName: "0", hotspotName: "0", activityName: "0", hotelName: "0",
      branch: "0", vehicle: "0", vehicleVendor: "0", agentName: "0",
    });

    const getAccounts = async (query: { quoteId?: string; search?: string }) =>
      asRows(await fetchAccountsList({componentType: "vehicle", status: "all", ...query}))
        .filter((r) => r.componentType === "vehicle");

    (async () => {
      let confirmed: Record<string, unknown> | null = null;
      let confirmedFound = false;
      let aliases: string[] = lookup ? [lookup] : [""];
      let masterQuotes: ConfirmedVehicleQuote[] = [];
      try {
        if (lookup) {
          // A confirmed Booking ID can differ from its original quote ID.
          // Resolve it before asking the Accounts service to sync/read the record.
          try {
            const list = await ItineraryService.getConfirmedItineraries({
              start: 0, length: 100, search: lookup,
            });
            const entries: Record<string, unknown>[] = Array.isArray(list?.data) ? list.data : [];
            confirmed = entries.find((item) =>
              [item.booking_quote_id, item.itinerary_quote_ID, item.itinerary_booking_ID]
                .some((candidate) => normalize(candidate) === normalize(lookup)),
            ) || null;
            if (confirmed) {
              confirmedFound = true;
              aliases = uniqueBy([lookup,
                clean(confirmed.booking_quote_id), clean(confirmed.itinerary_quote_ID),
                clean(confirmed.itinerary_booking_ID),
              ].filter(Boolean), normalize);
              const confirmedId = Number(confirmed.confirmed_itinerary_plan_ID || 0);
              if (Number.isSafeInteger(confirmedId) && confirmedId > 0) {
                try {
                  const details = await ItineraryService.getConfirmedItinerary(confirmedId) as Record<string, unknown>;
                  const plan = (details?.plan || {}) as Record<string, unknown>;
                  aliases = uniqueBy([...aliases,
                    clean(details?.itinerary_quote_ID), clean(details?.quoteId),
                    clean(plan.itinerary_quote_ID),
                  ].filter(Boolean), normalize);
                } catch { /* Accounts Manager search remains authoritative. */ }
              }
            }
          } catch { /* Search still works with direct Accounts IDs. */ }
        }

        // The Accounts search endpoint knows how to resolve confirmed booking IDs
        // and sync eligible finance rows. Complete that lookup BEFORE reading the
        // ledger to avoid racing the finance component synchronization.
        const accountResults: PromiseSettledResult<AccountsRow[]>[] = [];
        if (lookup) {
          accountResults.push(...await Promise.allSettled([
            getAccounts({ search: lookup }),
          ]));
          // Exact legacy quote lookups supplement the confirmed-booking search.
          const exactResults = await Promise.allSettled(
            aliases.map((quoteId) => getAccounts({ quoteId })),
          );
          accountResults.push(...exactResults);
        } else {
          accountResults.push(...await Promise.allSettled([getAccounts({})]));
        }
        const foundAccounts = uniqueBy(accountResults
          .filter((r): r is PromiseFulfilledResult<AccountsRow[]> => r.status === "fulfilled")
          .flatMap((r) => r.value), (r) => `${normalize(r.quoteId)}|${r.id}`);

        // IMPORTANT: the unfiltered view uses ONE ledger query, not one request
        // per booking. Exact searches use both confirmed/original quote aliases
        // and the finance row's canonical quote ID.
        const targets = getFinanceLedgerTargets(lookup, aliases, foundAccounts);
        const ledgerResults = await Promise.allSettled(targets.map((quote) =>
          fetchLedgerFromApi(ledgerFilters(quote)),
        ));
        const foundLedger = uniqueBy(ledgerResults
          .filter((r): r is PromiseFulfilledResult<LedgerRow[]> => r.status === "fulfilled")
          .flatMap((r) => r.value)
          .filter((r) => r.componentType === "vehicle"),
          (r) => `${normalize(r.bookingId)}|${r.componentDetailId || r.id}|${r.totalBilled}|${r.totalPaid}`);

        // If finance isn't posted, show confirmed vehicle quotations separately.
        // These are NOT Accounts payables, payments or outstanding balances.
        if (confirmedFound && !foundLedger.length && !foundAccounts.length && confirmed) {
          const sourceId = clean(confirmed.booking_quote_id) || clean(confirmed.itinerary_quote_ID) || lookup;
          try {
            const details = await ItineraryService.getDetails(sourceId) as ItineraryDetailsResponse;
            const choices = details?.vehicleSelections || [];
            const selectedIds = new Set(choices.flatMap((c) => [
              c.selectedVendorEligibleId, ...(c.assignedVendorEligibleIds || []),
            ]).map(Number).filter((v) => Number.isFinite(v) && v > 0));
            const selected = (details?.vehicles || []).filter((v) =>
              v.isAssigned === true ||
              (Number(v.vendorEligibleId || 0) > 0 && selectedIds.has(Number(v.vendorEligibleId))),
            );
            masterQuotes = uniqueBy(selected.map((v, i) => {
              // Amount is from the itinerary quote, and may include margins.
              const raw = (v as typeof v & { grandTotal?: string | number }).grandTotal;
              const numeric = (value: unknown) => Number(String(value ?? "").replace(/[,₹\s]/g, ""));
              const grandTotal = numeric(raw);
              const totalAmount = numeric(v.totalAmount);
              return {
                key: String(v.vendorEligibleId || i),
                booking: lookup,
                vendor: clean(v.vendorName) || "Transporter name unavailable",
                vehicleType: clean(v.vehicleTypeName) || "Vehicle",
                quotedAmount: grandTotal > 0 ? grandTotal : totalAmount > 0 ? totalAmount : 0,
                assigned: v.isAssigned === true,
              };
            }).filter((v) => v.quotedAmount > 0), (v) => v.key);
          } catch { /* Quote preview is optional; finance stays authoritative. */ }
        }

        if (!alive) return;
        setAccounts(foundAccounts as SourceRow[]);
        setLedger(foundLedger);
        setConfirmedQuotes(masterQuotes);
        setConfirmedBooking(confirmedFound ? lookup : "");
        setBookingAliases(getFinanceLedgerTargets(lookup, aliases, foundAccounts).filter(Boolean));
        const failures = countFailedRequests([...accountResults, ...ledgerResults]);
        if (shouldShowFinanceRequestError(failures, foundAccounts.length + foundLedger.length)) {
          setError("Finance requests failed. The ledger may be incomplete. Check your connection and retry before relying on these totals.");
        } else if (failures > 0) {
          setNotice("Some finance sources failed to load. Displayed amounts are incomplete; refresh before using these totals.");
        } else if (!foundAccounts.length && !foundLedger.length) {
          if (lookup && confirmedFound) {
            setNotice(`Confirmed itinerary ${lookup} exists, but no Accounts vehicle finance rows were returned. Any vehicle quotation below is NOT a posted payable or payment.`);
          } else if (lookup) {
            setNotice(`No transporter finance records for ${lookup}. Check the booking ID and confirmed transporter assignment.`);
          }
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? `Unable to read vehicle finance: ${e.message}` : "Unable to load vehicle finance records.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [allowed, applied.booking, reload]);

  // Ancillary dropdowns are loaded separately; failure must not blank the ledger.
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    void Promise.allSettled([
      fetchLedgerFilterOptions({ quoteId: "", componentType: "vehicle", fromDate: "", toDate: "" }),
      fetchPaymentModes(),
    ]).then(([options, modes]) => {
      if (!alive) return;
      if (options.status === "fulfilled") setVendors(options.value.vendors.filter((v) => v.id > 0));
      if (modes.status === "fulfilled") setPaymentModes(modes.value);
    });
    return () => { alive = false; };
  }, [allowed, reload]);

  const rows = useMemo<DisplayRow[]>(() => {
    const vendorNames = new Map(vendors.map((v) => [v.id, v.label]));
    const modeNames = new Map(paymentModes.map((m) => [m.id, m.label]));
    const accountsByDetail = new Map<string, SourceRow>();
    const accountsByComponentId = new Map<number, SourceRow>();
    const accountsByVendor = new Map<string, SourceRow>();
    for (const row of accounts) {
      const quote = normalize(row.quoteId);
      accountsByDetail.set(`${quote}|${row.id}`, row);
      if (row.id > 0) accountsByComponentId.set(row.id, row);
      if (row.vendorId) accountsByVendor.set(`${quote}|${row.vendorId}`, row);
    }
    const inLedger = new Set<string>();
    const result: DisplayRow[] = ledger.map((row, index) => {
      const quote = normalize(row.bookingId);
      const vendorId = vendorIdFromLedger(row);
      const account = (row.componentDetailId ? accountsByComponentId.get(row.componentDetailId) : undefined)
        || accountsByDetail.get(`${quote}|${row.componentDetailId || ""}`)
        || (vendorId ? accountsByVendor.get(`${quote}|${vendorId}`) : undefined);
      if (account) inLedger.add(`${normalize(account.quoteId)}|${account.id}`);
      if (row.componentDetailId) inLedger.add(`component|${row.componentDetailId}`);
      const effectiveId = vendorId || Number(account?.vendorId || 0);
      const name = clean(account?.vendorName) || vendorNames.get(effectiveId)
        || clean(row.vehicleVendor) || "Unknown transporter";
      const route = [clean(account?.arrivalLocation || account?.arrivalStart), clean(account?.departureLocation || account?.destinationEnd)]
        .filter(Boolean).join(" - ") || "-";
      const payments = (row.transactions || []).filter((tx) => amount(tx.amount) > 0);
      const recent = [...payments].sort((a, b) => ymd(b.date).localeCompare(ymd(a.date)))[0];
      const payable = amount(row.totalBilled);
      const paid = amount(row.totalPaid);
      const balance = Math.max(0, amount(row.totalBalance));
      return {
        key: `ledger-${quote}-${row.componentDetailId || index}`,
        bookingId: row.bookingId, date: ymd(account?.routeDate || row.startDate),
        transporter: name, vendorKey: effectiveId ? String(effectiveId) : `name:${name}`,
        route, payable, paid, balance, status: statusFor(payable, paid, balance),
        mode: recent ? modeNames.get(recent.modeOfPayId) || (recent.modeOfPayId ? `Mode #${recent.modeOfPayId}` : "-") : "-",
        transactions: row.transactions || [], fromAccountsOnly: false,
      };
    });
    // The Accounts manager is also a valid source for component finance rows.
    // Show those rows when the legacy ledger endpoint has not returned them yet.
    for (const row of accounts) {
      const id = `${normalize(row.quoteId)}|${row.id}`;
      if (inLedger.has(id) || inLedger.has(`component|${row.id}`)) continue;
      const payable = amount(row.amount);
      const paid = amount(row.payout);
      const balance = Math.max(0, amount(row.payable));
      const name = clean(row.vendorName || row.hotelName) || "Unknown transporter";
      result.push({
        key: `accounts-${id}`, bookingId: row.quoteId,
        date: ymd(row.routeDate || row.startDate),
        transporter: name,
        vendorKey: row.vendorId ? String(row.vendorId) : `name:${name}`,
        route: [clean(row.arrivalLocation || row.arrivalStart), clean(row.departureLocation || row.destinationEnd)]
          .filter(Boolean).join(" - ") || "-",
        payable, paid, balance, status: statusFor(payable, paid, balance),
        mode: "-", transactions: [], fromAccountsOnly: true,
      });
    }
    return result;
  }, [ledger, accounts, vendors, paymentModes]);

  const vendorChoices = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => map.set(String(v.id), v.label));
    rows.forEach((r) => map.set(r.vendorKey, r.transporter));
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [vendors, rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (applied.vendor !== "all" && r.vendorKey !== applied.vendor) return false;
    if (applied.booking && !matchesLedgerBooking(r.bookingId, applied.booking, bookingAliases)) return false;
    if (applied.from && (!r.date || r.date < applied.from)) return false;
    if (applied.to && (!r.date || r.date > applied.to)) return false;
    if (applied.status !== "all" && normalize(r.status) !== applied.status) return false;
    return true;
  }).sort((a, b) => {
    const values = {
      date: [a.date, b.date], booking: [a.bookingId, b.bookingId],
      transporter: [a.transporter, b.transporter], route: [a.route, b.route],
      debit: [a.payable, b.payable], credit: [a.paid, b.paid],
      balance: [a.balance, b.balance], mode: [a.mode, b.mode],
      status: [a.status, b.status],
    };
    const [x, y] = values[sortKey];
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return ascending ? cmp : -cmp;
  }), [rows, applied, bookingAliases, sortKey, ascending]);

  const totals = useMemo(() => filtered.reduce((sum, r) => ({
    payable: sum.payable + r.payable, paid: sum.paid + r.paid, balance: sum.balance + r.balance,
  }), { payable: 0, paid: 0, balance: 0 }), [filtered]);
  const lastPayment = useMemo(() => filtered.flatMap((r) => r.transactions
    .filter((t) => amount(t.amount) > 0).map((t) => ({ ...t, transporter: r.transporter })))
    .sort((a, b) => ymd(b.date).localeCompare(ymd(a.date)))[0], [filtered]);
  const pending = filtered.filter((r) => r.balance > 0.009).length;
  const transporters = new Set(filtered.map((r) => r.vendorKey)).size;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shownPage = Math.min(page, pages);
  const visible = filtered.slice((shownPage - 1) * pageSize, shownPage * pageSize);

  const search = useCallback(() => {
    if (draft.from && draft.to && draft.from > draft.to) {
      toast.error("Start date must be on or before end date");
      return;
    }
    setApplied({ ...draft });
    setPage(1);
    if (draft.booking.trim() === applied.booking.trim()) setReload((v) => v + 1);
  }, [draft, applied.booking]);
  const reset = useCallback(() => {
    setDraft(blankFilters());
    setApplied(blankFilters());
    setPage(1);
    setReload((v) => v + 1);
  }, []);
  const sortBy = (next: typeof sortKey) => {
    if (sortKey === next) setAscending((value) => !value);
    else { setSortKey(next); setAscending(true); }
    setPage(1);
  };

  const control = "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
  const button = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const headerButton = (key: typeof sortKey, text: string) => (
    <button type="button" className="flex items-center gap-1 whitespace-nowrap font-semibold hover:text-violet-700"
      title={`Sort by ${text}`} onClick={() => sortBy(key)}>{text}<span className="text-slate-400">{sortKey === key ? ascending ? "^" : "v" : ""}</span></button>
  );

  if (!allowed) return <div className="p-8 text-slate-600">Transporter Ledger is available to Accounts users only.</div>;
  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f8f9fc] px-4 pb-8 pt-4 text-[#1d2740] lg:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Transporter Ledger</h1>
          <p className="mt-1 text-xs text-slate-500">Accounts & Finance / Transporter</p></div>
        <button type="button" className={`${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          onClick={() => setReload((v) => v + 1)} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""}/> Refresh
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-12">
          <label className="block text-xs font-semibold text-slate-700 xl:col-span-3">Transporter Name
            <select className={`${control} mt-2`} value={draft.vendor} onChange={(e) => setDraft((s) => ({ ...s, vendor: e.target.value }))}>
              <option value="all">All Transporters</option>
              {vendorChoices.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700 xl:col-span-2">Booking ID
            <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"/>
              <input className={`${control} pl-9`} type="search" placeholder="Search booking ID"
                value={draft.booking} onChange={(e) => setDraft((s) => ({ ...s, booking: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") search(); }}/></div>
          </label>
          <div className="xl:col-span-3"><div className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
            <CalendarDays size={14}/> Travel Date Range</div>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="From travel date" type="date" className={control} value={draft.from}
                onChange={(e) => setDraft((s) => ({ ...s, from: e.target.value }))}/>
              <input aria-label="To travel date" type="date" className={control} value={draft.to}
                onChange={(e) => setDraft((s) => ({ ...s, to: e.target.value }))}/>
            </div>
          </div>
          <label className="block text-xs font-semibold text-slate-700 xl:col-span-2">Payment Status
            <select className={`${control} mt-2`} value={draft.status}
              onChange={(e) => setDraft((s) => ({ ...s, status: e.target.value }))}>
              <option value="all">All Status</option><option value="paid">Paid</option>
              <option value="partial">Partial</option><option value="pending">Pending</option>
            </select>
          </label>
          <div className="flex gap-2 xl:col-span-2">
            <button type="button" disabled={loading} onClick={search}
              className={`${button} flex-1 bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white hover:opacity-90`}>
              {loading ? <Loader2 size={15} className="animate-spin"/> : <Search size={15}/>} Search
            </button>
            <button type="button" disabled={loading} onClick={reset} title="Reset all filters" aria-label="Reset all filters"
              className={`${button} border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50`}>
              <RefreshCw size={16}/>
            </button>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && !error && <div role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <div className="flex flex-wrap items-center justify-between gap-2"><span>{notice}</span>
          {applied.status !== "all" && <button type="button" className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold"
            onClick={() => { setDraft((f) => ({ ...f, status: "all" })); setApplied((f) => ({ ...f, status: "all" })); }}>Show all statuses</button>}
        </div></div>}
      {confirmedQuotes.length > 0 && <section className="mt-3 rounded-xl border border-violet-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold text-slate-800">Confirmed itinerary vehicle quotations</h2>
          <p className="mt-1 text-xs text-slate-600">Source: confirmed itinerary {confirmedBooking}. Quoted vehicle amounts are not proof of an Accounts payable or payment.</p></div>
          <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">Finance not posted</span>
        </div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-violet-50 text-xs text-slate-700"><tr>
          <th className="p-2">Transporter</th><th className="p-2">Vehicle</th><th className="p-2 text-right">Quoted cost (INR)</th><th className="p-2">Finance status</th>
        </tr></thead><tbody className="divide-y divide-slate-100">{confirmedQuotes.map((v) => <tr key={v.key}>
          <td className="p-2">{v.vendor}</td><td className="p-2">{v.vehicleType}</td>
          <td className="p-2 text-right font-bold">{money(v.quotedAmount)}</td><td className="p-2 text-amber-700">Not in Accounts ledger</td>
        </tr>)}</tbody></table></div>
      </section>}
      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Payable", value: money(totals.payable), icon: Wallet, skin: "border-sky-100 bg-sky-50", fg: "text-blue-700" },
          { label: "Total Paid", value: money(totals.paid), icon: CheckCircle2, skin: "border-emerald-100 bg-emerald-50", fg: "text-emerald-700" },
          { label: "Outstanding Balance", value: money(totals.balance), icon: Wallet, skin: "border-amber-100 bg-amber-50", fg: "text-orange-700" },
          { label: "Transporters", value: String(transporters), icon: Truck, skin: "border-purple-100 bg-purple-50", fg: "text-purple-700" },
        ].map((card) => {
          const Icon = card.icon;
          return <div key={card.label} className={`flex items-start justify-between rounded-2xl border p-4 shadow-sm ${card.skin}`}>
            <div className="min-w-0"><div className="text-sm font-semibold text-slate-700">{card.label}</div>
              <div className={`mt-3 break-words text-xl font-extrabold ${card.fg}`}>{loading ? "-" : card.value}</div></div>
            <div className="rounded-xl bg-white p-3 shadow-sm"><Icon className={card.fg} size={21}/></div>
          </div>;
        })}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:grid-cols-3 md:divide-x md:divide-slate-200">
        <div className="flex items-center gap-3 md:pr-4"><div className="rounded-xl bg-violet-50 p-3 text-violet-700"><CalendarDays size={20}/></div>
          <div><p className="text-sm font-semibold">Last Payment Date</p>
            <p className="mt-1 font-bold text-violet-700">{lastPayment ? dateLabel(lastPayment.date) : "-"}</p>
            <p className="text-xs text-slate-500">{lastPayment ? `${money(amount(lastPayment.amount))} to ${lastPayment.transporter}` : "No payment recorded"}</p></div></div>
        <div className="flex items-center gap-3 md:px-4"><div className="rounded-xl bg-violet-50 p-3 text-violet-700"><FileText size={20}/></div>
          <div><p className="text-sm font-semibold">Pending Settlements</p><p className="mt-1 font-bold text-violet-700">{pending}</p>
            <p className="text-xs text-slate-500">Amount: {money(totals.balance)}</p></div></div>
        <div className="flex items-center gap-3 md:pl-4"><div className="rounded-xl bg-violet-50 p-3 text-violet-700"><Wallet size={20}/></div>
          <div><p className="text-sm font-semibold">Recent Settlement</p>
            <p className="mt-1 font-bold text-violet-700">{lastPayment ? money(amount(lastPayment.amount)) : "-"}</p>
            <p className="text-xs text-slate-500">{lastPayment ? `Paid on ${dateLabel(lastPayment.date)} (${lastPayment.transporter})` : "No settlement available"}</p></div></div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div><h2 className="text-lg font-bold">Ledger Transactions</h2>
            <p className="mt-1 text-xs text-slate-500">Confirmed vehicle ledger and transporter payment balances</p></div>
          <label className="flex items-center gap-2 text-sm text-slate-600">Show
            <select value={pageSize} className="rounded-lg border border-slate-200 px-2 py-2"
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[10, 25, 50, 100].map((v) => <option key={v} value={v}>{v}</option>)}
            </select> entries
          </label>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1070px] text-left text-xs">
            <thead className="bg-[#f3eaff] text-[#34314e]"><tr>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("date", "Date")}</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("booking", "Booking ID")}</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("transporter", "Transporter")}</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("route", "Route")}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">{headerButton("debit", labelCurrency("Debit"))}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">{headerButton("credit", labelCurrency("Credit"))}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">{headerButton("balance", labelCurrency("Balance"))}</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("mode", "Mode")}</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("status", "Status")}</th>
              <th className="whitespace-nowrap px-3 py-3 text-center">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={10} className="px-3 py-12 text-center text-slate-500"><Loader2 size={22} className="mx-auto mb-2 animate-spin"/>Loading transporter ledger...</td></tr>
                : !visible.length ? <tr><td colSpan={10} className="px-3 py-12 text-center text-slate-500">{error ? "Unable to load records." : applied.status !== "all" && confirmedQuotes.length > 0 ? "No posted finance transactions match this payment status. See confirmed quotations above." : "No transporter finance records match the selected filters."}</td></tr>
                : visible.map((row) => <tr key={row.key} className="hover:bg-violet-50/60">
                  <td className="whitespace-nowrap px-3 py-3">{dateLabel(row.date)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-violet-700">{row.bookingId}</td>
                  <td className="px-3 py-3 font-medium">{row.transporter}</td>
                  <td className="px-3 py-3">{row.route}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{money(row.payable)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{money(row.paid)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{money(row.balance)}</td>
                  <td className="px-3 py-3">{row.mode}</td>
                  <td className="px-3 py-3"><span className={`rounded-lg px-2 py-1 font-semibold ${colors[row.status]}`}>{row.status}</span></td>
                  <td className="px-3 py-3 text-center"><button type="button" aria-label={`View ${row.bookingId} details`} title="View payment details"
                    className="rounded-lg p-2 text-violet-700 hover:bg-violet-100" onClick={() => setSelected(row)}><Eye size={16}/></button></td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>{filtered.length ? `Showing ${(shownPage - 1) * pageSize + 1} to ${Math.min(shownPage * pageSize, filtered.length)} of ${filtered.length} entries` : "Showing 0 entries"}</span>
          <div className="flex gap-1">
            <button type="button" disabled={shownPage === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}
              aria-label="Previous page" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16}/></button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const min = Math.max(1, Math.min(pages - 4, shownPage - 2));
              const n = min + i;
              return <button key={n} type="button" onClick={() => setPage(n)}
                className={`min-w-8 rounded-lg border px-2 py-2 ${shownPage === n ? "border-violet-700 bg-violet-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{n}</button>;
            })}
            <button type="button" disabled={shownPage >= pages} onClick={() => setPage((v) => Math.min(pages, v + 1))}
              aria-label="Next page" className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16}/></button>
          </div>
        </div>
      </section>

      {selected && <div role="presentation" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setSelected(null)}>
        <section role="dialog" aria-modal="true" aria-label="Transporter ledger details" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Transporter Ledger Details</h2>
            <p className="mt-1 text-sm text-slate-500">{selected.transporter} / {selected.bookingId}</p></div>
            <button type="button" aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setSelected(null)}><X size={20}/></button>
          </div>
          <div className="my-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-sky-50 p-3">Payable<div className="mt-1 font-bold">{money(selected.payable)}</div></div>
            <div className="rounded-xl bg-emerald-50 p-3">Paid<div className="mt-1 font-bold">{money(selected.paid)}</div></div>
            <div className="rounded-xl bg-orange-50 p-3">Balance<div className="mt-1 font-bold">{money(selected.balance)}</div></div>
          </div>
          <h3 className="mb-2 font-semibold">Payment History</h3>
          {selected.transactions.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-violet-50"><tr><th className="p-2">Date</th><th className="p-2">Amount</th><th className="p-2">Mode</th><th className="p-2">UTR</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{selected.transactions.map((t, index) => <tr key={`${t.date}-${index}`}>
              <td className="p-2">{dateLabel(t.date)}</td><td className="p-2">{money(amount(t.amount))}</td>
              <td className="p-2">{paymentModes.find((m) => m.id === t.modeOfPayId)?.label || (t.modeOfPayId ? `Mode #${t.modeOfPayId}` : "-")}</td>
              <td className="p-2">{t.utrNo || "-"}</td>
            </tr>)}</tbody>
          </table></div> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            {selected.fromAccountsOnly ? "Accounts finance data is available, but payment history is not included in this record." : "No payment transactions recorded."}
          </p>}
          <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => navigate(`/accounts-ledger?componentType=vehicle&quoteId=${encodeURIComponent(selected.bookingId)}`)}>
            <FileText size={16}/> Open Full Ledger
          </button>
        </section>
      </div>}
    </main>
  );
}
