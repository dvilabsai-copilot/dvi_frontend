import React from "react";
import { replaceHotelProviderBrandForDisplay } from "@/utils/hotelProviderDisplay";

type HotelRecord = Record<string, unknown>;

type QuotationNonTboSelectedHotelsProps = {
  entries: ReadonlyArray<HotelRecord>;
  normalizePrebookItems: (value: unknown) => string[];
  resolvePrebookInclusions: (hotel: unknown) => string[];
  resolvePrebookMealPlan: (hotel: unknown) => string;
  normalizeCancellationPolicyItems: (value: unknown) => string[];
  normalizeMealPlanLabel: (value?: string | null) => string;
  keyPrefix: string;
  providerNote: string;
};

const asRecord = (value: unknown): HotelRecord => (
  value && typeof value === "object" ? value as HotelRecord : {}
);

const textValue = (record: HotelRecord, key: string): string => {
  const value = record[key];
  return value === null || value === undefined ? "" : String(value);
};

const numberValue = (record: HotelRecord, key: string): number => Number(record[key] || 0);

const renderPolicyList = (title: string, items: string[], key: string, emptyLabel: string) => (
  <details className="rounded-lg border border-[#eadcfb] bg-[#fcf9ff] px-3 py-2">
    <summary className="cursor-pointer text-sm font-medium text-[#4a4260]">{title} ({items.length})</summary>
    <div className="mt-2">
      {items.length > 0 ? (
        <ul className="list-disc space-y-1 whitespace-pre-wrap pl-5 text-sm text-[#4a4260]">
        {items.map((item, index) => <li key={`${key}-${index}`}>{replaceHotelProviderBrandForDisplay(item)}</li>)}
        </ul>
      ) : <p className="text-sm text-[#4a4260]">{emptyLabel}</p>}
    </div>
  </details>
);

/** Renders selected supplier hotels that bypass the TBO prebook flow. */
export const QuotationNonTboSelectedHotels: React.FC<QuotationNonTboSelectedHotelsProps> = ({
  entries,
  normalizePrebookItems,
  resolvePrebookInclusions,
  resolvePrebookMealPlan,
  normalizeCancellationPolicyItems,
  normalizeMealPlanLabel,
  keyPrefix,
  providerNote,
}) => (
  <div className="space-y-2">
    {entries.map((hotel, index) => {
      const detailRow = asRecord(hotel.matchedHotelRow || hotel);
      const hotelAmenities = normalizePrebookItems(detailRow.amenities || detailRow.facilities);
      const hotelRateConditions = normalizePrebookItems(detailRow.rateConditions);
      const hotelInclusions = resolvePrebookInclusions(detailRow);
      const hotelMealType = resolvePrebookMealPlan(detailRow);
      const hotelCancellation = normalizeCancellationPolicyItems(detailRow.cancellationPolicy || detailRow.cancellationPoliciesText);
      const routeId = textValue(hotel, "routeId") || String(index);
      const hotelName = textValue(hotel, "hotelName") || `Hotel ${index + 1}`;
      const checkIn = textValue(hotel, "displayCheckInDate");
      const checkOut = textValue(hotel, "displayCheckOutDate");
      const nights = numberValue(hotel, "displayNights");
      const roomType = textValue(hotel, "roomType");
      const displayRouteIds = Array.isArray(hotel.displayRouteIds) ? hotel.displayRouteIds : [];

      return (
        <details key={`${keyPrefix}-${routeId}`} className="space-y-3 rounded-lg border border-[#e5d9f2] bg-white p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-semibold text-[#4a4260]">{hotelName}</p>
                <p className="text-xs text-[#6c6c6c]">
                  {checkIn && checkOut ? <>Stay: <span className="font-medium text-[#4a4260]">{checkIn} to {checkOut}</span>{nights ? ` · ${nights} night(s)` : ""}</> : null}
                </p>
                {roomType ? <p className="text-xs text-[#6c6c6c]">Room: <span className="font-medium text-[#4a4260]">{roomType}</span></p> : null}
                {hotel.multiNightBooking === true && displayRouteIds.length > 1 && <p className="text-xs font-medium text-green-700">Continuous stay selected for {displayRouteIds.length} route(s)</p>}
                <p className="text-xs text-[#6c6c6c]">Tap to view details</p>
              </div>
              <div className="text-left text-sm md:text-right"><p className="text-[#6c6c6c]">Selected Price</p><p className="font-semibold text-[#4a4260]">₹ {numberValue(hotel, "netAmount").toFixed(2)}</p></div>
            </div>
          </summary>
          <div className="space-y-3 border-t border-[#f1e7fb] pt-3">
            <div>
              <p className="text-xs text-[#6c6c6c]">Hotel Code: {textValue(hotel, "hotelCode") || textValue(detailRow, "hotelCode") || "-"}</p>
              {textValue(hotel, "routeId") && <p className="text-xs text-[#6c6c6c]">Route ID: {textValue(hotel, "routeId")}</p>}
              {hotelMealType ? <p className="text-xs text-[#6c6c6c]">Meal Plan: <span className="font-medium text-[#4a4260]">{normalizeMealPlanLabel(hotelMealType)}</span></p> : null}
            </div>
            {renderPolicyList("Cancellation Policy", hotelCancellation, `${keyPrefix}-cancel-${routeId}`, "No cancellation policy available")}
            {renderPolicyList("Rate Conditions", hotelRateConditions, `${keyPrefix}-rate-${routeId}`, "No rate conditions available")}
            {renderPolicyList("Amenities", hotelAmenities, `${keyPrefix}-amenity-${routeId}`, "No amenities available")}
            {renderPolicyList("Package Inclusions", hotelInclusions, `${keyPrefix}-inc-${routeId}`, "No inclusions available")}
            <p className="rounded border border-[#e5d9f2] bg-[#f5eeff] px-2 py-1 text-xs text-[#9c7fb8]">{providerNote}</p>
          </div>
        </details>
      );
    })}
  </div>
);

export default QuotationNonTboSelectedHotels;
