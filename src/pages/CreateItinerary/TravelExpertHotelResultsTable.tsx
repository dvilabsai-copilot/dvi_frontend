// DVI_TE_HOTEL_ROOMS_COLUMN_V1: hide Stay N labels, show selected room count per search box.
import { Fragment, useEffect, useState } from "react";
import { Building2, Check, ChevronUp, Loader2, Pencil, Search } from "lucide-react";
import type { HotelSearchSectionSnapshot } from "./TravelExpertHotelSearch";

// DVI_TE_HOTELS_INLINE_SELECTION_V1
// This is a pre-itinerary supplier-availability preview. The real saved itinerary
// Hotel List's state, booking actions, and rate confirmation remain separate.

type Props = {
  searchRequestId: number;
  sectionIds: string[];
  snapshots: Record<string, HotelSearchSectionSnapshot>;
};

type HotelData = Record<string, unknown>;

function asRecord(value: unknown): HotelData {
  return value && typeof value === "object" && !Array.isArray(value) ? value as HotelData : {};
}

function firstRecord(value: unknown): HotelData {
  return Array.isArray(value) && value.length ? asRecord(value[0]) : {};
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || "—";
}

function firstImage(hotel: HotelData): string {
  const images = hotel.images;
  const raw = stringValue(hotel.primaryImageUrl, Array.isArray(images) ? images[0] : "");
  return /^https?:\/\//i.test(raw) ? raw : "";
}

function roomType(hotel: HotelData): string {
  const firstRoom = firstRecord(hotel.roomTypes);
  const firstRate = firstRecord(hotel.rateOptions);
  const firstSelection = firstRecord(hotel.roomSelections);
  return stringValue(hotel.roomType, hotel.roomName, firstSelection.roomType, firstSelection.roomName,
    firstRoom.roomTypeName, firstRoom.roomName, firstRate.roomType, firstRate.roomName) || "Room type unavailable";
}

function amount(hotel: HotelData): { value: number; basis: "stay" | "night" | "unspecified"; currency: string } | null {
  const currency = stringValue(hotel.currency) || "INR";
  const total = Number(hotel.totalStayPrice || 0);
  if (Number.isFinite(total) && total > 0) return { value: total, basis: "stay", currency };
  const nightly = Number(hotel.pricePerNight || 0);
  if (Number.isFinite(nightly) && nightly > 0) return { value: nightly, basis: "night", currency };
  const unknown = Number(hotel.price || 0);
  if (Number.isFinite(unknown) && unknown > 0) return { value: unknown, basis: "unspecified", currency };
  return null;
}

function rateLabel(hotel: HotelData): string {
  const price = amount(hotel);
  if (!price) return stringValue(hotel.priceLabel) || "Rate on request";
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(price.value);
  return `${price.currency === "INR" ? "₹" : price.currency + " "}${formatted}${price.basis === "night" ? " / night" : price.basis === "stay" ? " / stay" : ""}`;
}

function isSelectable(hotel: HotelData): boolean {
  const status = stringValue(hotel.availabilityStatus).toUpperCase();
  return hotel.isSelectable !== false && status !== "UNAVAILABLE" && status !== "RESTRICTED";
}

function messageFor(result: HotelSearchSectionSnapshot | null): string {
  if (!result) return "Waiting for availability search…";
  if (!result.city) return "Select a location for this hotel search box.";
  if (!result.checkIn || !result.checkOut || result.checkOut <= result.checkIn) return "Select valid Check-In and Check-Out dates.";
  if (result.status === "stale") return "Search settings changed. Click Search Hotels again to refresh results.";
  if (result.status === "error") return result.error || "Hotel availability could not be loaded.";
  if (result.status === "loading" || result.status === "waiting") return "Searching hotels…";
  if (!result.hotels.length) return "No hotels returned for this location and dates. Try another city, date, category or meal plan.";
  return "No selectable hotel is available for this location.";
}

function roomsLabel(result: HotelSearchSectionSnapshot | null): string {
  const count = result?.roomCount;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) return "—";
  return `${count} Room${count === 1 ? "" : "s"}`;
}


// DVI_TE_HOTELS_REQUESTED_MEAL_IN_LIST_V1: keep the user's selected meal plan visible without claiming supplier confirmation.
function supplierMealPlan(hotel: HotelData): string {
  const rate = firstRecord(hotel.rateOptions);
  const room = firstRecord(hotel.rooms);
  const selection = firstRecord(hotel.roomSelections);
  const candidates = [hotel.mealPlan, hotel.mealType, hotel.MealPlan, rate.mealPlan,
    rate.mealType, selection.mealPlan, room.mealPlan, room.mealType];
  for (const value of candidates) {
    const plan = stringValue(value);
    if (plan && !/^(UNKNOWN|N\/?A|NOT PROVIDED|NONE|UNSPECIFIED|-|NULL)$/i.test(plan)) return plan;
  }
  return "";
}
function knownMealCode(value: string): string {
  const plan = String(value || "").trim().toUpperCase();
  const match = /^(MAP|CP|EP|AP)(?=$|[\s\-:()])/i.exec(plan);
  if (match) return match[1];
  if (/MODIFIED AMERICAN/.test(plan)) return "MAP";
  if (/CONTINENTAL PLAN|BREAKFAST ONLY/.test(plan)) return "CP";
  if (/EUROPEAN PLAN|ROOM ONLY/.test(plan)) return "EP";
  if (/AMERICAN PLAN|FULL BOARD/.test(plan)) return "AP";
  return plan;
}
function RequestedMealPlan({ hotel, requested }: { hotel: HotelData; requested?: string }) {
  const selected = String(requested || "").trim().toUpperCase();
  const supplier = supplierMealPlan(hotel);
  if (!selected) return <span>{supplier || "Not provided"}</span>;
  const agrees = supplier && knownMealCode(supplier) === knownMealCode(selected);
  return (
    <span className="block">
      <strong className="block font-semibold text-[#443b52]">{selected}</strong>
      {supplier ? (
        agrees
          ? <span className="block text-[11px] text-[#6c6076]">Supplier: {supplier}</span>
          : <span className="block text-[11px] text-amber-700">Requested; supplier lists {supplier}</span>
      ) : <span className="block text-[11px] text-amber-700">Requested · supplier not confirmed</span>}
    </span>
  );
}

export function TravelExpertHotelResultsTable({ searchRequestId, sectionIds, snapshots }: Props) {
  const [activeOption, setActiveOption] = useState(0);
  const [expandedStay, setExpandedStay] = useState<string | null>(null);
  const [hotelQuery, setHotelQuery] = useState("");
  const [selections, setSelections] = useState<Record<string, number>>({});

  // A new Search Hotels action produces a fresh group of recommendations.
  useEffect(() => {
    setActiveOption(0);
    setExpandedStay(null);
    setHotelQuery("");
    setSelections({});
  }, [searchRequestId]);

  if (searchRequestId <= 0) return null;

  const rows = sectionIds.map((id, index) => ({
    id,
    index,
    result: snapshots[id]?.requestId === searchRequestId ? snapshots[id] : null,
  }));
  const maxOptionCount = Math.min(4, Math.max(0, ...rows.map(({ result }) => result?.hotels.length || 0)));
  const currentOption = Math.min(activeOption, Math.max(0, maxOptionCount - 1));
  const isLoading = rows.some(({ result }) => !result || result.status === "loading" || result.status === "waiting");

  const selectedIndexFor = (id: string, hotels: unknown[]): number => {
    const key = `${currentOption}:${id}`;
    const explicit = selections[key];
    if (typeof explicit === "number" && explicit >= 0 && explicit < hotels.length && isSelectable(asRecord(hotels[explicit]))) return explicit;
    const preferred = Math.min(currentOption, Math.max(0, hotels.length - 1));
    if (hotels.length && isSelectable(asRecord(hotels[preferred]))) return preferred;
    return hotels.findIndex(hotel => isSelectable(asRecord(hotel)));
  };

  return (
    <section className="mt-5 rounded-xl border border-[#eadcf7] bg-white p-3 shadow-sm sm:p-4" aria-label="Hotel search results" data-dvi-te-hotel-results-table>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-[#342a49]">HOTEL LIST</h3>
        <span className="text-xs text-[#73677f]">Availability preview — not booked</span>
      </div>

      {maxOptionCount > 0 && (
        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Hotel recommendations preview">
          {Array.from({ length: maxOptionCount }, (_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={currentOption === index}
              onClick={() => { setActiveOption(index); setHotelQuery(""); setExpandedStay(null); }}
              className={`min-w-32 rounded-lg border px-4 py-2 text-left text-xs font-semibold transition ${currentOption === index
                ? "border-transparent bg-gradient-to-r from-[#8154d6] to-[#df5ab9] text-white"
                : "border-[#eadcf7] bg-white text-[#765983] hover:bg-[#fff1fa]"}`}
            >
              Recommended #{index + 1}
              <span className="block text-[10px] font-normal opacity-80">Availability option</span>
            </button>
          ))}
        </div>
      )}

      {isLoading && <p role="status" className="mb-3 flex items-center gap-2 text-sm text-[#614e78]"><Loader2 className="h-4 w-4 animate-spin" /> Loading hotel availability…</p>}

      <div className="overflow-x-auto rounded-xl border border-[#e9ddf5]">
        <table className="w-full min-w-[810px] border-collapse text-left text-sm">
          <thead className="bg-[#f8f6fc] text-[11px] font-semibold uppercase tracking-wide text-[#6e6180]">
            <tr>
              <th className="px-3 py-3">Dates</th>
              <th className="px-3 py-3">Destination</th>
              <th className="px-3 py-3">Hotel</th>
              <th className="px-3 py-3">Room Type</th>
              <th className="px-3 py-3">Rooms</th>
              <th className="px-3 py-3">Meal Plan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, index, result }) => {
              const hotels = result?.status === "done" ? result.hotels || [] : [];
              const chosenIndex = selectedIndexFor(id, hotels);
              const chosenHotel = chosenIndex >= 0 ? asRecord(hotels[chosenIndex]) : null;
              const open = expandedStay === id;
              const visibleHotels = hotels
                .map((hotel, hotelIndex) => ({ hotel: asRecord(hotel), hotelIndex }))
                .filter(({ hotel }) => !hotelQuery.trim() || stringValue(hotel.hotelName).toLowerCase().includes(hotelQuery.trim().toLowerCase()));
              return (
                <Fragment key={id}>
                  <tr className="border-t border-[#eee8f5] align-top">
                    <td className="px-3 py-3 text-xs text-[#514269]">
                      <span>{result ? `${formatDate(result.checkIn)} — ${formatDate(result.checkOut)}` : "—"}</span>
                    </td>
                    <td className="break-words px-3 py-3 font-medium text-[#393149]">{result?.city || "Select location"}</td>
                    {chosenHotel ? (
                      <>
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <span className="min-w-0 font-semibold text-[#2f2940]">{stringValue(chosenHotel.hotelName) || "Hotel name unavailable"}</span>
                            <button type="button" aria-label={`Change hotel for stay ${index + 1}`} aria-expanded={open} onClick={() => {setExpandedStay(open ? null : id);setHotelQuery("");}} className="shrink-0 rounded p-1 text-[#8337cb] hover:bg-[#f5e8ff]"><Pencil className="h-3.5 w-3.5" /></button>
                          </div>
                          <span className="mt-1 block text-xs text-[#766884]">{rateLabel(chosenHotel)}</span>
                        </td>
                        <td className="break-words px-3 py-3 text-[#443b52]">{roomType(chosenHotel)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#443b52]">{roomsLabel(result)}</td>
                        <td className="break-words px-3 py-3 text-[#443b52]"><RequestedMealPlan hotel={chosenHotel} requested={result?.requestedMealPlanCode} /></td>
                      </>
                    ) : (
                      <>
                        <td colSpan={2} className="px-3 py-3 text-sm text-[#796a85]">{messageFor(result)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#443b52]">{roomsLabel(result)}</td>
                        <td className="px-3 py-3 text-[#796a85]">—</td>
                      </>
                    )}
                  </tr>
                  {open && chosenHotel && (
                    <tr>
                      <td colSpan={6} className="border-t border-[#eadcf7] bg-[#fcf7ff] px-3 py-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-medium text-[#614e78]">Showing {visibleHotels.length} of {hotels.length} available hotels</div>
                          <label className="flex w-full max-w-[420px] items-center gap-2 rounded-md border border-[#e9d8f5] bg-white px-3 py-2 text-xs">
                            <Search className="h-4 w-4 shrink-0 text-[#8864a4]" />
                            <input value={hotelQuery} onChange={event => setHotelQuery(event.target.value)} placeholder="Search hotels in these results…" className="w-full min-w-0 bg-transparent outline-none" aria-label={`Filter hotel choices for stay ${index + 1}`} />
                          </label>
                        </div>
                        {visibleHotels.length === 0 ? <p className="py-4 text-sm text-[#78698c]">No hotels match your search.</p> : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {visibleHotels.map(({ hotel, hotelIndex }) => {
                              const selected = hotelIndex === chosenIndex;
                              const img = firstImage(hotel);
                              const selectable = isSelectable(hotel);
                              return (
                                <article key={`${id}-${hotelIndex}`} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${selected ? "border-[#62b58b]" : "border-[#eadcf7]"}`}>
                                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[#f5e8ff] to-[#ddeaf5]">
                                    {img ? <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-[#9366b4]"><Building2 className="h-11 w-11" /></div>}
                                    <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#6c4788]">{stringValue(hotel.providerDisplayName, hotel.provider) || "Hotel"}</span>
                                  </div>
                                  <div className="space-y-2 p-3">
                                    <h4 className="min-h-9 text-xs font-semibold text-[#332a44]">{stringValue(hotel.hotelName) || "Hotel"}</h4>
                                    <p className="text-xs font-semibold text-[#713ea4]">{rateLabel(hotel)}</p>
                                    <div className="text-[11px] text-[#63566f]">Check-In: {formatDate(result?.checkIn || "")}</div>
                                    <div className="text-[11px] text-[#63566f]">Check-Out: {formatDate(result?.checkOut || "")}</div>
                                    <div className="text-[11px] text-[#4c405a]">Room type: {roomType(hotel)}</div>
                                    <div className="text-[11px] text-[#4c405a]">Meal plan: <RequestedMealPlan hotel={hotel} requested={result?.requestedMealPlanCode} /></div>
                                    <button
                                      type="button"
                                      disabled={!selectable || selected}
                                      onClick={() => setSelections(previous => ({ ...previous, [`${currentOption}:${id}`]: hotelIndex }))}
                                      className={`flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-semibold text-white ${selected ? "bg-[#18ac6a]" : "bg-[#7436c7] hover:bg-[#6429b5]"} disabled:cursor-default disabled:opacity-80`}
                                    >
                                      {selected ? <><Check className="h-3.5 w-3.5" /> Selected</> : selectable ? "Choose" : "Unavailable"}
                                    </button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}
                        <button type="button" onClick={() => setExpandedStay(null)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#7947a5] hover:underline"><ChevronUp className="h-3.5 w-3.5" /> Hide hotel choices</button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[#746581]">
        Click a pencil beside a hotel to compare available properties, then Choose to change the selected preview for that stay.
        Recommendations are local previews based on current supplier availability. No booking, itinerary update, or payment is performed here.
      </p>
    </section>
  );
}
