import React from "react";
import { Building2, CalendarDays, Check, Clock3, MapPin, Utensils } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveUploadUrl } from "@/lib/api";
import { getHotelDisplayAmount, getMealPlanDisplayLabel } from "../../hotel-list/hotelList.utils";
import { replaceHotelProviderBrandForDisplay } from "@/utils/hotelProviderDisplay";
import type { ItineraryHotelRow } from "../ItineraryDetails";

type HotelRecord = Record<string, unknown>;
type HotelLike = Partial<ItineraryHotelRow> & Record<string, unknown>;

export type HotelDetailsDialogTarget = {
  hotel: HotelRecord;
  imageUrl?: string;
  hotelName?: string;
  destination?: string;
  day?: string;
  dayDate?: string;
  rating?: string;
};

type HotelDetailsDialogProps = {
  target: HotelDetailsDialogTarget | null;
  onOpenChange: (open: boolean) => void;
};

const asRecord = (value: unknown): HotelRecord => (
  value && typeof value === "object" ? value as HotelRecord : {}
);

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
};

const parseListValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseListValue(item));
  }
  if (value && typeof value === "object") {
    const record = asRecord(value);
    return parseListValue(record.name || record.title || record.label || record.description || record.value);
  }
  const text = String(value ?? "").trim();
  if (!text) return [];
  if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
    try {
      return parseListValue(JSON.parse(text));
    } catch {
      // Keep the original text when a supplier sends non-JSON content.
    }
  }
  return text
    .split(/\r?\n|\s*[•|]\s*/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
};

const uniqueList = (...values: unknown[]): string[] => Array.from(new Set(
  values.flatMap((value) => parseListValue(value)).map(replaceHotelProviderBrandForDisplay).filter(Boolean),
));

const formatMoney = (value: number): string => (
  Number.isFinite(value) && value > 0
    ? `₹ ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—"
);

const formatDate = (value: unknown): string => {
  const text = String(value ?? "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : firstText(value);
};

const getCategoryLabel = (hotel: HotelRecord): string => {
  const category = firstText(
    hotel.hotelCategoryName,
    hotel.hotelCategoryCode,
    hotel.category,
    hotel.hotelCategory,
    hotel.hotel_category,
  );
  if (/house\s*boat/i.test(category) || hotel.isHouseboat === true) return "Houseboat";
  if (!category) return "";
  return /^\d+$/.test(category) ? `${category}*` : category;
};

const formatCategoryLabel = (value: string): string => (
  /^\d+$/.test(value) ? `${value}*` : value
);

const getImageUrl = (hotel: HotelRecord, fallback = ""): string => {
  const direct = firstText(hotel.primaryImageUrl, hotel.primary_image_url, hotel.imageUrl, hotel.hotelImageUrl, fallback);
  if (direct) return resolveUploadUrl(direct);
  const images = Array.isArray(hotel.images) ? hotel.images : [];
  const firstImage = images.find((image) => String(image || "").trim());
  return firstImage ? resolveUploadUrl(String(firstImage)) : "";
};

const DetailList = ({ title, items, tone = "slate" }: { title: string; items: string[]; tone?: "slate" | "red" }) => (
  <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
    <h3 className={`text-xs font-bold ${tone === "red" ? "text-red-700" : "text-[#1e1b4b]"}`}>{title}</h3>
    {items.length > 0 ? (
      <ul className={`mt-2 space-y-1 text-xs leading-5 ${tone === "red" ? "text-red-700" : "text-slate-600"}`}>
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ) : <p className="mt-2 text-xs text-slate-400">No details available</p>}
  </section>
);

export const HotelDetailsDialog: React.FC<HotelDetailsDialogProps> = ({ target, onOpenChange }) => {
  const hotel = target?.hotel || {};
  const matchedHotel = asRecord(hotel.matchedHotelRow);
  const selectedRate = asRecord(hotel.selectedRateOption || hotel.selected_rate_option || hotel.rateOption || hotel.rate_option);
  const records = [hotel, selectedRate, matchedHotel];
  const hotelName = firstText(target?.hotelName, ...records.map((record) => record.hotelName), "Hotel");
  const destination = firstText(target?.destination, ...records.map((record) => record.destination || record.city || record.cityName || record.hotelCity));
  const imageUrl = getImageUrl(hotel, target?.imageUrl);
  const category = formatCategoryLabel(firstText(target?.rating, getCategoryLabel(hotel), getCategoryLabel(matchedHotel)));
  const provider = firstText(...records.map((record) => record.provider));
  const hotelCode = firstText(...records.map((record) => record.hotelCode || record.providerHotelCode || record.hotel_code));
  const roomType = firstText(...records.map((record) => record.roomType || record.roomTypeName || record.room_type));
  const mealPlan = getMealPlanDisplayLabel(hotel) || firstText(...records.map((record) => record.mealPlan || record.meal_plan));
  const checkIn = formatDate(firstText(...records.map((record) => record.displayCheckInDate || record.checkInDate || record.check_in || record.date)));
  const checkOut = formatDate(firstText(...records.map((record) => record.displayCheckOutDate || record.checkOutDate || record.check_out)));
  const startingAmount = getHotelDisplayAmount(hotel as HotelLike) || getHotelDisplayAmount(selectedRate as HotelLike);
  const amenities = uniqueList(...records.map((record) => record.amenities || record.facilities));
  const inclusions = uniqueList(...records.map((record) => record.inclusions || record.packageInclusions || record.inclusion));
  const rateConditions = uniqueList(...records.map((record) => record.rateConditions || record.rate_conditions));
  const cancellation = uniqueList(...records.map((record) => record.cancellationPolicy || record.cancellationPoliciesText || record.cancellationPolicies));

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent data-testid="hotel-details-dialog" className="max-h-[92vh] max-w-3xl overflow-y-auto border-[#eadcf6] bg-white p-0 shadow-2xl">
        <div className="overflow-hidden rounded-lg">
          <div className="relative h-52 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] sm:h-64">
            {imageUrl ? <img src={imageUrl} alt={hotelName} className="absolute inset-0 h-full w-full object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 text-white">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                {provider ? <span className="rounded-full bg-white/90 px-2 py-1 text-[#4a4260]">{provider.toUpperCase()}</span> : null}
                {category ? <span className="rounded-full bg-amber-400 px-2 py-1 text-amber-950">{category}</span> : null}
              </div>
              <h2 className="mt-2 text-xl font-bold">{hotelName}</h2>
              {destination ? <p className="mt-1 flex items-center gap-1 text-xs text-white/90"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{destination}</p> : null}
            </div>
          </div>

          <div className="space-y-4 p-5">
            <DialogHeader className="sr-only">
              <DialogTitle>{hotelName}</DialogTitle>
              <DialogDescription>Hotel details</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#eadcf6] bg-[#faf7ff] p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="h-4 w-4 text-[#7c3aed]" />Stay dates</div>
                <p className="mt-2 text-sm font-semibold text-[#1e1b4b]">{checkIn && checkOut ? `${checkIn} – ${checkOut}` : "—"}</p>
              </div>
              <div className="rounded-xl border border-[#eadcf6] bg-[#faf7ff] p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4 text-[#7c3aed]" />Check-in / out</div>
                <p className="mt-2 text-sm font-semibold text-[#1e1b4b]">02:00 PM / 12:00 PM</p>
              </div>
              <div className="rounded-xl border border-[#eadcf6] bg-[#faf7ff] p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500"><Building2 className="h-4 w-4 text-[#7c3aed]" />Room type</div>
                <p className="mt-2 text-sm font-semibold text-[#1e1b4b]">{roomType || "—"}</p>
              </div>
              <div className="rounded-xl border border-[#eadcf6] bg-[#faf7ff] p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500"><Utensils className="h-4 w-4 text-[#7c3aed]" />Meal plan</div>
                <p className="mt-2 text-sm font-semibold text-[#1e1b4b]">{mealPlan || "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div><p className="text-xs text-slate-500">Hotel code</p><p className="text-sm font-semibold text-[#1e1b4b]">{hotelCode || "—"}</p></div>
              <div className="text-right"><p className="text-xs text-slate-500">Starting from</p><p className="text-lg font-bold text-[#7c3aed]">{formatMoney(startingAmount)}</p></div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <DetailList title="Amenities" items={amenities} />
              <DetailList title="Package Inclusions" items={inclusions} />
              <DetailList title="Rate Conditions" items={rateConditions} />
              <DetailList title="Cancellation Policy" items={cancellation} tone="red" />
            </div>

            <p className="text-center text-xs text-slate-400">{target?.day ? `${target.day}${target.dayDate ? ` | ${target.dayDate}` : ""}` : ""} · View-only hotel details</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelDetailsDialog;
