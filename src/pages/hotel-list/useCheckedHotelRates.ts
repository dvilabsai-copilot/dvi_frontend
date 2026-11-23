import { useEffect, useState } from "react";
import { getToken, isImpersonationBrowserSession } from "@/lib/api";
import type { HotelIntentPreviewResponse } from "@/services/itinerary";
import type { HotelCardQuote } from "./hotelCardPricing";

export type CheckedHotelRate = {
  preview: HotelIntentPreviewResponse;
  quote: HotelCardQuote;
};

type CheckedRates = Record<string, CheckedHotelRate>;
const EMPTY_RATES: CheckedRates = {};
const STORAGE_KEY = "dvi.checked-hotel-rates.v1";
const expiry = (rate: CheckedHotelRate) => Date.parse(rate?.preview?.checkedRateExpiresAt || "");
const isCurrent = (rate: CheckedHotelRate) => expiry(rate) > Date.now();
const currentRates = (entries: CheckedRates) =>
  Object.fromEntries(Object.entries(entries).filter(([, rate]) => isCurrent(rate)));

function checkedRateOwner(): string | null {
  try {
    if (isImpersonationBrowserSession()) return null;
    const payload = getToken().split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return claims.sub && claims.iat ? JSON.stringify([claims.sub, claims.iat]) : null;
  } catch {
    return null;
  }
}

function readCheckedRates(owner: string | null): CheckedRates {
  if (!owner) return {};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved?.owner === owner && saved.rates ? currentRates(saved.rates) : {};
  } catch {
    return {};
  }
}

function saveCheckedRate(owner: string | null, key: string, rate: CheckedHotelRate) {
  if (!owner || !rate.preview.checkedRateSearchedAt) return;
  const selection = rate.preview.selections?.find((row) => row.routeId === rate.quote.routeId);
  if (!selection) return;
  // Keep the reviewed room and prices. Supplier session references are
  // intentionally excluded from browser storage. Confirm Update resolves
  // the selected hotel/room/meal again on the server.
  const publicSelection = {
    routeId: selection.routeId, routeDate: selection.routeDate,
    provider: selection.provider, hotelCode: selection.hotelCode, providerHotelCode: selection.providerHotelCode,
    hotelId: selection.hotelId, canonicalHotelId: selection.canonicalHotelId, hotelName: selection.hotelName,
    roomType: selection.roomType, roomTypeId: selection.roomTypeId, roomId: selection.roomId,
    mealPlan: selection.mealPlan, currency: selection.currency,
    pricePerNight: selection.pricePerNight, totalPrice: selection.totalPrice,
    basePricePerNight: selection.basePricePerNight, baseTotalPrice: selection.baseTotalPrice,
    hotelMarginPercentage: selection.hotelMarginPercentage, hotelMarginAmount: selection.hotelMarginAmount,
    hotelMarginTotalAmount: selection.hotelMarginTotalAmount,
    isRefundable: selection.isRefundable, IsRefundable: selection.IsRefundable,
    tboRoomNightBreakdown: selection.tboRoomNightBreakdown,
  };
  const saved: CheckedHotelRate = {
    quote: rate.quote,
    preview: {
      status: "AVAILABLE",
      checkedRateSearchedAt: rate.preview.checkedRateSearchedAt,
      checkedRateExpiresAt: rate.preview.checkedRateExpiresAt,
      logicalStay: rate.preview.logicalStay,
      selections: [publicSelection],
    },
  };
  try {
    const rates = { ...readCheckedRates(owner), [key]: saved };
    const recent = Object.entries(rates)
      .sort(([, left], [, right]) => expiry(right) - expiry(left))
      .slice(0, 64);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, rates: Object.fromEntries(recent) }));
  } catch {
    // A blocked or full browser store still allows in-page reuse.
  }
}

export function useCheckedHotelRates() {
  const owner = checkedRateOwner();
  const [cache, setCache] = useState(() => ({ owner, rates: readCheckedRates(owner) }));
  const entries = cache.owner === owner ? cache.rates : EMPTY_RATES;

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setCache({ owner, rates: readCheckedRates(owner) });
    };
    setCache((previous) => previous.owner === owner ? previous : { owner, rates: readCheckedRates(owner) });
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [owner]);

  useEffect(() => {
    const soonest = Math.min(...Object.values(entries).map(expiry));
    if (!Number.isFinite(soonest)) return;
    const timer = window.setTimeout(() => {
      setCache((previous) => previous.owner === owner
        ? { owner, rates: currentRates(previous.rates) }
        : previous);
    }, Math.max(0, soonest - Date.now()));
    return () => window.clearTimeout(timer);
  }, [entries, owner]);

  return {
    get(key: string) {
      const rate = entries[key];
      return rate && isCurrent(rate) ? rate : undefined;
    },
    remember(key: string, rate: CheckedHotelRate) {
      if (!isCurrent(rate)) return;
      saveCheckedRate(owner, key, rate);
      setCache((previous) => ({ owner, rates: { ...(previous.owner === owner ? previous.rates : {}), [key]: rate } }));
    },
  };
}
