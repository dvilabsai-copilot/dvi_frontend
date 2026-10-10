import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccountsBookingLookup } from "./hooks/useAccountsBookingLookup";
import { AccountsEntityLookup } from "./AccountsEntityLookup";


export function AccountsSearchBooking() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const { booking, loading, error, search } = useAccountsBookingLookup();

  const handleSearch = () => {
    void search(searchInput);
  };

  return (
    <main className="min-h-screen bg-[#f5f8fc] p-4 text-[#17233d] md:p-6">
      <section className="rounded-lg border border-[#dbe4f1] bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Search Booking</h1>
        <p className="mt-1 text-sm text-[#71809a]">Find a Latest, Confirmed, or Accounts booking.</p>
        <div className="mt-5 flex max-w-2xl gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8290a7]" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              className="h-10 pl-9"
              placeholder="Booking or quote ID"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} className="bg-[#245bea] hover:bg-[#1749c5]">
            <Search className="mr-2 h-4 w-4" />{loading ? "Searching..." : "Search"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        
        <AccountsEntityLookup
          onSelectQuote={(selectedQuoteId) => {
            setSearchInput(selectedQuoteId);
            void search(selectedQuoteId);
          }}
        />

      </section>

      {!loading && !error && !booking && (
        <section className="mt-4 rounded-lg border border-dashed border-[#cbd7e8] bg-white p-10 text-center text-sm text-[#71809a]">
          Search an itinerary to view its booking and finance status.
        </section>
      )}

      {booking && (
        <section className="mt-4 rounded-lg border border-[#dbe4f1] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">Booking # {booking.quoteId}</h2>
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">{booking.status}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${booking.financeAvailable ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {booking.financeAvailable ? "Finance available" : "Finance not generated"}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-xs text-[#71809a]">Agent</dt><dd className="font-medium">{booking.agent || "-"}</dd></div>
                <div><dt className="text-xs text-[#71809a]">Guest</dt><dd className="font-medium">{booking.guest || "-"}</dd></div>
                <div><dt className="text-xs text-[#71809a]">Travel Start</dt><dd className="font-medium">{booking.startDate || "-"}</dd></div>
                <div><dt className="text-xs text-[#71809a]">Travel End</dt><dd className="font-medium">{booking.endDate || "-"}</dd></div>
              </dl>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => booking.status === "Confirmed" && booking.planId ? navigate(`/confirmed-itinerary/${booking.planId}`) : navigate(`/itinerary-details/${encodeURIComponent(booking.quoteId)}`)}>
                <ExternalLink className="mr-2 h-4 w-4" />View Itinerary
              </Button>
              <Button onClick={() => navigate(`/accounts-overview?quoteId=${encodeURIComponent(booking.quoteId)}`)} className="bg-[#245bea] hover:bg-[#1749c5]">
                Open Finance Overview
              </Button>
            </div>
          </div>
          <div className="mt-5 border-t border-[#edf1f6] pt-4 text-sm">
            <span className="font-semibold">Accounts component count:</span> {booking.accountsRows.length}
            {!booking.financeAvailable && <p className="mt-2 text-amber-700">Booking found, but Accounts &amp; Finance records have not been generated yet.</p>}
          </div>
        </section>
      )}
    </main>
  );
}
