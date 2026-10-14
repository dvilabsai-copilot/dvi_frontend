
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAccountsList,
  type AccountsRow,
} from "@/services/accountsManagerApi";

type BookingMatch = {
  quoteId: string;
  agent: string;
  suppliers: string[];
  taskCount: number;
};

type Props = {
  onSelectQuote: (quoteId: string) => void;
};

function groupBookings(rows: AccountsRow[]): BookingMatch[] {
  const grouped = new Map<
    string,
    {
      quoteId: string;
      agent: string;
      suppliers: Set<string>;
      taskCount: number;
    }
  >();

  for (const row of rows) {
    const quoteId = String(row.quoteId ?? "").trim();
    if (!quoteId) continue;

    const key = quoteId.toLowerCase();
    let group = grouped.get(key);

    if (!group) {
      group = {
        quoteId,
        agent: row.agent || "",
        suppliers: new Set<string>(),
        taskCount: 0,
      };
      grouped.set(key, group);
    }

    group.taskCount += 1;

    const supplier = String(
      row.vendorName || row.hotelName || "",
    ).trim();

    if (supplier) group.suppliers.add(supplier);
  }

  return Array.from(grouped.values()).map((group) => ({
    quoteId: group.quoteId,
    agent: group.agent,
    suppliers: Array.from(group.suppliers),
    taskCount: group.taskCount,
  }));
}

export function AccountsEntityLookup({
  onSelectQuote,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookingMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const value = query.trim();

    if (!value) {
      setError("Enter a Booking/Quote ID, Vendor or Agent.");
      setResults([]);
      return;
    }

    setLoading(true);
    setError("");
    setSearched(false);
    setResults([]);

    try {
      const rows = await fetchAccountsList({
        status: "all",
        search: value,
      });

      setResults(groupBookings(rows));
      setSearched(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to search Accounts records.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 border-t border-[#edf1f6] pt-5">
      <p className="mb-3 text-sm font-semibold">
        Find bookings by Vendor or Agent
      </p>

      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleSearch();
            }
          }}
          placeholder="Booking ID, Quote ID, Vendor or Agent"
          className="min-w-[220px] flex-1"
        />

        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void handleSearch()}
        >
          <Search className="mr-2 h-4 w-4" />
          {loading ? "Searching..." : "Find Records"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {searched && results.length === 0 && (
        <p className="mt-3 text-sm text-[#71809a]">
          No matching Accounts records were found.
          You can still use the direct Booking/Quote search above.
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-md border">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-[#f7f9fc]">
              <tr>
                <th className="p-3">Booking / Quote</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Suppliers</th>
                <th className="p-3">Tasks</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {results.slice(0, 100).map((item) => (
                <tr
                  key={item.quoteId}
                  className="border-t border-[#edf1f6]"
                >
                  <td className="p-3 font-medium">
                    {item.quoteId}
                  </td>
                  <td className="p-3">
                    {item.agent || "-"}
                  </td>
                  <td className="p-3">
                    {item.suppliers.join(", ") || "-"}
                  </td>
                  <td className="p-3">{item.taskCount}</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onSelectQuote(item.quoteId)
                      }
                    >
                      Select Booking
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {results.length > 100 && (
            <p className="p-3 text-xs text-[#71809a]">
              Showing the first 100 matches. Refine your search
              to find a specific booking.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
