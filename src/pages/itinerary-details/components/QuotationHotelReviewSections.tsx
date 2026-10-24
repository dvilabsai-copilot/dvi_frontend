import type { Dispatch, SetStateAction } from "react";
import { QuotationNonTboSelectedHotels } from "./QuotationNonTboSelectedHotels";
import { QuotationPrebookHotelRows } from "../QuotationPrebookHotelRows";
import { QuotationPrebookAcceptanceNotice } from "../QuotationPrebookAcceptanceNotice";
import { QuotationNonTboAcceptanceNotice } from "../QuotationNonTboAcceptanceNotice";
import { isManualApprovalHotel } from "../utils/domain.utils";
import { resolveUploadUrl } from "@/lib/api";

type HotelEntry = Record<string, unknown>;
type ExternalStayEntry = { routeId?: string | number; destination?: string; day?: string; availabilityMessage?: string };
type PrebookData = { updatedTotalPrice?: number; finalPrice?: number; totalAmount?: number };

type HotelTableRow = {
  key: string;
  day: string;
  destination: string;
  hotel: string;
  status: string;
  holdUntil: string;
  imageUrl?: string;
  rating?: string;
  holdStatus?: string;
};

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" ? value as Record<string, unknown> : {}
);

const textValue = (record: Record<string, unknown>, ...keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return "";
};

const imageValueUrl = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    return textValue(asRecord(value), "url", "imageUrl", "src", "path");
  }
  return "";
};

const hotelImageUrl = (...records: Record<string, unknown>[]): string => {
  const directKeys = [
    "primaryImageUrl",
    "primary_image_url",
    "imageUrl",
    "hotelImageUrl",
    "image",
    "thumbnail",
    "hotelImage",
  ];
  const galleryKeys = ["images", "galleryImages", "gallery", "hotelImages", "photos"];

  for (const record of records) {
    for (const key of directKeys) {
      const url = imageValueUrl(record[key]);
      if (url) return resolveUploadUrl(url);
    }
    for (const key of galleryKeys) {
      const values = record[key];
      if (!Array.isArray(values)) continue;
      const url = values.map(imageValueUrl).find(Boolean);
      if (url) return resolveUploadUrl(url);
    }
  }

  return "";
};

const statusLabel = (entry: Record<string, unknown>, isHeld: boolean): string => {
  if (isHeld) return "Held";
  if (isManualApprovalHotel(entry)) return "On Request";
  const status = textValue(entry, "approvalStatus", "manualConfirmationStatus", "availabilityStatus").toUpperCase();
  if (status.includes("UNAVAILABLE") || status.includes("NOT_BOOKABLE")) return "Unavailable";
  if (status.includes("AVAILABLE") || status === "SELECTED") return "Available";
  return "Not Started";
};

const statusClass = (status: string): string => {
  if (["Held", "Available", "BLOCKED", "CONFIRMED"].includes(status)) return "bg-[#e6f9ed] text-[#16a34a]";
  if (["On Request", "CONTACT_REQUIRED", "REQUESTED", "CONFIRMATION_AWAITED", "WAITLISTED"].includes(status)) return "bg-[#fff7ed] text-[#ea580c]";
  if (["Unavailable", "UNAVAILABLE", "CANCELLED", "EXPIRED"].includes(status)) return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
};

const displayStatus = (status: string): string => ({
  CONTACT_REQUIRED: "Contact Required",
  REQUESTED: "Request Sent",
  CONFIRMATION_AWAITED: "Awaiting Response",
  BLOCKED: "Blocked",
  WAITLISTED: "Waitlisted",
  UNAVAILABLE: "Unavailable",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
}[status] || status);

type QuotationHotelReviewSectionsProps = {
  requiresHotelBookingFlow: boolean;
  externalStayEntries: readonly ExternalStayEntry[];
  defaultExternalStayMessage: string;
  hasAcceptedUpdatedPrice: boolean;
  setHasAcceptedUpdatedPrice: Dispatch<SetStateAction<boolean>>;
  prebookData?: PrebookData | null;
  isPrebooking: boolean;
  isOpeningConfirmQuotation: boolean;
  nonTboSelectedHotelEntries: readonly HotelEntry[];
  prebookHotelEntries: readonly HotelEntry[];
  holdRequests?: readonly HotelEntry[];
  hasPrebookPriceChanged: boolean;
  normalizePrebookItems: (value: unknown) => string[];
  resolvePrebookInclusions: (hotel: unknown) => string[];
  resolvePrebookMealPlan: (hotel: unknown) => string;
  normalizeCancellationPolicyItems: (value: unknown) => string[];
  normalizeMealPlanLabel: (value?: string | null) => string;
  compact?: boolean;
};

/** Owns the external-stay, non-TBO, and TBO prebook review sections in quotation confirmation. */
export function QuotationHotelReviewSections({
  requiresHotelBookingFlow,
  externalStayEntries,
  defaultExternalStayMessage,
  hasAcceptedUpdatedPrice,
  setHasAcceptedUpdatedPrice,
  prebookData,
  isPrebooking,
  isOpeningConfirmQuotation,
  nonTboSelectedHotelEntries,
  prebookHotelEntries,
  holdRequests = [],
  hasPrebookPriceChanged,
  normalizePrebookItems,
  resolvePrebookInclusions,
  resolvePrebookMealPlan,
  normalizeCancellationPolicyItems,
  normalizeMealPlanLabel,
  compact = false,
}: QuotationHotelReviewSectionsProps) {
  const offlineSelectedHotelEntries = nonTboSelectedHotelEntries.filter(isManualApprovalHotel);
  const supplierManagedNonTboEntries = nonTboSelectedHotelEntries.filter((entry) => !isManualApprovalHotel(entry));
  const totalSelectedHotelEntries = prebookHotelEntries.length + nonTboSelectedHotelEntries.length;
  const holdByName = new Map<string, HotelEntry>();
  for (const request of holdRequests) {
    const normalizedRequest = asRecord(request);
    const status = textValue(normalizedRequest, "status").toUpperCase();
    if (["SUPERSEDED", "CANCELLED"].includes(status)) continue;
    const name = textValue(normalizedRequest, "hotelName", "hotel_name").toLowerCase();
    if (name) holdByName.set(name, normalizedRequest);
  }
  const hotelTableRows: HotelTableRow[] = [
    ...prebookHotelEntries.flatMap((entry, index) => {
      const hotel = asRecord(entry);
      const routeIds = Array.isArray(hotel.routeIds) ? hotel.routeIds : [];
      const dayNumbers = Array.isArray(hotel.dayNumbers)
        ? hotel.dayNumbers.map((day) => String(day))
        : [textValue(hotel, "dayNumber", "day", "routeDayNumber") || String(index + 1)];
      const destination = textValue(hotel, "destination", "city", "cityName", "hotelCity") || "-";
      const hotelName = textValue(hotel, "hotelName") || `Hotel ${index + 1}`;
      return dayNumbers.map((dayNumber, dayIndex) => ({
        key: `prebook-${String(routeIds[dayIndex] || dayNumber)}-${index}`,
        day: `Day ${dayNumber}`,
        destination,
        hotel: hotelName,
        status: textValue(holdByName.get(hotelName.toLowerCase()) || {}, "status") || statusLabel(hotel, false),
        holdUntil: textValue(holdByName.get(hotelName.toLowerCase()) || {}, "cutoffAt", "holdUntil") || "-",
        imageUrl: hotelImageUrl(hotel, asRecord(hotel.rateOption), asRecord(hotel.selectedRateOption)),
        rating: textValue(hotel, "starRating", "category", "hotelCategory"),
      }));
    }),
    ...nonTboSelectedHotelEntries.flatMap((entry, index) => {
      const hotel = asRecord(entry);
      const routeIds = Array.isArray(hotel.displayRouteIds) && hotel.displayRouteIds.length > 0
        ? hotel.displayRouteIds
        : [hotel.routeId || index + 1];
      const dayNumbers = Array.isArray(hotel.displayDayNumbers) && hotel.displayDayNumbers.length > 0
        ? hotel.displayDayNumbers.map((day) => String(day))
        : routeIds.map((_routeId, routeIndex) => String(routeIndex + 1));
      const destinations = Array.isArray(hotel.displayDestinations) ? hotel.displayDestinations : [];
      const matchedHotelRow = asRecord(hotel.matchedHotelRow);
      const destinationFallback = textValue(hotel, "destination", "city", "cityName")
        || textValue(matchedHotelRow, "destination", "city", "cityName", "locationName")
        || "-";
      const hotelName = textValue(hotel, "hotelName") || textValue(matchedHotelRow, "hotelName") || `Hotel ${index + 1}`;
      return dayNumbers.map((dayNumber, dayIndex) => ({
        key: `selected-${String(routeIds[dayIndex] || hotel.routeId || index + 1)}-${index}`,
        day: `Day ${dayNumber}`,
        destination: destinations[dayIndex] || destinations[0] || destinationFallback,
        hotel: hotelName,
        status: textValue(holdByName.get(hotelName.toLowerCase()) || {}, "status") || statusLabel(hotel, false),
        holdUntil: textValue(holdByName.get(hotelName.toLowerCase()) || {}, "cutoffAt", "holdUntil") || "-",
        imageUrl: hotelImageUrl(
          hotel,
          matchedHotelRow,
          asRecord(hotel.rateOption),
          asRecord(hotel.selectedRateOption),
        ),
        rating: textValue(hotel, "starRating", "category", "hotelCategory") || textValue(matchedHotelRow, "starRating", "category", "hotelCategory"),
      }));
    }),
  ];

  return (
    <>
      {hotelTableRows.length > 0 && (
        <div data-purpose="hotel-package-table" className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-white px-4 py-3">
            <h3 className="text-xs font-bold text-[#1e1b4b]">Hotels in This Package</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">Review hotel status and take action before the package hold expires.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Day</th>
                  <th className="px-4 py-2.5 font-semibold">Destination</th>
                  <th className="px-4 py-2.5 font-semibold">Hotel</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Hold Until</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hotelTableRows.map((row) => (
                  <tr key={row.key} className="align-middle">
                    <td className="whitespace-nowrap px-4 py-3"><span className="inline-flex rounded-md bg-[#ff9900] px-2.5 py-1 text-[10px] font-bold text-white">{row.day}</span></td>
                    <td className="px-4 py-3 text-slate-600">{row.destination}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {row.imageUrl ? <img src={row.imageUrl} alt={row.hotel} className="h-9 w-9 rounded-md border border-slate-200 object-cover" /> : <span className="h-9 w-9 rounded-md border border-slate-200 bg-slate-100" aria-hidden="true" />}
                        <div><div className="font-bold text-[#1e1b4b]">{row.hotel}</div><div className="mt-0.5 text-[10px] text-amber-500">{row.rating ? `${"★".repeat(Math.min(Math.max(Number.parseInt(row.rating, 10) || 0, 0), 5))}` : ""}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass(row.status)}`}>
                        <span aria-hidden="true">{["Held", "Available", "BLOCKED", "CONFIRMED"].includes(row.status) ? "✓" : "•"}</span>
                        {displayStatus(row.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.holdUntil}</td>
                    <td className="px-4 py-3 text-right">
                      <a href="#hotel-review-details" className="inline-flex rounded-md border border-[#5c24e5] px-3 py-1.5 text-[10px] font-semibold text-[#5c24e5] transition hover:bg-[#f3eeff]">View Details</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!compact && requiresHotelBookingFlow && externalStayEntries.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div>
            <h3 className="font-semibold text-amber-900">External / self-arranged stay required</h3>
            <p className="mt-1 text-xs text-amber-800">These city/date rows do not have supplier-bookable rooms. They will be shown in the itinerary, but they will not be sent to prebook or final supplier booking.</p>
          </div>
          <div className="space-y-2">
            {externalStayEntries.map((entry, index) => (
              <div key={`external-stay-${entry.routeId || "na"}-${index}`} className="rounded-md border border-amber-100 bg-white/80 px-3 py-2">
                <p className="text-sm font-medium text-amber-900">Route {entry.routeId || "-"}{entry.destination ? ` · ${entry.destination}` : ""}{entry.day ? ` · ${entry.day}` : ""}</p>
                <p className="mt-1 text-xs text-amber-800">{entry.availabilityMessage || defaultExternalStayMessage}</p>
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm text-amber-900">
            <input type="checkbox" className="mt-1" checked={hasAcceptedUpdatedPrice} onChange={(event) => setHasAcceptedUpdatedPrice(event.target.checked)} />
            <span>I understand these hotel stays are external/self-arranged and will not be booked through supplier APIs.</span>
          </label>
        </div>
      )}

      {!compact && requiresHotelBookingFlow && offlineSelectedHotelEntries.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div>
            <h3 className="font-semibold text-amber-900">Offline hotels - manual confirmation required</h3>
            <p className="mt-1 text-xs text-amber-800">These selected hotels are included in the itinerary, but they are not booked through VSR or another live supplier API. Availability and the final rate are subject to hotel confirmation.</p>
          </div>
          <QuotationNonTboSelectedHotels entries={offlineSelectedHotelEntries} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions} resolvePrebookMealPlan={resolvePrebookMealPlan} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel} keyPrefix="offline-hotel" providerNote="Offline hotel. Manual confirmation is required before this stay is guaranteed." />
          <div className="rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-900">
            <p className="font-semibold">Mixed live and offline booking instructions</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              <li>Live/VSR hotels are prebooked and booked through supplier APIs when final confirmation is completed.</li>
              <li>Offline hotels are not booked through an API. They remain visible as manual-confirmation stays with their approval status.</li>
              <li>The itinerary can be confirmed now; each offline hotel is then sent for manual approval and confirmation.</li>
              <li>Do not issue a supplier-confirmed voucher for an offline stay until the hotel approves its availability and rate.</li>
            </ol>
          </div>
          <QuotationNonTboAcceptanceNotice accepted={hasAcceptedUpdatedPrice} setAccepted={setHasAcceptedUpdatedPrice} />
        </div>
      )}

      {!compact && requiresHotelBookingFlow && !prebookData && !isPrebooking && !isOpeningConfirmQuotation && supplierManagedNonTboEntries.length > 0 && (
        <div className="space-y-3 rounded-lg border border-[#e5d9f2] bg-[#faf5ff] p-4">
          <h3 className="font-semibold text-[#4a4260]">Selected Hotels (Non-VSR)</h3>
          <p className="text-xs text-[#6c6c6c]">No VSR hotels selected — VSR prebook not required for this booking.</p>
          <QuotationNonTboSelectedHotels entries={supplierManagedNonTboEntries} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions} resolvePrebookMealPlan={resolvePrebookMealPlan} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel} keyPrefix="ntbo-only" providerNote="Policies and rate conditions are managed by the provider. VSR prebook is not applicable." />
          <QuotationNonTboAcceptanceNotice accepted={hasAcceptedUpdatedPrice} setAccepted={setHasAcceptedUpdatedPrice} />
        </div>
      )}

      {!compact && requiresHotelBookingFlow && prebookData && (
        <div className="space-y-3 rounded-lg border border-[#e5d9f2] bg-[#faf5ff] p-4">
          <h3 className="font-semibold text-[#4a4260]">Prebook Review</h3>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div><p className="text-[#6c6c6c]">Hotel Final Cost</p><p className="font-semibold text-[#4a4260]">₹ {Number(prebookData.updatedTotalPrice || prebookData.finalPrice || prebookData.totalAmount || 0).toFixed(2)}</p></div>
            <div><p className="text-[#6c6c6c]">Hotels Selected</p><p className="font-semibold text-[#4a4260]">{totalSelectedHotelEntries}</p></div>
            <div><p className="text-[#6c6c6c]">Hotels Prebooked</p><p className="font-semibold text-[#4a4260]">{prebookHotelEntries.length || 0}</p></div>
          </div>
          <QuotationPrebookHotelRows entries={prebookHotelEntries as never} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions as never} resolvePrebookMealPlan={resolvePrebookMealPlan as never} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel as (value: string) => string} />
          {supplierManagedNonTboEntries.length > 0 && <div className="space-y-2"><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#6c6c6c]">Non-VSR Selected Hotels</p><QuotationNonTboSelectedHotels entries={supplierManagedNonTboEntries} normalizePrebookItems={normalizePrebookItems} resolvePrebookInclusions={resolvePrebookInclusions} resolvePrebookMealPlan={resolvePrebookMealPlan} normalizeCancellationPolicyItems={normalizeCancellationPolicyItems} normalizeMealPlanLabel={normalizeMealPlanLabel} keyPrefix="non-tbo-hotel" providerNote="This hotel is managed outside VSR. Details shown here come from the selected provider record." /></div>}
          <QuotationPrebookAcceptanceNotice priceChanged={hasPrebookPriceChanged} accepted={hasAcceptedUpdatedPrice} setAccepted={setHasAcceptedUpdatedPrice} />
        </div>
      )}
      {compact && requiresHotelBookingFlow && (
        <label className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          <input type="checkbox" className="mt-0.5" checked={hasAcceptedUpdatedPrice} onChange={(event) => setHasAcceptedUpdatedPrice(event.target.checked)} />
          <span>I have reviewed the selected hotel details before final booking confirmation.</span>
        </label>
      )}
    </>
  );
}

export default QuotationHotelReviewSections;
