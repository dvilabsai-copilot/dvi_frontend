// DVI_TE_HOTELS_REQUESTED_MEAL_IN_LIST_V1: snapshot carries each search box's requested meal plan.
// DVI_TE_HOTEL_ROOMS_COLUMN_V1: preserve selected room count for each independently configured Hotels search.
// DVI_TE_HOTEL_RESULTS_BELOW_SEARCH_V1: share actual API availability with the Hotels results table.
// DVI_TE_HOTEL_SEARCH_ON_CLICK_V1: Travel Expert Hotels previews only after Search Hotels is clicked.
// DVI_TE_HOTELS_SINGLE_LOCATION_V1: hotel-only single searchable location.
// DVI_HOTEL_NUMERIC_GUEST_MEAL_V1: hotel-only numeric Rooms and readable Meal Plan.
// DVI_TE_HOTELS_THREE_SCREENSHOT_MARKS_20261031: remove dropdown placeholder; emphasize two fields.
// DVI_TE_HOTELS_USE_EXACT_TOURS_GUESTS_V1: Travel Expert Hotels uses the SAME Rooms & Guests modal as Tours & Attractions.
// DVI_TE_HOTELS_VIEWPORT_POPUPS_V3: Hotels-only Meal Plan and Rooms modal alignment.
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { BedDouble, CalendarDays, Check, ChevronDown, Loader2, Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AutoSuggestSelect } from "@/components/AutoSuggestSelect";
import type { RoomRow, RoomTemplate } from "./helpers/useRoomsAndTravellers";
import type { MealPlanOption } from "@/services/itineraryDropdownsMock";
import { getMealPlanLabel } from "./helpers/itineraryPlanBlock.utils";
import { ItineraryService } from "@/services/itinerary";
import {
  cloneRoomFromTemplate,
  getRoomOccupancyValidationError,
} from "./helpers/useRoomsAndTravellers";
import { TravelExpertHotelDateRangeInput } from "./TravelExpertHotelDateRangeInput";
import { TravelExpertToursRoomsGuests } from "./TravelExpertToursRoomsGuests";
import { TravelExpertToursHotelCategoryPills } from "./TravelExpertToursHotelCategoryPills";
import "./travelExpertHotelsPinkHover.css"; // DVI_TE_HOTELS_PINK_HOVER_V1


type HotelMode = "regular" | "group";
type LocationItem = { value: string; label: string };
type CityHotelState = {
  status: "waiting" | "loading" | "done" | "error";
  hotels: HotelPreview[];
  error?: string;
};
type HotelPreview = {
  hotelName: string;
  hotelCode?: string;
  provider?: string;
  address?: string;
  rating?: number;
  price?: number;
  pricePerNight?: number;
  currency?: string;
  mealPlan?: string;
  rateOptions?: Array<Record<string, unknown>>;
  availabilityStatus?: string;
};

export type HotelSearchSectionSnapshot = {
  requestId: number;
  city: string;
  checkIn: string;
  checkOut: string;
  roomCount: number;
  requestedMealPlanCode: string; // Selected in this Hotels search box
  status: "waiting" | "loading" | "done" | "error" | "stale";
  hotels: HotelPreview[];
  error?: string;
};

type Props = {
  searchSectionId?: string; // DVI_TE_HOTEL_RESULTS_BELOW_SEARCH_V1
  onHotelResultsChange?: (sectionId: string, snapshot: HotelSearchSectionSnapshot) => void;
  hideInlineHotelResults?: boolean;
  searchRequestId?: number; // DVI_TE_HOTEL_SEARCH_ON_CLICK_V1
  locationOptions: LocationItem[];
  arrivalLocation: string;
  setArrivalLocation: (value: string) => void;
  departureLocation: string;
  setDepartureLocation: (value: string) => void;
  hotelCategoryOptions: LocationItem[];
  selectedHotelCategoryIds: number[];
  setSelectedHotelCategoryIds: Dispatch<SetStateAction<number[]>>;
  mealPlanOptions: MealPlanOption[];
  mealPlanCode: string;
  setMealPlanCode: (value: string) => void;
  validationErrors?: Record<string, string>;
  tripStartDate: string;
  tripEndDate: string;
  setTripStartDate: (value: string) => void;
  setTripEndDate: (value: string) => void;
  minimumTripDate?: string;
  rooms: RoomRow[];
  setRooms: Dispatch<SetStateAction<RoomRow[]>>;
  defaultRoomTemplate: RoomTemplate;
};

// The Travel Expert UI uses 1–8 normal rooms and 9–20 group rooms.
const MAX_REGULAR_ROOMS = 8;
const MIN_GROUP_ROOMS = 9;
const MAX_GROUP_ROOMS = 20;
const toIso = (date: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date || "");
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
};
const toDviDate = (iso: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};
const localIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const nextIsoDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return localIsoDate(new Date(year, month - 1, day + 1));
};
const cloneRooms = (rooms: RoomRow[]): RoomRow[] =>
  rooms.map((room) => ({ ...room, childrenDetails: (room.childrenDetails || []).map((child) => ({ ...child })) }));
const fitRoomCount = (source: RoomRow[], count: number, template: RoomTemplate): RoomRow[] => {
  const existing = cloneRooms(source).slice(0, count);
  while (existing.length < count) {
    existing.push(cloneRoomFromTemplate(template, existing.length + 1, count));
  }
  return existing.map((room, index) => ({ ...room, id: index + 1, roomCount: count }));
};
const roomLabel = (count: number) => `${count} Room${count === 1 ? "" : "s"}`;

/** Travel Expert / Hotel-only search controls. No separate booking state or API writes. */
// DVI_TE_HOTELS_POPUPS_V1: portal-anchored guests, custom meal plan, compact calendar.
// DVI_TE_HOTELS_NAV_SAFE_POPUPS_V2: Hotels-only; Tours-style Rooms modal and Meal Plan select.
export function TravelExpertHotelSearch({
  locationOptions,
  arrivalLocation,
  setArrivalLocation,
  departureLocation,
  setDepartureLocation,
  hotelCategoryOptions,
  selectedHotelCategoryIds,
  setSelectedHotelCategoryIds,
  mealPlanOptions,
  mealPlanCode,
  setMealPlanCode,
  validationErrors,
  tripStartDate,
  tripEndDate,
  setTripStartDate,
  setTripEndDate,
  minimumTripDate,
  rooms,
  setRooms,
  defaultRoomTemplate,
  searchRequestId = 0,
  searchSectionId = "primary",
  onHotelResultsChange,
  hideInlineHotelResults = false,
}: Props) {
  const [mode, setMode] = useState<HotelMode>(() => rooms.length > MAX_REGULAR_ROOMS ? "group" : "regular");
  // Keep the Hotels upper room-mode radio in sync with changes applied in the Tours modal.
  useEffect(() => {
    const nextMode: HotelMode = rooms.length > MAX_REGULAR_ROOMS ? "group" : "regular";
    setMode((current) => current === nextMode ? current : nextMode);
  }, [rooms.length]);
  // Single hotel-search location; Arrival and Departure are kept consistent.
    const [selectedLocations, setSelectedLocations] = useState<string[]>(() => {
    const city = String(arrivalLocation || departureLocation || "").trim();
    return city ? [city] : [];
  });
  useEffect(() => {
    const city = String(arrivalLocation || departureLocation || "").trim();
    setSelectedLocations((previous) =>
      previous.length === (city ? 1 : 0) && (!city || previous[0] === city)
        ? previous
        : (city ? [city] : []),
    );
  }, [arrivalLocation, departureLocation]);

  const onLocationsChange = (value: string) => {
    const city = String(value || "").trim();
    setSelectedLocations(city ? [city] : []);
    setArrivalLocation(city);
    setDepartureLocation(city);
  };

  const [hotelsByCity, setHotelsByCity] = useState<Record<string, CityHotelState>>({});
  const [isGuestsOpen, setGuestsOpen] = useState(false);
  const [draftRooms, setDraftRooms] = useState<RoomRow[]>([]);
  const [roomError, setRoomError] = useState("");
  const previousModeRooms = useRef<{ regular: RoomRow[] | null; group: RoomRow[] | null }>({
    regular: null,
    group: null,
  });

  const adults = rooms.reduce((sum, room) => sum + Number(room.adults || 0), 0);
  const children = rooms.reduce((sum, room) => sum + Number(room.children || 0), 0);
  const infants = rooms.reduce((sum, room) => sum + Number(room.infants || 0), 0);
  const today = new Date();
  today.setDate(today.getDate() + 1); // Preserve DVI's existing no-today/past-date rule.
  const earliestStart = [localIsoDate(today), toIso(minimumTripDate || "")].sort().filter(Boolean).pop() || localIsoDate(today);
  const checkIn = toIso(tripStartDate);
  const checkOut = toIso(tripEndDate);
  const minCheckOut = nextIsoDate(checkIn || earliestStart);

  const selectMode = (next: HotelMode) => {
    if (next === mode) return;
    previousModeRooms.current[mode] = cloneRooms(rooms);
    const cached = previousModeRooms.current[next];
    const incoming = cached ?? rooms;
    const count = next === "group"
      ? (cached ? Math.min(MAX_GROUP_ROOMS, Math.max(MIN_GROUP_ROOMS, incoming.length)) : MAX_GROUP_ROOMS)
      : Math.max(1, Math.min(MAX_REGULAR_ROOMS, incoming.length));
    setRooms(fitRoomCount(incoming, count, defaultRoomTemplate));
    setMode(next);
    setGuestsOpen(false);
  };

  const openGuests = () => {
    const min = mode === "group" ? MIN_GROUP_ROOMS : 1;
    const max = mode === "group" ? MAX_GROUP_ROOMS : MAX_REGULAR_ROOMS;
    const count = Math.min(max, Math.max(min, rooms.length));
    setDraftRooms(fitRoomCount(rooms, count, defaultRoomTemplate));
    setRoomError("");
    setGuestsOpen(true);
  };

  const editDraft = (index: number, update: (room: RoomRow) => RoomRow) => {
    const current = draftRooms[index];
    if (!current) return;
    const next = update(current);
    setDraftRooms((previous) => previous.map((room, i) => i === index ? next : room));
  };

  const changeCounts = (index: number, field: "adults" | "children" | "infants", delta: number) => {
    setRoomError("");
    editDraft(index, (room) => {
      const adults = field === "adults" ? Math.max(1, room.adults + delta) : room.adults;
      const children = field === "children" ? Math.max(0, room.children + delta) : room.children;
      const infants = field === "infants" ? Math.max(0, room.infants + delta) : room.infants;
      const details = Array.from({ length: children }, (_, i) => {
        const existing = room.childrenDetails?.[i];
        return existing ? { ...existing } : {
          age: "" as const,
          bedType: (i === 1 ? "With Bed" : "Without Bed") as "With Bed" | "Without Bed",
          hotelApprovalAccepted: false,
        };
      });
      // Keep the existing DVI room occupancy rules, including the second-child bed.
      const next = { ...room, adults, children, infants, extraBeds: Math.max(0, adults - 2), childrenDetails: details };
      const error = getRoomOccupancyValidationError(next);
      if (error) {
        setRoomError(`Room ${index + 1}: ${error}`);
        return room;
      }
      return next;
    });
  };

  const changeRoomCount = (delta: number) => {
    const min = mode === "group" ? MIN_GROUP_ROOMS : 1;
    const max = mode === "group" ? MAX_GROUP_ROOMS : MAX_REGULAR_ROOMS;
    const count = Math.min(max, Math.max(min, draftRooms.length + delta));
    if (count !== draftRooms.length) {
      setDraftRooms((previous) => fitRoomCount(previous, count, defaultRoomTemplate));
      setRoomError("");
    }
  };

  // The reference video uses total counters. Translate these into the existing
  // per-room DVI structure rather than replacing its occupancy/bed constraints.
  const adjustGuestTotal = (current: RoomRow[], field: "adults" | "children", delta: 1 | -1): RoomRow[] => {
    const indices = Array.from({ length: current.length }, (_, i) => i);
    if (delta < 0) indices.reverse();
    for (const index of indices) {
      const row = current[index];
      if (field === "adults" && delta < 0 && row.adults <= 1) continue;
      if (field === "children" && delta < 0 && row.children <= 0) continue;
      let candidate: RoomRow;
      if (field === "adults") {
        const nextAdults = row.adults + delta;
        candidate = { ...row, adults: nextAdults, extraBeds: Math.max(0, nextAdults - 2) };
      } else if (delta < 0) {
        const nextChildren = row.children - 1;
        const details = (row.childrenDetails || []).slice(0, nextChildren);
        candidate = { ...row, children: nextChildren, childrenDetails: details };
      } else {
        const currentDetails = (row.childrenDetails || []).slice(0, row.children);
        // A second child needs one bed under DVI's existing business rules.
        const trialBeds: Array<"With Bed" | "Without Bed"> =
          row.children > 0 ? ["With Bed", "Without Bed"] : ["Without Bed", "With Bed"];
        let matching: RoomRow | null = null;
        for (const bedType of trialBeds) {
          const trial = {
            ...row,
            children: row.children + 1,
            childrenDetails: [...currentDetails, { age: "" as const, bedType, hotelApprovalAccepted: false }],
          };
          if (!getRoomOccupancyValidationError(trial)) { matching = trial; break; }
        }
        if (!matching) continue;
        candidate = matching;
      }
      if (!getRoomOccupancyValidationError(candidate)) {
        return current.map((room, i) => i === index ? candidate : room);
      }
    }
    return current;
  };
  const draftAdults = draftRooms.reduce((total, room) => total + Number(room.adults || 0), 0);
  const draftChildren = draftRooms.reduce((total, room) => total + Number(room.children || 0), 0);
  const draftChildIndexes = draftRooms.flatMap((room, roomIndex) =>
    Array.from({ length: room.children }, (_, childIndex) => ({ roomIndex, childIndex, child: room.childrenDetails?.[childIndex] })),
  );
  const draftRoomIssue = draftRooms.map((room) => getRoomOccupancyValidationError(room)).find(Boolean);
  const draftRoomMin = mode === "group" ? MIN_GROUP_ROOMS : 1;
  const draftRoomMax = mode === "group" ? MAX_GROUP_ROOMS : MAX_REGULAR_ROOMS;
  const draftAgeMissing = draftChildIndexes.some(({ child }) =>
    !child || child.age === "" || Number(child.age) < 5 || Number(child.age) > 10,
  );
  const draftCanApply = draftRooms.length >= draftRoomMin && draftRooms.length <= draftRoomMax &&
    draftAdults + draftChildren <= 48 && !draftAgeMissing && !draftRoomIssue;
  const canAddAdult = draftAdults + draftChildren < 48 &&
    adjustGuestTotal(draftRooms, "adults", 1) !== draftRooms;
  const canRemoveAdult = adjustGuestTotal(draftRooms, "adults", -1) !== draftRooms;
  const canAddChild = draftAdults + draftChildren < 48 &&
    adjustGuestTotal(draftRooms, "children", 1) !== draftRooms;
  const canRemoveChild = adjustGuestTotal(draftRooms, "children", -1) !== draftRooms;
  const updateTotal = (field: "adults" | "children", delta: 1 | -1) => {
    setRoomError("");
    setDraftRooms((previous) => {
      const passengerCount = previous.reduce((count, room) => count + room.adults + room.children, 0);
      if (delta > 0 && passengerCount >= 48) return previous;
      return adjustGuestTotal(previous, field, delta);
    });
  };
  const setChildAge = (roomIndex: number, childIndex: number, age: number | "") => {
    setRoomError("");
    setDraftRooms((previous) => previous.map((room, index) => {
      if (index !== roomIndex) return room;
      return {
        ...room,
        childrenDetails: (room.childrenDetails || []).map((child, i) =>
          i === childIndex ? { ...child, age } : child,
        ),
      };
    }));
  };  const applyGuests = () => {
    const min = mode === "group" ? MIN_GROUP_ROOMS : 1;
    const max = mode === "group" ? MAX_GROUP_ROOMS : MAX_REGULAR_ROOMS;
    if (draftRooms.length < min || draftRooms.length > max) {
      setRoomError(`Select ${min}–${max} rooms.`);
      return;
    }
    for (let i = 0; i < draftRooms.length; i += 1) {
      const room = draftRooms[i];
      const error = getRoomOccupancyValidationError(room);
      if (error) {
        setRoomError(`Room ${i + 1}: ${error}`);
        return;
      }
      if ((room.childrenDetails || []).slice(0, room.children).some((child) =>
        child.age === "" || Number(child.age) < 5 || Number(child.age) > 10
      )) {
        setRoomError(`Enter a valid age (5–10) for every child in Room ${i + 1}.`);
        return;
      }
    }
    setRooms(fitRoomCount(draftRooms, draftRooms.length, defaultRoomTemplate));
    setGuestsOpen(false);
  };

  // DVI_PR1003_REVIEW_FIX_V1: use selected category meanings, not refreshed master-list identity.
  const starRatings = Array.from(new Set(selectedHotelCategoryIds.flatMap((id) => {
    const label = String(hotelCategoryOptions.find((item) => Number(item.value) === id)?.label || "").trim();
    const match = label.match(/\b([1-5])\s*(?:\*|★|stars?)/i);
    return match ? [Number(match[1])] : [];
  })));
  const searchCriteriaKey = JSON.stringify([
    selectedLocations, checkIn, checkOut, rooms, selectedHotelCategoryIds,
    starRatings, mealPlanCode,
  ]);
  const submittedSearchRef = useRef<{ requestId: number; criteria: string }>({ requestId: 0, criteria: "" });

  // DVI_TE_HOTEL_RESULTS_BELOW_SEARCH_V1: snapshots for the shared results table, without extra API calls.
  useEffect(() => {
    if (!onHotelResultsChange) return;
    // The search effect will first initialize the new request; do not show old hotels meanwhile.
    if (searchRequestId > 0 && submittedSearchRef.current.requestId !== searchRequestId) return;
    const city = selectedLocations[0] || "";
    const validRequest = searchRequestId > 0 &&
      submittedSearchRef.current.requestId === searchRequestId &&
      submittedSearchRef.current.criteria === searchCriteriaKey;
    const current = hotelsByCity[city];
    onHotelResultsChange(searchSectionId, {
      requestId: searchRequestId,
      city,
      checkIn,
      checkOut,
      roomCount: rooms.length,
      requestedMealPlanCode: String(mealPlanCode || "").trim().toUpperCase(),
      status: !city ? "error" : validRequest ? (current?.status ?? "waiting") : "stale",
      hotels: validRequest ? (current?.hotels ?? []) : [],
      error: !city ? "Choose a hotel location before searching." : validRequest ? current?.error : "Search settings changed. Click Search Hotels again to refresh results.",
    });
  }, [searchSectionId, onHotelResultsChange, searchRequestId, searchCriteriaKey, selectedLocations, checkIn, checkOut, hotelsByCity, mealPlanCode]);

  // Query each selected location independently. Keep supplier calls bounded to
  // two at once; changing locations or search criteria aborts stale requests.
  useEffect(() => {
    const controller = new AbortController();
    // Never request supplier availability until the user presses Search Hotels.
    if (!searchRequestId) {
      setHotelsByCity({});
      return () => controller.abort();
    }
    if (submittedSearchRef.current.requestId !== searchRequestId) {
      submittedSearchRef.current = { requestId: searchRequestId, criteria: searchCriteriaKey };
    } else if (submittedSearchRef.current.criteria !== searchCriteriaKey) {
      // Editing any field after a search cancels old work and hides stale results.
      setHotelsByCity({});
      return () => controller.abort();
    }
    const reset: Record<string, CityHotelState> = {};
    for (const city of selectedLocations) reset[city] = { status: "waiting", hotels: [] };
    setHotelsByCity(reset);
    if (!selectedLocations.length) return () => controller.abort();
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setHotelsByCity(Object.fromEntries(selectedLocations.map((city) => [city, {
        status: "error", hotels: [], error: "Select valid Check-In and Check-Out dates.",
      }])));
      return () => controller.abort();
    }

    const guestCount = adults + children;
    const childAges = rooms.flatMap((room) =>
      (room.childrenDetails || []).slice(0, room.children).map((child) => Number(child.age)),
    );
    const invalidRoom = rooms.map((room) => getRoomOccupancyValidationError(room)).find(Boolean);
    const searchError = guestCount < 1 || guestCount > 48
      ? "Hotel search supports at most 48 adults and children across rooms."
      : childAges.length !== children || childAges.some((age) => !Number.isInteger(age) || age < 5 || age > 10)
        ? "Enter valid ages for all children in Rooms & Guests."
        : invalidRoom;
    if (searchError) {
      setHotelsByCity(Object.fromEntries(selectedLocations.map((city) => [city, {
        status: "error", hotels: [], error: String(searchError),
      }])));
      return () => controller.abort();
    }

    const timer = setTimeout(() => {
      let index = 0;
      const searchOne = async (city: string) => {
        if (controller.signal.aborted) return;
        setHotelsByCity((previous) => ({ ...previous,
          [city]: { status: "loading", hotels: [] },
        }));
        try {
          const response = await ItineraryService.searchHotels({
            cityCode: city,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            roomCount: rooms.length,
            guestCount,
            adultCount: adults,
            childCount: children,
            infantCount: infants,
            childAges,
            guestNationality: "IN",
            preferences: {
              ...(starRatings.length ? { starRatings } : {}),
              ...(mealPlanCode ? { mealPlanCode } : {}),
            },
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          const raw = Array.isArray(response?.data?.hotels) ? response.data.hotels
            : Array.isArray(response?.hotels) ? response.hotels
              : Array.isArray(response?.data) ? response.data : [];
          // DVI_PR1003_REVIEW_FIX_V1: group hotel properties but preserve every supplier room/rate choice.
          const grouped = new Map<string, HotelPreview>();
          const rateKey = (option: Record<string, unknown>) => JSON.stringify([
            option.provider, option.rateOptionId, option.roomId, option.roomTypeId,
            option.rateId, option.roomType, option.roomName, option.roomTypes,
            option.mealPlan, option.bookingCode, option.searchReference,
            option.price, option.pricePerNight, option.totalStayPrice,
          ]);
          for (const item of raw) {
            if (!item || typeof item !== "object") continue;
            const candidate = item as Record<string, unknown>;
            const hotelName = String(candidate.hotelName ?? candidate.hotel_name ?? "").trim();
            if (!hotelName) continue;
            const canonicalId = Number(candidate.canonicalHotelId || 0);
            const code = String(candidate.hotelCode ?? candidate.providerHotelCode ?? "").trim();
            const provider = String(candidate.provider || "").trim().toLowerCase();
            const key = canonicalId > 0 ? `canonical:${canonicalId}` : `provider:${provider}:${code || hotelName.toLowerCase()}`;
            const existing = grouped.get(key);
            const providedRates = Array.isArray(candidate.rateOptions) && candidate.rateOptions.length > 0
              ? candidate.rateOptions : [candidate];
            const options = [...(existing?.rateOptions || [])];
            const optionKeys = new Set(options.map(rateKey));
            for (const rawOption of providedRates) {
              if (!rawOption || typeof rawOption !== "object" || Array.isArray(rawOption)) continue;
              const { rateOptions: unusedNestedRates, ...flatCandidate } = candidate;
              const option = { ...flatCandidate, ...(rawOption as Record<string, unknown>), hotelName };
              const id = rateKey(option);
              if (optionKeys.has(id)) continue;
              optionKeys.add(id);
              options.push(option);
            }
            grouped.set(key, { ...(existing || candidate), hotelName, rateOptions: options } as HotelPreview);
          }
          const unique = Array.from(grouped.values());
          setHotelsByCity((previous) => ({ ...previous,
            [city]: { status: "done", hotels: unique },
          }));
        } catch (error: unknown) {
          if (controller.signal.aborted) return;
          setHotelsByCity((previous) => ({ ...previous,
            [city]: { status: "error", hotels: [], error: error instanceof Error ? error.message : "Hotel search failed." },
          }));
        }
      };
      const worker = async () => {
        while (!controller.signal.aborted && index < selectedLocations.length) {
          const city = selectedLocations[index++];
          await searchOne(city);
        }
      };
      void Promise.all(Array.from({ length: Math.min(2, selectedLocations.length) }, () => worker()));
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchRequestId, searchCriteriaKey, selectedLocations, checkIn, checkOut, rooms, adults, children, infants, mealPlanCode]);

  return (
    <section aria-label="Travel Expert hotel search preferences" className="rounded-xl border border-[#e6d7f8] bg-white p-3 shadow-sm sm:p-4">
      {/* DVI_TE_HOTEL_CATEGORY_TOP_PILLS_V1: same selection control as Tours, Hotels only. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 font-medium text-[#443451]">
            <input type="radio" name="travel-expert-hotel-booking-mode" checked={mode === "regular"} onChange={() => selectMode("regular")} />
            Up to 8 Rooms
          </label>
          <label className="flex cursor-pointer items-center gap-2 font-medium text-[#443451]">
            <input type="radio" name="travel-expert-hotel-booking-mode" checked={mode === "group"} onChange={() => selectMode("group")} />
            Group 20 Rooms
          </label>
        </div>
        <div data-field="hotelCategory" className="w-full min-w-0 space-y-1 sm:w-[310px]">
          <TravelExpertToursHotelCategoryPills
            value={selectedHotelCategoryIds.map(String)}
            options={hotelCategoryOptions}
            onChange={(values) => setSelectedHotelCategoryIds(
              values.map(Number).filter((id) => Number.isInteger(id) && id > 0),
            )}
            maxSelected={4}
          />
          {validationErrors?.hotelCategory && (
            <p className="text-xs text-red-600">{validationErrors.hotelCategory}</p>
          )}
        </div>
      </div>

      {/* DVI_TE_HOTELS_JOINED_SEARCH_BAR_V1: display-only MMT-style joined five-section hotel bar */}
      <div className="relative grid grid-cols-1 rounded-xl border border-[#dbe0e8] bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(0,2.25fr)_minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(0,1.35fr)_minmax(0,1.35fr)]" data-dvi-te-hotel-hover="true">
        <div className="relative min-h-[108px] min-w-0 border-b border-[#e2e6ec] bg-[#eef6ff] px-4 py-3 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 sm:col-span-2 xl:col-span-1 xl:rounded-l-xl xl:border-b-0 xl:border-r" data-field="hotel-locations">
          <span className="block text-[11px] font-medium text-[#34445a]">City, Property Name or Location *</span>
          <div className="pointer-events-none absolute inset-x-4 top-[34px] z-[1] select-none" aria-hidden="true">
            <div className={`truncate text-[23px] font-extrabold leading-tight tracking-tight ${selectedLocations.length ? "text-[#101828]" : "text-[#64748b]"}`}>
              {selectedLocations[0] || "Select location"}
            </div>
            <div className="mt-1 truncate text-xs font-medium text-[#34445a]">
              {selectedLocations.length ? "1 location selected" : "Search cities or properties"}
            </div>
          </div>
          <div className="absolute inset-0 z-[2] [&>div]:h-full [&>div>button]:!h-full [&>div>button]:!rounded-none [&>div>button]:!border-0 [&>div>button]:!bg-transparent [&>div>button]:!px-4 [&>div>button>span]:!opacity-0 [&>div>button>svg]:!opacity-0">
            <AutoSuggestSelect
              mode="single"
              value={selectedLocations[0] || ""}
              options={locationOptions}
              onChange={(value) => onLocationsChange(value as string)}
              placeholder="Select a hotel location"
              noResultsMessage="Location is not available in DVI"
            />
          </div>
          {(validationErrors?.arrivalLocation || validationErrors?.departureLocation) && (
            <p role="alert" className="absolute bottom-0 left-3 right-3 z-[3] truncate text-[10px] font-semibold text-red-600">{validationErrors.arrivalLocation || validationErrors.departureLocation}</p>
          )}
        </div>
        <div className="min-h-[108px] min-w-0 border-b border-[#e2e6ec] px-4 py-3 sm:border-r xl:border-b-0">
          <div className="flex items-center gap-1 text-xs font-medium text-[#34445a]">Check-In * <ChevronDown className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" /></div>
          <TravelExpertHotelDateRangeInput
          side="checkin"
          checkInValue={checkIn}
          checkOutValue={checkOut}
          onChangeCheckIn={(event) => {
            const next = event.target.value;
            if (!next) {
              setTripStartDate("");
              setTripEndDate("");
              return;
            }
            if (next < earliestStart) return;
            setTripStartDate(toDviDate(next));
            if (!checkOut || checkOut <= next) setTripEndDate(toDviDate(nextIsoDate(next)));
          }}
          onChangeCheckOut={(event) => {
            const next = event.target.value;
            if (!next) {
              setTripEndDate("");
              return;
            }
            if (next < minCheckOut) return;
            if (!checkIn) setTripStartDate(toDviDate(earliestStart));
            setTripEndDate(toDviDate(next));
          }}
          searchBarStyle
          className="w-full"
          min={earliestStart}
        />
        </div>
        <div className="min-h-[108px] min-w-0 border-b border-[#e2e6ec] px-4 py-3 sm:border-r xl:border-b-0">
          <div className="flex items-center gap-1 text-xs font-medium text-[#34445a]">Check-Out * <ChevronDown className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" /></div>
          <TravelExpertHotelDateRangeInput
          side="checkout"
          checkInValue={checkIn}
          checkOutValue={checkOut}
          onChangeCheckIn={(event) => {
            const next = event.target.value;
            if (!next) {
              setTripStartDate("");
              setTripEndDate("");
              return;
            }
            if (next < earliestStart) return;
            setTripStartDate(toDviDate(next));
            if (!checkOut || checkOut <= next) setTripEndDate(toDviDate(nextIsoDate(next)));
          }}
          onChangeCheckOut={(event) => {
            const next = event.target.value;
            if (!next) {
              setTripEndDate("");
              return;
            }
            if (next < minCheckOut) return;
            if (!checkIn) setTripStartDate(toDviDate(earliestStart));
            setTripEndDate(toDviDate(next));
          }}
          searchBarStyle
          className="w-full"
          min={earliestStart}
        />
        </div>
                <div className="min-h-[108px] min-w-0 border-b border-[#e2e6ec] px-4 py-3 sm:border-r xl:border-b-0" data-field="te-hotel-rooms-guests">
          <div className="flex items-center gap-1 text-xs text-[#34445a] font-extrabold">Rooms & Guests * <ChevronDown className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" /></div>
          <div className="dvi-te-hotels-shared-tours-guests w-full min-w-0 [&_[data-field=te-tours-rooms-guests]]:!max-w-none [&_[data-field=te-tours-rooms-guests]>label]:!hidden [&_[data-field=te-tours-rooms-guests]>button]:!h-[58px] [&_[data-field=te-tours-rooms-guests]>button]:!border-0 [&_[data-field=te-tours-rooms-guests]>button]:!bg-transparent [&_[data-field=te-tours-rooms-guests]>button]:!px-0 [&_[data-field=te-tours-rooms-guests]>button]:!shadow-none">
            <TravelExpertToursRoomsGuests
              rooms={rooms}
              setRooms={setRooms}
              defaultRoomTemplate={defaultRoomTemplate}
             hotelJoinedBar />
          </div>
<div className="truncate text-xs font-medium text-[#536173]">{children || infants ? `${children} Children · ${infants} Infants` : "Add children or infants"}</div>
        </div>
        {/* Hotels now uses the exact Tours & Attractions Rooms & Guests modal. */}
        <div className="min-h-[108px] min-w-0 px-4 py-3 sm:col-span-2 xl:col-span-1" data-field="te-hotel-meal-plan">
          <div className="text-xs text-[#34445a] font-extrabold">Meal Plan</div>
          <Select value={mealPlanCode || undefined}
            onValueChange={(value) => setMealPlanCode(value === "__none__" ? "" : value)}>
            <SelectTrigger aria-label="Meal Plan"
              className="mt-1 !h-[68px] w-full min-w-0 !border-0 !bg-transparent !px-0 !py-1 !text-left !shadow-none focus-visible:!ring-2 focus-visible:!ring-inset focus-visible:!ring-blue-500 [&>span]:!line-clamp-none [&>span]:!overflow-visible [&>span]:!whitespace-normal">
              <SelectValue placeholder="Select Meal Plan">
  {mealPlanCode ? (
    <span className="flex min-w-0 max-w-full flex-col items-start gap-0.5 text-left">
      <strong className="text-[26px] font-extrabold leading-none text-[#111827]">{mealPlanCode}</strong>
      <span className="line-clamp-2 max-w-full break-words text-[11px] font-semibold leading-[14px] text-[#475569]">
        {(() => {
          const selected = mealPlanOptions.find((item) => item.code === mealPlanCode);
          if (!selected) return "";
          const full = getMealPlanLabel(selected);
          const prefix = mealPlanCode + " - ";
          return full.startsWith(prefix) ? full.slice(prefix.length) : full;
        })()}
      </span>
    </span>
  ) : <span className="text-sm font-semibold">Select Meal Plan</span>}
</SelectValue>
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="end"
              avoidCollisions={true}
              collisionPadding={{ top: 88, right: 12, bottom: 12, left: 12 }}
              className="z-[1900] w-[min(350px,calc(100vw-24px))] max-w-[calc(100vw-24px)] max-h-[min(280px,calc(100dvh-120px))] overflow-y-auto overscroll-contain rounded-lg border border-[#e5d7f6] bg-white shadow-xl"
            >
              {mealPlanOptions.map((item) => (
                <SelectItem key={item.code} value={item.code}>{getMealPlanLabel(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-[#f5f7ff] px-3 py-2 text-xs text-[#31436a]">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {tripStartDate || "Check-in"} → {tripEndDate || "Check-out"}</span>
        <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" /> {roomLabel(rooms.length)}</span>
        <span>{adults} Adults · {children} Children · {infants} Infants</span>
      </div>

      {searchRequestId > 0 && submittedSearchRef.current.requestId === searchRequestId &&
        submittedSearchRef.current.criteria === searchCriteriaKey && selectedLocations.length === 0 && (
        <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">Choose a hotel location before searching.</p>
      )}
      {searchRequestId > 0 &&
        submittedSearchRef.current.requestId === searchRequestId &&
        submittedSearchRef.current.criteria === searchCriteriaKey &&
        selectedLocations.length > 0 && (
        <div aria-live="polite" className={hideInlineHotelResults ? "hidden" : "mt-4 space-y-3"}>
          <h3 className="text-sm font-semibold text-[#32273f]">Hotels by selected location</h3>
          {selectedLocations.map((city) => {
            const result: CityHotelState = hotelsByCity[city] || { status: "waiting", hotels: [] };
            return (
              <div key={city} className="space-y-3 rounded-lg border border-[#e9dce9] bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold text-[#32273f]">Hotels in {city}</h4>
                  {result.status === "loading" && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#7358a0]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Searching DVI hotels...
                    </span>
                  )}
                  {result.status === "done" && (
                    <span className="text-xs text-[#7358a0]">{result.hotels.length} hotels found</span>
                  )}
                </div>
                {!checkIn || !checkOut || checkOut <= checkIn ? (
                  <p className="text-sm text-[#746c82]">Select valid Check-In and Check-Out dates to load hotels.</p>
                ) : result.status === "waiting" ? (
                  <p className="text-sm text-[#746c82]">Waiting to search this location...</p>
                ) : result.status === "error" ? (
                  <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{result.error || "Unable to load hotels."}</div>
                ) : result.status === "done" && result.hotels.length === 0 ? (
                  <p className="text-sm text-[#746c82]">No hotels returned for this city and search criteria. Try different dates or room counts.</p>
                ) : null}
                {result.hotels.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {result.hotels.slice(0, 30).map((hotel, i) => {
                      const nightPrice = Number(hotel.pricePerNight || 0);
                      const otherPrice = Number(hotel.price || 0);
                      const displayPrice = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
                      return (
                        <div key={`${city}-${hotel.hotelCode || hotel.hotelName}-${i}`} className="rounded-lg border border-[#e5d7f6] bg-[#fffaff] p-3">
                          <div className="font-medium text-[#36284a]">{hotel.hotelName}</div>
                          {hotel.address && <p className="mt-1 text-xs text-[#706681]">{hotel.address}</p>}
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#675879]">
                            {Number(hotel.rating || 0) > 0 && <span>Rating: {Number(hotel.rating).toFixed(1)}</span>}
                            {hotel.mealPlan && <span>Meal: {hotel.mealPlan}</span>}
                            {hotel.availabilityStatus && <span>{hotel.availabilityStatus.replace(/_/g, " ")}</span>}
                            {nightPrice > 0 ? <span className="font-semibold">{hotel.currency || "INR"} {displayPrice(nightPrice)} / night</span>
                              : otherPrice > 0 ? <span className="font-semibold">Rate: {hotel.currency || "INR"} {displayPrice(otherPrice)}</span>
                                : <span>Rate on request</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {result.hotels.length > 30 && <p className="text-xs text-[#736784]">Showing first 30 of {result.hotels.length} hotels.</p>}
              </div>
            );
          })}
          <p className="text-xs text-[#736784]">These are hotel search previews using the overall Check-In/Check-Out dates for each city. Set individual overnight dates and hotel selections in DVI Route Details / Hotel List after creating the itinerary. No hotels are booked here.</p>
          <p className="text-[11px] text-[#7e7289]">Supplier searches currently use guest nationality IN. Confirm guest nationality before booking.</p>
        </div>
      )}


    </section>
  );
}