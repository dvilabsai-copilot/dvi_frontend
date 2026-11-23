import { useEffect, useState } from "react";
import type { HotelIntentPreviewResponse } from "@/services/itinerary";
import type { PendingHotelAction } from "./hotelList.types";
import type { HotelCardQuote } from "./hotelCardPricing";

export type CheckedHotelRate = {
  preview: HotelIntentPreviewResponse;
  quote: HotelCardQuote;
  holdEligibility: PendingHotelAction["vsrHoldEligibility"];
};

export function useCheckedHotelRates() {
  const [entries, setEntries] = useState<Record<string, CheckedHotelRate>>({});
  const expiry = (rate: CheckedHotelRate) => Date.parse(rate.preview.checkedRateExpiresAt || "");
  const isCurrent = (rate: CheckedHotelRate) => expiry(rate) > Date.now();

  useEffect(() => {
    const soonest = Math.min(...Object.values(entries).map(expiry));
    if (!Number.isFinite(soonest)) return;
    const timer = window.setTimeout(() => {
      setEntries((previous) => Object.fromEntries(Object.entries(previous).filter(([, rate]) => isCurrent(rate))));
    }, Math.max(0, soonest - Date.now()));
    return () => window.clearTimeout(timer);
  }, [entries]);

  return {
    get(key: string) {
      const rate = entries[key];
      return rate && isCurrent(rate) ? rate : undefined;
    },
    remember(key: string, rate: CheckedHotelRate) {
      if (isCurrent(rate)) setEntries((previous) => ({ ...previous, [key]: rate }));
    },
  };
}
