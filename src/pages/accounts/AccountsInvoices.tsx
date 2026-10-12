import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  fetchAccountsInvoiceData,
  fetchAccountsList,
} from "@/services/accountsManagerApi";
import { ItineraryService } from "@/services/itinerary";
import { useAccountsBookingLookup } from "./hooks/useAccountsBookingLookup";
import { AccountsEntityLookup } from "./AccountsEntityLookup";


const asText = (...values: unknown[]) =>
  values.map((value) => String(value ?? "").trim()).find(Boolean) ?? "-";

const asNumber = (value: unknown) => Number(value ?? 0) || 0;
const money = (value: unknown) => `₹${asNumber(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function dateOnly(value: unknown) {
  const raw = String(value ?? "");
  return raw ? raw.slice(0, 10) : "-";
}

// Keep the Invoice Tax / Proforma date rules
// aligned with Accounts Overview.
const INVOICE_ELIGIBILITY_START_DATE = "2026-08-15";

function normalizedDate(value: unknown): string {
  const raw = String(value ?? "").trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const dmy =
    /^(\d{2})[\/-](\d{2})[\/-](\d{4})/.exec(raw);

  return dmy
    ? `${dmy[3]}-${dmy[2]}-${dmy[1]}`
    : "";
}

function todayYmd(): string {
  const now = new Date();

  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`
  );
}

export function AccountsInvoices() {
  const [searchParams] = useSearchParams();

  const overviewSearch =
    searchParams.get("search")?.trim() || "";

  const [searchInput, setSearchInput] = useState("");
  const [invoice, setInvoice] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const { booking, loading, error, search } = useAccountsBookingLookup();

  const [matchingBookings, setMatchingBookings] =
    useState<string[]>([]);

  const [loadingMatches, setLoadingMatches] =
    useState(false);

  const [matchingError, setMatchingError] =
    useState("");

 
  const handleSearch = async (value = searchInput) => {
    setInvoice(null);
    const result = await search(value);
    if (!result?.planId) return;


    setLoadingInvoice(true);
    try {
      setInvoice(await fetchAccountsInvoiceData(result.planId));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Invoice data is not available.");
    } finally {
      setLoadingInvoice(false);
    }
  };

  /*
   * A Vendor / Agent search may match multiple
   * bookings. Resolve their real Booking IDs.
   *
   * No invoice or PDF is generated here.
   * The user explicitly selects a booking first.
   */
  useEffect(() => {
    let cancelled = false;

    if (!overviewSearch) {
      setMatchingBookings([]);
      setMatchingError("");
      setLoadingMatches(false);
      return;
    }

    setLoadingMatches(true);
    setMatchingError("");
    setMatchingBookings([]);

    fetchAccountsList({
      status: "all",
      search: overviewSearch,
    })
      .then((records) => {
        if (cancelled) return;

        const bookingIds = Array.from(
          new Set(
            records
              .map((row) =>
                String(row.quoteId || "").trim(),
              )
              .filter(Boolean),
          ),
        );

        setMatchingBookings(bookingIds);
      })
      .catch((cause) => {
        if (cancelled) return;

        setMatchingError(
          cause instanceof Error
            ? cause.message
            : "Unable to load matching bookings.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMatches(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [overviewSearch]);

  const invoiceMeta = invoice?.meta ?? {};
  const buyer = invoice?.buyer ?? {};
  const guest = invoice?.guest ?? {};
  const itinerary = invoice?.itinerary ?? {};
  const totals = invoice?.totals ?? {};
  const items = Array.isArray(invoice?.lineItems) ? invoice.lineItems : Array.isArray(invoice?.items) ? invoice.items : [];
const start = dateOnly(
  itinerary.tripStartDateTime ??
  guest.arrivalDateTime ??
  booking?.startDate,
);

const end = dateOnly(
  itinerary.tripEndDateTime ??
  guest.departureDateTime ??
  booking?.endDate,
);

const invoiceStartDate = normalizedDate(
  itinerary.tripStartDateTime ??
  guest.arrivalDateTime ??
  booking?.startDate,
);

const invoiceEndDate = normalizedDate(
  itinerary.tripEndDateTime ??
  guest.departureDateTime ??
  booking?.endDate,
);

const today = todayYmd();

const invoiceDatesValid =
  /^\d{4}-\d{2}-\d{2}$/.test(invoiceStartDate) &&
  /^\d{4}-\d{2}-\d{2}$/.test(invoiceEndDate) &&
  invoiceStartDate <= invoiceEndDate &&
  invoiceStartDate >= INVOICE_ELIGIBILITY_START_DATE;

const canUsePdf = Boolean(
  invoice &&
  booking?.planId &&
  invoiceDatesValid,
);

const canUseProforma =
  canUsePdf &&
  today >= invoiceStartDate &&
  today <= invoiceEndDate;

const canUseTax =
  canUsePdf &&
  today > invoiceEndDate;

const downloadInvoice = async (
  type: "proforma" | "tax",
) => {
  if (
    !booking?.planId ||
    (type === "tax" ? !canUseTax : !canUseProforma)
  ) {
    return;
  }

  try {
    await ItineraryService.downloadInvoicePdf(
      booking.planId,
      type,
    );
  } catch (cause) {
    toast.error(
      cause instanceof Error
        ? cause.message
        : "Unable to download invoice.",
    );
  }
};

  return (
    <main className="min-h-screen bg-[#f5f8fc] p-4 text-[#17233d] md:p-6">
      <section className="rounded-lg border border-[#dbe4f1] bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Invoices</h1>
        <p className="mt-1 text-sm text-[#71809a]">View invoice data and download available invoice documents.</p>
        <div className="mt-5 flex max-w-2xl gap-2">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8290a7]" /><Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void handleSearch()} className="h-10 pl-9" placeholder="Booking or quote ID" /></div>
          <Button onClick={() => void handleSearch()} disabled={loading || loadingInvoice} className="bg-[#245bea] hover:bg-[#1749c5]"><Search className="mr-2 h-4 w-4" />{loading || loadingInvoice ? "Loading..." : "Search"}</Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {overviewSearch && (
          <div className="mt-5 rounded-lg border border-[#dbe4f1] bg-white p-4">
            <h2 className="font-semibold text-[#17233d]">
              Matching Bookings
            </h2>

            <p className="mt-1 text-sm text-[#71809a]">
              Vendor / Agent search: <strong>{overviewSearch}</strong>
            </p>

            <p className="mt-1 text-xs text-[#71809a]">
              Select a booking to view its invoice.
            </p>

            {loadingMatches && (
              <p className="mt-3 text-sm">
                Loading matching bookings...
              </p>
            )}

            {matchingError && (
              <p className="mt-3 text-sm text-red-600">
                {matchingError}
              </p>
            )}

            {!loadingMatches &&
              !matchingError &&
              matchingBookings.length === 0 && (
                <p className="mt-3 text-sm text-[#71809a]">
                  No matching bookings found.
                </p>
              )}

            {matchingBookings.length > 0 && (
  <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto">
    {matchingBookings.map(
      (quoteId) => (
        <div
          key={quoteId}
          className="flex items-center justify-between gap-3 rounded-md border border-[#e5eaf3] px-3 py-2"
        >
          <span className="text-sm font-medium">
            {quoteId}
          </span>

          <Button
            size="sm"
            variant="outline"
            disabled={loading || loadingInvoice}
            onClick={() => {
              setSearchInput(quoteId);
              void handleSearch(quoteId);
            }}
          >
            View Invoice
          </Button>
        </div>
      ),
    )}
  </div>
)}
          </div>
        )}

        <AccountsEntityLookup
          onSelectQuote={(selectedQuoteId) => {
            setSearchInput(selectedQuoteId);
            void handleSearch(selectedQuoteId);
          }}
        />

      </section>

      {!loading && booking && (
        <section className="mt-4 rounded-lg border border-[#dbe4f1] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-lg font-bold">Invoice data for {booking.quoteId}</h2><p className="mt-1 text-sm text-[#71809a]">Agent/company: {asText(buyer.agentName, buyer.companyName, booking.agent)} <span className="mx-2">|</span> Guest: {asText(guest.name, booking.guest)}</p></div>
<div className="flex gap-2">
  <Button
    variant="outline"
    disabled={!canUseProforma}
    onClick={() => void downloadInvoice("proforma")}
  >
    <FileDown className="mr-2 h-4 w-4" />
    Proforma Invoice
  </Button>

  <Button
    disabled={!canUseTax}
    onClick={() => void downloadInvoice("tax")}
  >
    <FileDown className="mr-2 h-4 w-4" />
    Tax Invoice
  </Button>
</div>
          </div>
          {!invoice && !loadingInvoice && <p className="mt-5 rounded-md bg-amber-50 p-4 text-sm text-amber-800">No invoices currently available for this booking.</p>}
          {invoice && <>
            <dl className="mt-5 grid gap-4 border-y border-[#edf1f6] py-4 sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-[#71809a]">Booking ID</dt><dd className="font-medium">{asText(itinerary.quoteId, booking.quoteId)}</dd></div><div><dt className="text-xs text-[#71809a]">Invoice Number</dt><dd className="font-medium">{asText(invoiceMeta.invoiceNo)}</dd></div><div><dt className="text-xs text-[#71809a]">Invoice Date</dt><dd className="font-medium">{dateOnly(invoiceMeta.invoiceDate)}</dd></div><div><dt className="text-xs text-[#71809a]">Travel Period</dt><dd className="font-medium">{start} - {end}</dd></div><div><dt className="text-xs text-[#71809a]">GST</dt><dd className="font-medium">{asText(invoiceMeta.gstLabel, invoiceMeta.gstType)}</dd></div><div><dt className="text-xs text-[#71809a]">Subtotal</dt><dd className="font-medium">{money(totals.subtotal ?? totals.subTotal)}</dd></div><div><dt className="text-xs text-[#71809a]">Tax</dt><dd className="font-medium">{money(totals.tax ?? totals.totalTax)}</dd></div><div><dt className="text-xs text-[#71809a]">Total</dt><dd className="font-bold">{money(totals.totalAmount ?? totals.total)}</dd></div></dl>
            {items.length > 0 ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[#f7f9fc] text-xs text-[#71809a]"><tr>{["Description", "Quantity", "Rate", "Amount"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody>{items.map((item: any, index: number) => <tr key={index} className="border-t border-[#edf1f6]"><td className="px-3 py-3">{asText(item.description, item.name, item.component)}</td><td className="px-3 py-3">{asText(item.quantity, item.qty, "-")}</td><td className="px-3 py-3">{money(item.rate ?? item.unitPrice)}</td><td className="px-3 py-3">{money(item.amount ?? item.total)}</td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-[#71809a]">Invoice data is available, but no line items were returned.</p>}
          </>}
        </section>
      )}
    </main>
  );
}
