import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { BedDouble, CalendarDays, Check, ChevronDown, Loader2, Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  availabilityStatus?: string;
};

type Props = {
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
}: Props) {
  const [mode, setMode] = useState<HotelMode>(() => rooms.length > MAX_REGULAR_ROOMS ? "group" : "regular");
  // Multi-location hotel preview; first/last city still map to DVI Arrival/Departure.
  // Intermediate locations are previews only until placed into itinerary Route Details.
  const [selectedLocations, setSelectedLocations] = useState<string[]>(() =>
    Array.from(new Set([arrivalLocation, departureLocation].map((city) => city.trim()).filter(Boolean))),
  );
  useEffect(() => {
    const endpoints = [arrivalLocation, departureLocation].map((city) => city.trim()).filter(Boolean);
    setSelectedLocations((previous) => {
      if (!endpoints.length) return previous.length ? [] : previous;
      if (previous.length > 0 &&
        previous[0] === endpoints[0] &&
        previous[previous.length - 1] === endpoints[endpoints.length - 1]) return previous;
      return Array.from(new Set(endpoints));
    });
  }, [arrivalLocation, departureLocation]);

  const onLocationsChange = (values: string[]) => {
    const next = Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
    setSelectedLocations(next);
    setArrivalLocation(next[0] || "");
    setDepartureLocation(next.length ? next[next.length - 1] : "");
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

  // Query each selected location independently. Keep supplier calls bounded to
  // two at once; changing locations or search criteria aborts stale requests.
  useEffect(() => {
    const controller = new AbortController();
    const reset: Record<string, CityHotelState> = {};
    for (const city of selectedLocations) reset[city] = { status: "waiting", hotels: [] };
    setHotelsByCity(reset);
    if (!selectedLocations.length) return () => controller.abort();
    if (!checkIn || !checkOut || checkOut <= checkIn) return () => controller.abort();

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

    const starRatings = selectedHotelCategoryIds.flatMap((id) => {
      const label = hotelCategoryOptions.find((item) => Number(item.value) === id)?.label || "";
      const match = label.match(/([1-5])\s*(?:star|★)/i);
      return match ? [Number(match[1])] : [];
    });

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
          const seen = new Set<string>();
          const unique: HotelPreview[] = [];
          for (const item of raw) {
            if (!item || typeof item !== "object") continue;
            const candidate = item as Record<string, unknown>;
            const hotelName = String(candidate.hotelName ?? candidate.hotel_name ?? "").trim();
            if (!hotelName) continue;
            const key = String(candidate.canonicalHotelId ?? candidate.hotelCode ??
              `${candidate.provider || ""}:${hotelName}`).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push({ ...candidate, hotelName } as HotelPreview);
          }
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
  }, [selectedLocations, checkIn, checkOut, rooms, adults, children, infants, selectedHotelCategoryIds, hotelCategoryOptions, mealPlanCode]);

  return (
    <section aria-label="Travel Expert hotel search preferences" className="rounded-xl border border-[#e6d7f8] bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2 font-medium text-[#443451]">
          <input type="radio" name="travel-expert-hotel-booking-mode" checked={mode === "regular"} onChange={() => selectMode("regular")} />
          Up to 8 Rooms
        </label>
        <label className="flex cursor-pointer items-center gap-2 font-medium text-[#443451]">
          <input type="radio" name="travel-expert-hotel-booking-mode" checked={mode === "group"} onChange={() => selectMode("group")} />
          Group 20 Rooms
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#e9dce9] bg-[#fefcff] p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1.7fr)_minmax(0,1.8fr)_minmax(0,1.6fr)]">
        <div className="min-w-0 space-y-1 sm:col-span-2 xl:col-span-1" data-field="hotel-locations">
          <label className="text-xs font-semibold text-[#554a66]">Location *</label>
          <AutoSuggestSelect
            mode="multi"
            value={selectedLocations}
            options={locationOptions}
            onChange={(value) => onLocationsChange(value as string[])}
            placeholder="Select locations to view hotels in each"
            maxSelected={20}
            showSelectedChipsInTrigger
            noResultsMessage="Location is not available in DVI"
          />
          {(validationErrors?.arrivalLocation || validationErrors?.departureLocation) && (
            <p className="text-xs text-red-600">{validationErrors.arrivalLocation || validationErrors.departureLocation}</p>
          )}
        </div>
        <div className="min-w-0 space-y-1 xl:col-span-1">
          <label htmlFor="te-hotel-check-in" className="text-xs font-semibold text-[#554a66]">Check-In *</label>
          <TravelExpertHotelDateRangeInput
          side="checkin"
          checkInValue={checkIn}
          checkOutValue={checkOut}
          onChangeCheckIn={(event) => {
            const next = event.target.value;
            if (!next || next < earliestStart) return;
            setTripStartDate(toDviDate(next));
            if (!checkOut || checkOut <= next) setTripEndDate(toDviDate(nextIsoDate(next)));
          }}
          onChangeCheckOut={(event) => {
            const next = event.target.value;
            if (!next || next < minCheckOut) return;
            if (!checkIn) setTripStartDate(toDviDate(earliestStart));
            setTripEndDate(toDviDate(next));
          }}
          className="h-10 w-full min-w-0 rounded-md border border-[#e5d7f6] bg-white px-2 text-sm"
          min={earliestStart}
        />
        </div>
        <div className="min-w-0 space-y-1 xl:col-span-1">
          <label htmlFor="te-hotel-check-out" className="text-xs font-semibold text-[#554a66]">Check-Out *</label>
          <TravelExpertHotelDateRangeInput
          side="checkout"
          checkInValue={checkIn}
          checkOutValue={checkOut}
          onChangeCheckIn={(event) => {
            const next = event.target.value;
            if (!next || next < earliestStart) return;
            setTripStartDate(toDviDate(next));
            if (!checkOut || checkOut <= next) setTripEndDate(toDviDate(nextIsoDate(next)));
          }}
          onChangeCheckOut={(event) => {
            const next = event.target.value;
            if (!next || next < minCheckOut) return;
            if (!checkIn) setTripStartDate(toDviDate(earliestStart));
            setTripEndDate(toDviDate(next));
          }}
          className="h-10 w-full min-w-0 rounded-md border border-[#e5d7f6] bg-white px-2 text-sm"
          min={minCheckOut}
        />
        </div>
        <div className="min-w-0 space-y-1 sm:col-span-2 xl:col-span-1">
          <label className="text-xs font-semibold text-[#554a66]">Rooms & Guests *</label>
          <Button type="button" variant="outline" aria-expanded={isGuestsOpen} aria-controls="te-room-guests-panel" onClick={() => { if (isGuestsOpen) { setGuestsOpen(false); setRoomError(""); } else openGuests(); }} className="h-10 w-full justify-between border-[#e5d7f6] bg-white px-2 text-left font-normal">
                <span className="flex min-w-0 items-center gap-1 truncate text-xs sm:text-sm"><Users className="h-4 w-4 shrink-0" />{roomLabel(rooms.length)}, {adults} Adults{children ? `, ${children} Children` : ""}{infants ? `, ${infants} Infants` : ""}</span>
                <ChevronDown className="ml-1 h-4 w-4 shrink-0" />
              </Button>
        </div>
        {isGuestsOpen && (
          <div className="relative col-span-full h-0 min-w-0">
            <div id="te-room-guests-panel" role="region" aria-label="Rooms and guests selection" onKeyDown={(event) => { if (event.key === "Escape") { setGuestsOpen(false); setRoomError(""); } }} className="absolute right-0 top-0 z-50 flex max-h-[min(68vh,540px)] w-full max-w-[600px] flex-col gap-0 overflow-hidden rounded-xl border border-[#e4ddec] bg-white shadow-lg">
            <div className="border-b border-[#eae4f0] px-5 py-4 text-left">
              <h3 className="text-base font-semibold text-[#302940]">Rooms & Guests</h3>
              <p className="mt-1 text-xs text-[#84758f]">{mode === "group" ? "Group 20 Rooms (9–20)" : "Up to 8 Rooms (1–8)"} · DVI room validation applies.</p>
            </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              {([
                { key: "rooms", title: "Room", detail: "", count: draftRooms.length, minDisabled: draftRooms.length <= draftRoomMin, maxDisabled: draftRooms.length >= draftRoomMax },
                { key: "adults", title: "Adults", detail: "1–3 per room", count: draftAdults, minDisabled: !canRemoveAdult, maxDisabled: !canAddAdult },
                { key: "children", title: "Children", detail: "5–10 years in DVI", count: draftChildren, minDisabled: !canRemoveChild, maxDisabled: !canAddChild },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#352d43]">{item.title}</div>
                    {item.detail && <p className="text-xs text-[#857d8e]">{item.detail}</p>}
                  </div>
                  <div className="flex items-center gap-1 rounded-md border border-[#ddd7e7] px-1 py-0.5">
                    <button type="button" aria-label={`Decrease ${item.title.toLowerCase()}`} disabled={item.minDisabled} onClick={() => item.key === "rooms" ? changeRoomCount(-1) : updateTotal(item.key, -1)} className="flex h-8 w-8 items-center justify-center rounded text-[#4f4460] hover:bg-[#f7f3fc] disabled:cursor-not-allowed disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                    <span className="min-w-6 text-center text-sm font-semibold tabular-nums">{item.count}</span>
                    <button type="button" aria-label={`Increase ${item.title.toLowerCase()}`} disabled={item.maxDisabled} onClick={() => item.key === "rooms" ? changeRoomCount(1) : updateTotal(item.key, 1)} className="flex h-8 w-8 items-center justify-center rounded text-[#4f4460] hover:bg-[#f7f3fc] disabled:cursor-not-allowed disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            {draftChildren > 0 && (
              <div className="space-y-3 border-t border-[#e7e2eb] pt-3">
                <p className="text-xs text-[#756a7e]">Please provide the right age for every child to see valid hotel availability.</p>
                <div className="text-sm font-semibold text-[#382c48]">Age of Children</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {draftChildIndexes.map(({ roomIndex, childIndex, child }, index) => (
                    <label key={`${roomIndex}-${childIndex}`} className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span>Child {index + 1}</span>
                      <select aria-label={`Age of child ${index + 1}`} value={child?.age ?? ""} onChange={(event) => setChildAge(roomIndex, childIndex, event.target.value === "" ? "" : Number(event.target.value))} className="h-9 min-w-[110px] rounded-md border border-[#dfd7e9] bg-white px-2 font-normal">
                        <option value="">Select</option>
                        {Array.from({ length: 6 }, (_, i) => <option key={i} value={i + 5}>{i + 5}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-[#84798d]">Ages 0–4 belong in the infant category; the current DVI child-occupancy flow accepts ages 5–10. Older guests must use an eligible adult allocation.</p>
              </div>
            )}
            <details className="rounded-lg border border-[#e8e1f0]">
              <summary className="cursor-pointer select-none px-3 py-3 text-sm font-medium text-[#514061]">Customize individual rooms, infants & child beds</summary>
              <div className="max-h-[38vh] space-y-3 overflow-y-auto border-t p-3">
                {draftRooms.map((room, index) => (
                  <div key={index} className="space-y-3 rounded-lg border border-[#e9dce9] p-3">
                    <h4 className="text-sm font-semibold">Room {index + 1}</h4>
                    {([ ["adults", "Adults", "12+ years"], ["children", "Children", "5–10 years"], ["infants", "Infants", "Under 5 years"] ] as const).map(([field, label, detail]) => (
                      <div key={field} className="flex items-center justify-between gap-3">
                        <div><div className="text-xs font-medium">{label}</div><div className="text-[11px] text-[#777083]">{detail}</div></div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="icon" disabled={room[field] <= (field === "adults" ? 1 : 0)} onClick={() => changeCounts(index, field, -1)} aria-label={`Remove ${label.toLowerCase()} from room ${index + 1}`}><Minus className="h-4 w-4" /></Button>
                          <span className="w-5 text-center text-sm font-semibold">{room[field]}</span>
                          <Button type="button" variant="outline" size="icon" onClick={() => changeCounts(index, field, 1)} aria-label={`Add ${label.toLowerCase()} to room ${index + 1}`}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {room.childrenDetails.slice(0, room.children).map((child, childIndex) => (
                      <div key={childIndex} className="flex items-center justify-between gap-2 rounded-md bg-[#faf8ff] p-2">
                        <span className="text-xs">Child {childIndex + 1} · {child.age === "" ? "Age not selected" : `${child.age} years`}</span>
                        <label className="flex items-center gap-2 text-xs">Bed type
                          <select aria-label={`Room ${index + 1} child ${childIndex + 1} bed type`} value={child.bedType} onChange={(event) => editDraft(index, (current) => {
                            const next = { ...current, childrenDetails: current.childrenDetails.map((item, i) => i === childIndex ? { ...item, bedType: event.target.value as "With Bed" | "Without Bed", hotelApprovalAccepted: false } : item) };
                            const error = getRoomOccupancyValidationError(next);
                            if (error) { setRoomError(`Room ${index + 1}: ${error}`); return current; }
                            setRoomError(""); return next;
                          })} className="h-8 rounded-md border border-[#e5d7f6] bg-white px-2">
                            <option value="Without Bed">Without Bed</option>
                            <option value="With Bed">With Bed</option>
                          </select>
                        </label>
                      </div>
                    ))}
                    <p className="text-[11px] text-[#736784]">Extra adult beds: {room.extraBeds}. Existing DVI child-bed validations apply.</p>
                  </div>
                ))}
              </div>
            </details>
            {draftAgeMissing && <p className="text-xs text-amber-700">Select every child's age to enable Apply.</p>}
            {draftRoomIssue && <p role="alert" className="text-xs text-red-700">{draftRoomIssue}</p>}
            {draftAdults + draftChildren > 48 && <p role="alert" className="text-xs text-red-700">DVI search supports at most 48 adults and children.</p>}
            {roomError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{roomError}</p>}
          </div>
          <div className="flex justify-end gap-3 border-t border-[#ece4f0] bg-[#fcfbfe] px-5 py-4">
            <Button type="button" variant="outline" onClick={() => setGuestsOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!draftCanApply} onClick={applyGuests} className="min-w-28 rounded-full bg-[#2685ee] text-white hover:bg-[#1976d2] disabled:bg-[#c7c7c7] disabled:text-white"><Check className="mr-2 h-4 w-4" />Apply</Button>
          </div>
            </div>
          </div>
        )}
        <div className="min-w-0 space-y-1 sm:col-span-2 xl:col-span-1" data-field="hotelCategory">
          <label className="text-xs font-semibold text-[#554a66]">Hotel Category *</label>
          <AutoSuggestSelect
            mode="multi"
            value={selectedHotelCategoryIds.map(String)}
            options={hotelCategoryOptions}
            onChange={(value) => setSelectedHotelCategoryIds(
              (value as string[]).map(Number).filter((id) => Number.isInteger(id) && id > 0),
            )}
            placeholder="Choose hotel categories"
            maxSelected={4}
            showSelectedChipsInTrigger
          />
          {validationErrors?.hotelCategory && <p className="text-xs text-red-600">{validationErrors.hotelCategory}</p>}
        </div>
        <div className="min-w-0 space-y-1 sm:col-span-2 xl:col-span-1">
          <label htmlFor="te-hotel-meal" className="text-xs font-semibold text-[#554a66]">Meal Plan</label>
          <select id="te-hotel-meal" value={mealPlanCode || ""} onChange={(event) => setMealPlanCode(event.target.value)} className="h-10 w-full min-w-0 rounded-md border border-[#e5d7f6] bg-white px-2 text-sm text-[#443451]">
            <option value="">Select Meal Plan</option>
            {mealPlanOptions.map((item) => <option key={item.code} value={item.code}>{getMealPlanLabel(item)}</option>)}
          </select>
        </div>
      </div>

      <p className="mt-2 text-xs text-[#736784]">
        Choose multiple locations to preview hotels in each selected city. The first selection maps to Arrival and the last to Departure.
        Intermediate cities must be added to DVI Route Details before saving; these previews do not assign or book hotels.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-[#f5f7ff] px-3 py-2 text-xs text-[#31436a]">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {tripStartDate || "Check-in"} → {tripEndDate || "Check-out"}</span>
        <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" /> {roomLabel(rooms.length)}</span>
        <span>{adults} Adults · {children} Children · {infants} Infants</span>
      </div>

      {selectedLocations.length > 0 && (
        <div aria-live="polite" className="mt-4 space-y-3">
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