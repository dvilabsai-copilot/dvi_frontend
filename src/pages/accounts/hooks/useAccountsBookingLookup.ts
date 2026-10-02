import { useCallback, useState } from "react";
import { fetchAccountsList, type AccountsRow } from "@/services/accountsManagerApi";
import { ItineraryService } from "@/services/itinerary";

export type AccountsBooking = {
  quoteId: string;
  planId?: number;
  status: "Confirmed" | "Latest" | "Accounts";
  agent: string;
  guest: string;
  startDate: string;
  endDate: string;
  financeAvailable: boolean;
  accountsRows: AccountsRow[];
};

const normalizeQuoteId = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

const asText = (...values: unknown[]) =>
  values.map((value) => String(value ?? "").trim()).find(Boolean) ?? "";

function toLatestBooking(item: any): AccountsBooking {
  return {
    quoteId: asText(item.itinerary_quote_ID, item.itinerary_booking_ID),
    planId: Number(item.modify || item.itinerary_plan_ID || 0) || undefined,
    status: "Latest",
    agent: asText(item.username, item.agent_name),
    guest: asText(item.primary_customer_name, item.guest_name),
    startDate: asText(item.trip_start_date_and_time, item.start_date),
    endDate: asText(item.trip_end_date_and_time, item.end_date),
    financeAvailable: false,
    accountsRows: [],
  };
}

function toConfirmedBooking(item: any): AccountsBooking {
  return {
    quoteId: asText(item.booking_quote_id, item.itinerary_quote_ID),
    planId: Number(item.itinerary_plan_ID || item.confirmed_itinerary_plan_ID || 0) || undefined,
    status: "Confirmed",
    agent: asText(item.agent_name, item.agent),
    guest: asText(item.primary_customer_name, item.guest_name),
    startDate: asText(item.arrival_date, item.trip_start_date_and_time),
    endDate: asText(item.departure_date, item.trip_end_date_and_time),
    financeAvailable: false,
    accountsRows: [],
  };
}

export function useAccountsBookingLookup() {
  const [booking, setBooking] = useState<AccountsBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = useCallback(async (value: string) => {
    const quoteId = value.trim();
    if (!quoteId) {
      setBooking(null);
      setError("Enter a booking or quote ID first.");
      return null;
    }

    setLoading(true);
    setError("");
    setBooking(null);

    try {
      const [confirmedResponse, latestResponse, accountsRows] = await Promise.all([
        ItineraryService.getConfirmedItineraries({ start: 0, length: 50, search: quoteId }),
        ItineraryService.getLatest({ page: 1, pageSize: 50, search: quoteId }),
        fetchAccountsList({ status: "all", quoteId }),
      ]);

      const normalized = normalizeQuoteId(quoteId);
      const confirmed = (confirmedResponse?.data ?? [])
        .map(toConfirmedBooking)
        .find((item: AccountsBooking) => normalizeQuoteId(item.quoteId) === normalized);
      const latest = (latestResponse?.data ?? [])
        .map(toLatestBooking)
        .find((item: AccountsBooking) => normalizeQuoteId(item.quoteId) === normalized);
      const accountMatch = accountsRows.find(
        (row) => normalizeQuoteId(row.quoteId) === normalized,
      );

      const result = confirmed ?? latest ?? (accountMatch
        ? {
            quoteId: accountMatch.quoteId,
            status: "Accounts" as const,
            agent: accountMatch.agent,
            guest: accountMatch.guestName ?? accountMatch.guest ?? "",
            startDate: accountMatch.startDate,
            endDate: accountMatch.endDate,
            financeAvailable: true,
            accountsRows,
          }
        : null);

      if (!result) {
        setError(`No itinerary found for ${quoteId}.`);
        return null;
      }

      setBooking({
        ...result,
        financeAvailable: accountsRows.length > 0,
        accountsRows,
      });
      return { ...result, financeAvailable: accountsRows.length > 0, accountsRows };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to search bookings.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { booking, loading, error, search, setError };
}
