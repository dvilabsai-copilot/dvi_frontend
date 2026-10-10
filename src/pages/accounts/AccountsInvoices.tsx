import { useState } from "react";
import { FileDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchAccountsInvoiceData } from "@/services/accountsManagerApi";
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

export function AccountsInvoices() {
  const [searchInput, setSearchInput] = useState("");
  const [invoice, setInvoice] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const { booking, loading, error, search } = useAccountsBookingLookup();

 
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

  const invoiceMeta = invoice?.meta ?? {};
  const buyer = invoice?.buyer ?? {};
  const guest = invoice?.guest ?? {};
  const itinerary = invoice?.itinerary ?? {};
  const totals = invoice?.totals ?? {};
  const items = Array.isArray(invoice?.lineItems) ? invoice.lineItems : Array.isArray(invoice?.items) ? invoice.items : [];
  const start = dateOnly(itinerary.tripStartDateTime ?? guest.arrivalDateTime ?? booking?.startDate);
  const end = dateOnly(itinerary.tripEndDateTime ?? guest.departureDateTime ?? booking?.endDate);
  const canUsePdf = Boolean(invoice && booking?.planId);

  const downloadInvoice = async (type: "proforma" | "tax") => {
    if (!booking?.planId || !canUsePdf) return;
    try {
      await ItineraryService.downloadInvoicePdf(booking.planId, type);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to download invoice.");
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
            <div className="flex gap-2"><Button variant="outline" disabled={!canUsePdf} onClick={() => void downloadInvoice("proforma")}><FileDown className="mr-2 h-4 w-4" />Proforma Invoice</Button><Button disabled={!canUsePdf} onClick={() => void downloadInvoice("tax")}><FileDown className="mr-2 h-4 w-4" />Tax Invoice</Button></div>
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
