import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Eye, FileSpreadsheet,
  FileText, Loader2, Search, Truck, Wallet, X,
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
import { buildRouteSummary, itineraryExcelRows } from "./transporterItinerary";

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
  endDate: string;
  arrivalLocation: string;
  dropLocation: string;
  confirmedPlanId?: number;
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







// DVI_TRANSPORTER_DARK_PAYMENT_SUMMARY_V1
// Apply Excel OOXML styles after SheetJS CE serializes the workbook.
function styleTransporterPaymentWorkbook(XLSX: typeof import("xlsx"), workbook: import("xlsx").WorkBook, titleRow: number): Uint8Array {
  const cfb = (XLSX as unknown as { CFB: {
    read: (data: Uint8Array, options: { type: string }) => unknown;
    find: (archive: unknown, name: string) => { content: Uint8Array; size: number } | null;
    write: (archive: unknown, options: { type: string; fileType: string; compression: boolean }) => Uint8Array | number[] | ArrayBuffer;
  } }).CFB;
  if (!cfb) throw new Error("Excel ZIP support is unavailable.");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: false });
  const archive = cfb.read(new Uint8Array(bytes), { type: "array" });
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const readXml = (name: string) => {
    const entry = cfb.find(archive, name) || cfb.find(archive, name.split("/").pop()!);
    if (!entry) throw new Error(`Excel entry missing: ${name}`);
    return { entry, xml: decoder.decode(Uint8Array.from(entry.content)) };
  };
  const setXml = (entry: { content: Uint8Array; size: number }, xml: string) => {
    entry.content = encoder.encode(xml);
    entry.size = entry.content.length;
  };
  const styles = readXml("xl/styles.xml");
  let styleXml = styles.xml;
  // Append, never replace, existing styles (other worksheets retain their format).
  const appendStyle = (tag: string, item: string): number => {
    const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`);
    const match = re.exec(styleXml);
    const count = match?.[1].match(/\bcount="(\d+)"/);
    if (!match || !count) throw new Error(`Excel style collection missing: ${tag}`);
    const id = Number(count[1]);
    const attrs = match[1].replace(count[0], `count="${id + 1}"`);
    styleXml = styleXml.slice(0, match.index) + `<${tag}${attrs}>${match[2]}${item}</${tag}>` + styleXml.slice(match.index + match[0].length);
    return id;
  };
  const bold = appendStyle("fonts", '<font><b/><sz val="11"/><color rgb="FFE5E5E5"/><name val="Calibri"/><family val="2"/></font>');
  const normal = appendStyle("fonts", '<font><sz val="11"/><color rgb="FFE5E5E5"/><name val="Calibri"/><family val="2"/></font>');
  const fill = appendStyle("fills", '<fill><patternFill patternType="solid"><fgColor rgb="FF111111"/><bgColor indexed="64"/></patternFill></fill>');
  const border = appendStyle("borders", '<border><left/><right/><top/><bottom style="thin"><color rgb="FF292929"/></bottom><diagonal/></border>');
  const xf = (font: number, num: number, indent: number) => `<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="${indent}"/></xf>`;
  const headingStyle = appendStyle("cellXfs", xf(bold, 0, 0));
  const labelStyle = appendStyle("cellXfs", xf(bold, 0, 0));
  const numberStyle = appendStyle("cellXfs", xf(normal, 4, 0)); // built-in #,##0.00
  const statusStyle = appendStyle("cellXfs", xf(normal, 0, 0));
  setXml(styles.entry, styleXml);
  if (workbook.SheetNames[0] !== "Itinerary") throw new Error("Expected Itinerary to be the first Excel sheet.");
  const sheet = readXml("xl/worksheets/sheet1.xml");
  let sheetXml = sheet.xml;
  for (let offset = 0; offset < 3; offset++) {
    const rowNumber = titleRow + offset + 1; // Excel uses one-based row indexes.
    const rowPattern = new RegExp(`<row\\b(?=[^>]*\\br="${rowNumber}")[^>]*>([\\s\\S]*?)</row>`);
    const match = rowPattern.exec(sheetXml);
    if (!match) throw new Error(`Payment summary Excel row missing: ${rowNumber}`);
    let inner = match[1];
    for (let col = 0; col < 4; col++) {
      const address = String.fromCharCode(65 + col) + rowNumber;
      const style = offset === 0 ? headingStyle : offset === 1 ? labelStyle : col < 3 ? numberStyle : statusStyle;
      const cell = new RegExp(`<c\\b(?=[^>]*\\br="${address}")([^>]*?)(/?)>`);
      if (cell.test(inner)) {
        inner = inner.replace(cell, (_whole, attrs: string, slash: string) => `<c${attrs.replace(/\s+s="[^"]*"/g, "")} s="${style}"${slash}>`);
      } else if (offset === 0 && col > 0) {
        // Fill the entire merged title range, not just its anchor cell.
        inner += `<c r="${address}" s="${style}"/>`;
      } else throw new Error(`Payment summary Excel cell missing: ${address}`);
    }
    const startTag = match[0].slice(0, match[0].indexOf(">") + 1);
    const rowTag = startTag.replace(/\s+(?:ht|customHeight)="[^"]*"/g, "").replace(/>$/, ` ht="${offset === 0 ? 27 : 24}" customHeight="1">`);
    sheetXml = sheetXml.slice(0, match.index) + rowTag + inner + "</row>" + sheetXml.slice(match.index + match[0].length);
  }
  setXml(sheet.entry, sheetXml);
  const result = cfb.write(archive, { type: "array", fileType: "zip", compression: true });
  return result instanceof ArrayBuffer ? new Uint8Array(result) : Uint8Array.from(result);
}

// DVI_VENDOR_LEDGER_EXCEL_V1
// Export every selected finance row in table order, independently of UI pagination.
async function prepareVendorLedgerExport(
  entries: readonly DisplayRow[],
  vendorKey: string,
  getRoute: (row: DisplayRow) => Promise<string>,
  getCustomer: (row: DisplayRow) => Promise<string>,
) {
  const selectedRows = entries.filter(row => row.vendorKey === vendorKey);
  const data: (string | number)[][] = new Array(selectedRows.length);
  let cursor = 0;
  let unavailableRoutes = 0;
  const worker = async () => {
    while (cursor < selectedRows.length) {
      const index = cursor++;
      const row = selectedRows[index];
      let route: string;
      try { route = await getRoute(row); }
      catch {
        unavailableRoutes++;
        route = `(Arr) ${row.arrivalLocation || "Unavailable"} > (Drop) ${row.dropLocation || "Unavailable"} [Intermediate route unavailable]`;
      }
      const customer = await getCustomer(row).catch(() => "Unavailable");
      data[index] = [row.bookingId, customer, row.date, row.endDate, route, row.payable, row.paid, row.balance, row.status];
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, selectedRows.length) }, worker));
  const totals = selectedRows.reduce((sum, row) => ({
    purchase: sum.purchase + row.payable,
    sale: sum.sale + row.paid,
    balance: sum.balance + row.balance,
  }), { purchase: 0, sale: 0, balance: 0 });
  return { data, totals, unavailableRoutes };
}

// DVI_VENDOR_LEDGER_EXCEL_CLEAN_V2
function createVendorLedgerWorkbook(
  XLSX: typeof import("xlsx"),
  vendor: string,
  preview: boolean,
  result: Awaited<ReturnType<typeof prepareVendorLedgerExport>>,
) {
  const { data, totals } = result;
  const meta: (string | number)[][] = [
    [preview ? "TRANSPORTER LEDGER - TEST DATA" : "TRANSPORTER LEDGER"],
    ["Transporter", vendor],
    ["Records", data.length],
    [],
  ];
  const header = meta.length;
  const sheet = XLSX.utils.aoa_to_sheet([
    ...meta,
    ["Booking ID", "Customer", "Start Date", "End Date", "Route", "Purchase(INR)", "Paid(INR)", "Balance(INR)", "Status"],
    ...data,
    ["TOTAL", "", "", "", "", totals.purchase, totals.sale, totals.balance, ""],
  ]);
  sheet["!cols"] = [21, 27, 15, 15, 85, 19, 19, 19, 15].map(wch => ({ wch }));
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 1 }, e: { r: 1, c: 8 } },
  ];
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: header, c: 0 }, e: { r: header + data.length, c: 8 } }) };
  for (let r = header + 1; r <= header + data.length + 1; r++) {
    for (let c = 5; c <= 7; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell) cell.z = "#,##0.00";
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Transporter Ledger");
  return workbook;
}

// DVI_TRANSPORTER_CUSTOMER_COLUMNS_V1
async function resolveTransporterCustomer(
  bookingId: string,
  confirmedPlanId: number | undefined,
  lookup: (booking: string) => Promise<unknown>,
): Promise<string> {
  const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const booking = normalized(bookingId);
  if (!booking) return "Unavailable";
  const response = await lookup(bookingId);
  const data = (response as { data?: unknown } | null)?.data;
  const records = Array.isArray(data) ? data as Record<string, unknown>[] : [];
  const matches = records.filter(record => confirmedPlanId && confirmedPlanId > 0
    ? Number(record.confirmed_itinerary_plan_ID) === confirmedPlanId
    : [record.booking_quote_id, record.itinerary_quote_ID, record.itinerary_booking_ID].some(value => normalized(value) === booking));
  if (matches.length !== 1) return "Unavailable";
  const name = String(matches[0].primary_customer_name ?? "").trim();
  return name && !/^(n\/a|na|none|null|unknown|-)$/i.test(name) ? name : "Unavailable";
}

export default function AccountsTransporterLedger() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<DisplayRow | null>(null);
  const preview = false;
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
  const [sortKey, setSortKey] = useState<"date" | "endDate" | "booking" | "route" | "debit" | "credit" | "balance" | "status">("date");
  const [ascending, setAscending] = useState(false);
  const itineraryCache = useMemo(() => new Map<string, Promise<ItineraryDetailsResponse>>(), [reload]);
  const [routeData, setRouteData] = useState<{ generation: number; entries: Record<string, ItineraryDetailsResponse | null> }>({ generation: -1, entries: {} });
  const [exporting, setExporting] = useState<string | null>(null);

  const loadItinerary = useCallback((bookingId: string, confirmedPlanId?: number) => {

    const key = `${normalize(bookingId)}|${confirmedPlanId || 0}`;
    const existing = itineraryCache.get(key);
    if (existing) return existing;
    const request = (async () => {
      const validate = (data: ItineraryDetailsResponse) => {
        const sameId = confirmedPlanId && Number(data?.confirmed_itinerary_plan_ID) === confirmedPlanId;
        const sameQuote = normalize(data?.quoteId) === normalize(bookingId);
        if (!(sameId || sameQuote) || data?.isConfirmed !== true || !Array.isArray(data.days) || !data.days.length) {
          throw new Error("Confirmed day-wise itinerary could not be verified for this booking.");
        }
        if (confirmedPlanId && data.confirmed_itinerary_plan_ID && Number(data.confirmed_itinerary_plan_ID) !== confirmedPlanId) {
          throw new Error("Confirmed plan ID does not match the ledger booking.");
        }
        return data;
      };
      try {
        return validate(await ItineraryService.getDetails(bookingId) as ItineraryDetailsResponse);
      } catch (error) {
        // If the finance ID differs from the itinerary quote, use only an exact
        // confirmed plan identity (or an exact booking match), never a nearby revision.
        const list = await ItineraryService.getConfirmedItineraries({ start: 0, length: 100, search: bookingId });
        const records: Record<string, unknown>[] = Array.isArray(list?.data) ? list.data : [];
        const match = records.find(r => confirmedPlanId ? Number(r.confirmed_itinerary_plan_ID) === confirmedPlanId :
          [r.booking_quote_id, r.itinerary_quote_ID, r.itinerary_booking_ID].some(id => normalize(id) === normalize(bookingId)));
        const alias = clean(match?.booking_quote_id);
        if (!alias || normalize(alias) === normalize(bookingId)) throw error;
        const data = await ItineraryService.getDetails(alias) as ItineraryDetailsResponse;
        const matchedId = Number(match?.confirmed_itinerary_plan_ID || 0);
        if (!matchedId || Number(data?.confirmed_itinerary_plan_ID) !== matchedId) throw error;
        if (data?.isConfirmed !== true || !Array.isArray(data.days) || !data.days.length) throw error;
        return data;
      }
    })();
    itineraryCache.set(key, request);
    void request.catch(() => { if (itineraryCache.get(key) === request) itineraryCache.delete(key); });
    return request;
  }, [itineraryCache, preview]);

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
  }, [allowed, applied.booking, reload, preview]);

  // Ancillary dropdowns are loaded separately; failure must not blank the ledger.
  useEffect(() => {
    if (!allowed || preview) return;
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
  }, [allowed, reload, preview]);

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
        bookingId: row.bookingId, date: ymd(account?.startDate || row.startDate || account?.routeDate),
        endDate: ymd(account?.endDate || row.endDate),
        arrivalLocation: clean(account?.arrivalLocation || account?.arrivalStart || row.arrival),
        dropLocation: clean(account?.departureLocation || account?.destinationEnd),
        confirmedPlanId: row.confirmedItineraryPlanId,
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
        date: ymd(row.startDate || row.routeDate), endDate: ymd(row.endDate),
        arrivalLocation: clean(row.arrivalLocation || row.arrivalStart),
        dropLocation: clean(row.departureLocation || row.destinationEnd),
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
      date: [a.date, b.date], endDate: [a.endDate, b.endDate], booking: [a.bookingId, b.bookingId],
      route: [a.route, b.route],
      debit: [a.payable, b.payable], credit: [a.paid, b.paid],
      balance: [a.balance, b.balance],
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
  const customerCache = useMemo(() => new Map<string, Promise<string>>(), [reload]);
  const [customerData, setCustomerData] = useState<{ generation: number; entries: Record<string, string> }>({ generation: -1, entries: {} });
  const loadCustomer = useCallback((bookingId: string, confirmedPlanId?: number): Promise<string> => {

    const key = normalize(bookingId) + "|" + (confirmedPlanId || 0);
    const existing = customerCache.get(key);
    if (existing) return existing;
    const request = resolveTransporterCustomer(bookingId, confirmedPlanId,
      booking => ItineraryService.getConfirmedItineraries({ start: 0, length: 100, search: booking }));
    customerCache.set(key, request);
    void request.catch(() => { if (customerCache.get(key) === request) customerCache.delete(key); });
    return request;
  }, [customerCache, preview]);
  const routeRequests = JSON.stringify(visible.map(r => [r.bookingId, r.confirmedPlanId || 0]));
  useEffect(() => {
    if (!allowed || loading) return;
    let alive = true;
    const requests = JSON.parse(routeRequests) as [string, number][];
    const unique = new Map(requests.map(([booking, id]) => [`${normalize(booking)}|${id}`, [booking, id] as const]));
    const queue = [...unique.entries()];
    let cursor = 0;
    // Limit itinerary requests to the visible page and four at a time.
    const worker = async () => {
      while (alive && cursor < queue.length) {
        const [key, [booking, id]] = queue[cursor++];
        let data: ItineraryDetailsResponse | null = null;
        try { data = await loadItinerary(booking, id || undefined); } catch { /* Show unavailable, not invented routes. */ }
        if (alive) setRouteData(previous => ({ generation: reload, entries: { ...(previous.generation === reload ? previous.entries : {}), [key]: data } }));
      }
    };
    void Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
    return () => { alive = false; };
  }, [allowed, loading, routeRequests, loadItinerary, reload]);

  useEffect(() => {
    if (!allowed || loading) return;
    let alive = true;
    const requests = JSON.parse(routeRequests) as [string, number][];
    const unique = [...new Map(requests.map(([booking, id]) => [normalize(booking) + "|" + id, [booking, id] as const])).entries()];
    let cursor = 0;
    const worker = async () => {
      while (alive && cursor < unique.length) {
        const [key, [booking, id]] = unique[cursor++];
        let name = "Unavailable";
        try { name = await loadCustomer(booking, id || undefined); } catch { /* Leave unknown names explicitly unavailable. */ }
        if (alive) setCustomerData(previous => ({ generation: reload, entries: { ...(previous.generation === reload ? previous.entries : {}), [key]: name } }));
      }
    };
    void Promise.all(Array.from({ length: Math.min(4, unique.length) }, worker));
    return () => { alive = false; };
  }, [allowed, loading, routeRequests, loadCustomer, reload]);
  const customerFor = (row: DisplayRow) => {
    const key = normalize(row.bookingId) + "|" + (row.confirmedPlanId || 0);
    return (customerData.generation === reload ? customerData.entries[key] : undefined) || "Loading...";
  };

  const routeFor = (row: DisplayRow) => {
    const key = `${normalize(row.bookingId)}|${row.confirmedPlanId || 0}`;
    const data = routeData.generation === reload ? routeData.entries[key] : undefined;
    if (!data) return { label: `(Arr) ${row.arrivalLocation || "-"} > (Drop) ${row.dropLocation || "-"}`, note: data === null ? "Intermediate route unavailable; refresh to retry." : "Loading route..." };
    const route = buildRouteSummary(data, row.arrivalLocation, row.dropLocation);
    return { label: route.label, note: route.nightsVerified ? "" : "Night counts unavailable for this route." };
  };
  const downloadItinerary = async (row: DisplayRow) => {
    if (exporting) return;
    setExporting(row.key);
    try {
      const itinerary = await loadItinerary(row.bookingId, row.confirmedPlanId);
      const { summary, schedule, activities } = itineraryExcelRows(row.bookingId, itinerary, row.arrivalLocation, row.dropLocation);
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const append = (name: string, rows: (string | number)[][], widths: number[]) => {
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = widths.map(wch => ({ wch }));
        XLSX.utils.book_append_sheet(workbook, sheet, name);
      };
      // Export the same finance amounts and status displayed in this booking row.
      const itinerarySummaryRows: (string | number)[][] = [...(preview ? [["TEST DATA", "Fictional itinerary; not a real booking"]] : []), ...summary, ["Start date", row.date], ["End date", row.endDate]];
      // Balanced itinerary summary and finance columns (local Excel layout).
      // Keep text in a merged B:D area so finance columns stay equally sized.
      // Split long route/summary values into continuation rows without losing text.
      const summaryRows: (string | number)[][] = [];
      for (const [label, value] of itinerarySummaryRows) {
        if (typeof value !== "string" || value.length <= 60) {
          summaryRows.push([label, value ?? ""]);
          continue;
        }
        let remaining = value;
        let first = true;
        while (remaining.length > 60) {
          const space = remaining.lastIndexOf(" ", 60);
          const cut = space > 0 ? space : 60;
          summaryRows.push([first ? label : "", remaining.slice(0, cut)]);
          remaining = remaining.slice(cut).trimStart();
          first = false;
        }
        summaryRows.push([first ? label : "", remaining]);
      }
      const financeTitleRow = summaryRows.length + 2;
      const financeValueRow = financeTitleRow + 2;
      const itinerarySheet = XLSX.utils.aoa_to_sheet([
        ["TRANSPORTER ITINERARY"],
        ...summaryRows,
        [],
        ["PAYMENT SUMMARY"],
        ["Purchase", "Cost", "Balance (INR)", "Status"],
        [row.payable, row.paid, row.balance, row.status],
      ]);
      itinerarySheet["!cols"] = [24, 24, 24, 24].map(wch => ({ wch }));
      itinerarySheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        ...summaryRows.map((_, index) => ({ s: { r: index + 1, c: 1 }, e: { r: index + 1, c: 3 } })),
        { s: { r: financeTitleRow, c: 0 }, e: { r: financeTitleRow, c: 3 } },
      ];
      itinerarySheet["!rows"] = Array.from({ length: financeValueRow + 1 }, (_, index) => ({ hpt: index === 0 || index === financeTitleRow ? 24 : 19 }));
      for (let column = 0; column < 3; column++) {
        const address = XLSX.utils.encode_cell({ r: financeValueRow, c: column });
        if (itinerarySheet[address]) itinerarySheet[address].z = "#,##0.00";
      }
      XLSX.utils.book_append_sheet(workbook, itinerarySheet, "Itinerary");
      append("Day-wise route", schedule, [8, 14, 32, 40, 32, 14, 14, 14]);
      append("Day-wise activities", activities, [8, 14, 18, 75, 30]);
      const styledExcel = styleTransporterPaymentWorkbook(XLSX, workbook, financeTitleRow);
      const fileName = `${preview ? "TEST-" : ""}${row.bookingId.replace(/[^a-zA-Z0-9_-]/g, "_")}-Itinerary.xlsx`;
      const excelBuffer = new ArrayBuffer(styledExcel.byteLength);
      new Uint8Array(excelBuffer).set(styledExcel);
      const url = URL.createObjectURL(new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url; link.download = fileName;
      document.body.appendChild(link);
      link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success("Itinerary Excel downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to download itinerary Excel. Please retry.");
    } finally { setExporting(null); }
  };

  // Vendor export uses the complete applied filter result, not the visible page.
  const vendorExportReady = allowed && applied.vendor !== "all" &&
    JSON.stringify(draft) === JSON.stringify(applied) &&
    !loading && !error && !notice && filtered.length > 0 && exporting === null;
  const downloadVendorLedger = async () => {
    if (!vendorExportReady) return;
    const vendor = vendorChoices.find(([id]) => id === applied.vendor)?.[1];
    if (!vendor) { toast.error("Selected transporter is unavailable. Choose the transporter again."); return; }
    setExporting("vendor-ledger-export");
    try {
      const result = await prepareVendorLedgerExport(filtered, applied.vendor, async (row) => {
        const itinerary = await loadItinerary(row.bookingId, row.confirmedPlanId);
        const route = buildRouteSummary(itinerary, row.arrivalLocation, row.dropLocation);
        return route.label + (route.nightsVerified ? "" : " [Night counts unavailable]");
      }, row => loadCustomer(row.bookingId, row.confirmedPlanId));
      if (!result.data.length) throw new Error("No records match this transporter and applied filters.");
      const XLSX = await import("xlsx");
      const workbook = createVendorLedgerWorkbook(XLSX, vendor, preview, result);
      const safeName = vendor.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "Transporter";
      XLSX.writeFile(workbook, `${preview ? "TEST-" : ""}${safeName}-Ledger-${new Date().toISOString().slice(0, 10)}.xlsx`);
      if (result.unavailableRoutes) toast.warning(`Downloaded ${result.data.length} records; ${result.unavailableRoutes} route(s) marked unavailable.`);
      else toast.success(`Downloaded all ${result.data.length} matching transporter records.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to download transporter ledger. Please retry.");
    } finally { setExporting(null); }
  };

  // DVI_LEDGER_AUTO_FILTERS_V1
  // Dropdowns apply immediately; keep the existing exact-ID finance lookup.
  useEffect(() => {
    setApplied(current => current.vendor === draft.vendor && current.status === draft.status && !current.from && !current.to
      ? current
      : { ...current, vendor: draft.vendor, status: draft.status, from: "", to: "" });
    setPage(1);
  }, [draft.vendor, draft.status]);

  // Debounce typing to avoid requesting every partial booking ID.
  useEffect(() => {
    const booking = draft.booking;
    const applyBooking = () => {
      setApplied(current => current.booking === booking ? current : { ...current, booking });
      setPage(1);
    };
    if (!booking.trim()) { applyBooking(); return; }
    const timer = window.setTimeout(applyBooking, 500);
    return () => window.clearTimeout(timer);
  }, [draft.booking]);

  // Enter remains an optional immediate search/retry; no visible button needed.
  const search = useCallback(() => {
    setApplied({ ...draft, from: "", to: "" });
    setPage(1);
    if (draft.booking === applied.booking) setReload(v => v + 1);
  }, [draft, applied.booking]);

  const sortBy = (next: typeof sortKey) => {
    if (sortKey === next) setAscending((value) => !value);
    else { setSortKey(next); setAscending(true); }
    setPage(1);
  };

  const control = "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
  const button = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const headerButton = (key: typeof sortKey, text: string) => (
    <button type="button" className="flex items-center gap-1 whitespace-nowrap font-semibold hover:text-violet-700"
      title={key === "route" ? "Sort by arrival/drop locations" : `Sort by ${text}`} onClick={() => sortBy(key)}>{text}<span className="text-slate-400">{sortKey === key ? ascending ? "^" : "v" : ""}</span></button>
  );

  if (!allowed) return <div className="p-8 text-slate-600">Transporter Ledger is available to Accounts users only.</div>;
  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f8f9fc] px-4 pb-8 pt-4 text-[#1d2740] lg:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Transporter Ledger</h1>
            {/* DVI_PAYMENTS_LEDGER_HEADER */}
            <button type="button" onClick={() => navigate("/accounts-payments?componentType=vehicle")}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              <Wallet size={16} aria-hidden="true" /> Payments
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Accounts & Finance / Transporter</p></div>

      </div>


      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-slate-700">Transporter Name
            <select className={`${control} mt-2`} value={draft.vendor} onChange={(e) => setDraft((s) => ({ ...s, vendor: e.target.value }))}>
              <option value="all">All Transporters</option>
              {vendorChoices.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">Booking ID
            <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"/>
              <input className={`${control} pl-9`} type="search" placeholder="Search booking ID"
                value={draft.booking} onChange={(e) => setDraft((s) => ({ ...s, booking: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") search(); }}/></div>
          </label>
          <label className="block text-xs font-semibold text-slate-700">Payment Status
            <select className={`${control} mt-2`} value={draft.status}
              onChange={(e) => setDraft((s) => ({ ...s, status: e.target.value }))}>
              <option value="all">All Status</option><option value="paid">Paid</option>
              <option value="partial">Partial</option><option value="pending">Pending</option>
            </select>
          </label>
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
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!vendorExportReady} onClick={() => void downloadVendorLedger()}
              title={applied.vendor === "all" || JSON.stringify(draft) !== JSON.stringify(applied) ? "Select a transporter and wait for the records to load" : "Download every matching record, including other pages"}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
              {exporting === "vendor-ledger-export" ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16}/>}
              {exporting === "vendor-ledger-export" ? "Downloading..." : "Download Excel"}
            </button>
          <label className="flex items-center gap-2 text-sm text-slate-600">Show
            <select value={pageSize} className="rounded-lg border border-slate-200 px-2 py-2"
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[10, 25, 50, 100].map((v) => <option key={v} value={v}>{v}</option>)}
            </select> entries
          </label>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-[#f3eaff] text-[#34314e]"><tr>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("booking", "Booking ID")}</th>
              <th className="whitespace-nowrap px-3 py-3">Customer</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("date", "Start Date")}</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("endDate", "End Date")}</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("route", "Route")}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">{headerButton("debit", "Purchase(INR)")}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">{headerButton("credit", "Paid(INR)")}</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">{headerButton("balance", "Balance(INR)")}</th>
              <th className="whitespace-nowrap px-3 py-3">{headerButton("status", "Status")}</th>
              <th className="whitespace-nowrap px-3 py-3 text-center">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={10} className="px-3 py-12 text-center text-slate-500"><Loader2 size={22} className="mx-auto mb-2 animate-spin"/>Loading transporter ledger...</td></tr>
                : !visible.length ? <tr><td colSpan={10} className="px-3 py-12 text-center text-slate-500">{error ? "Unable to load records." : applied.status !== "all" && confirmedQuotes.length > 0 ? "No posted finance transactions match this payment status. See confirmed quotations above." : rows.length > 0 ? `No matching records. ${rows.length} finance rows loaded; reset filters to see them.` : "No finance rows were returned. Check the local Accounts API and database."}</td></tr>
                : visible.map((row) => <tr key={row.key} className="hover:bg-violet-50/60">
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-violet-700">{row.bookingId}</td>
                  <td className="min-w-[110px] max-w-[200px] break-words px-3 py-3">{customerFor(row)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{dateLabel(row.date)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{dateLabel(row.endDate)}</td>
                  <td className="min-w-[250px] max-w-[360px] px-3 py-3 leading-relaxed"><div>{routeFor(row).label}</div>
                    {routeFor(row).note && <p className="mt-1 text-[10px] text-slate-500">{routeFor(row).note}</p>}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{money(row.payable)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{money(row.paid)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{money(row.balance)}</td>
                  <td className="px-3 py-3"><span className={`rounded-lg px-2 py-1 font-semibold ${colors[row.status]}`}>{row.status}</span></td>
                  <td className="px-3 py-3 text-center"><button type="button" aria-label={`View ${row.bookingId} details`} title="View payment details" className="rounded-lg p-2 text-violet-700 hover:bg-violet-100" onClick={() => setSelected(row)}><Eye size={16}/></button></td>
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
          {!preview && <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => navigate(`/accounts-ledger?componentType=vehicle&quoteId=${encodeURIComponent(selected.bookingId)}`)}>
            <FileText size={16}/> Open Full Ledger
          </button>}
        </section>
      </div>}
    </main>
  );
}
