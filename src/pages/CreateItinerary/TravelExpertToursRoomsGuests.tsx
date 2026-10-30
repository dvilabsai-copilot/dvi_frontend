import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cloneRoomFromTemplate,
  getRoomOccupancyValidationError,
  type RoomRow,
  type RoomTemplate,
} from "./helpers/useRoomsAndTravellers";

type Props = {
  rooms: RoomRow[];
  setRooms: Dispatch<SetStateAction<RoomRow[]>>;
  defaultRoomTemplate: RoomTemplate;
};

type RoomMode = "regular" | "group";
type GuestType = "adults" | "children" | "infants";

const MAX_REGULAR_ROOMS = 8;
const MIN_GROUP_ROOMS = 9;
const MAX_GROUP_ROOMS = 20;
const MAX_PAID_GUESTS = 48;

const copyRooms = (rooms: RoomRow[]): RoomRow[] =>
  rooms.map((room) => ({
    ...room,
    childrenDetails: (room.childrenDetails || []).map((child) => ({ ...child })),
  }));

const fitRooms = (source: RoomRow[], count: number, template: RoomTemplate): RoomRow[] => {
  const next = copyRooms(source).slice(0, count);
  while (next.length < count) {
    next.push(cloneRoomFromTemplate(template, next.length + 1, count));
  }
  return next.map((room, index) => ({ ...room, id: index + 1, roomCount: count }));
};

const roomCountLabel = (value: number) => `${value} Room${value === 1 ? "" : "s"}`;
const total = (rooms: RoomRow[], field: GuestType) =>
  rooms.reduce((sum, room) => sum + Number(room[field] || 0), 0);
const paidTotal = (rooms: RoomRow[]) => total(rooms, "adults") + total(rooms, "children");

const ensureChildren = (room: RoomRow) =>
  Array.from({ length: room.children }, (_, index) => ({
    age: room.childrenDetails?.[index]?.age ?? ("" as const),
    bedType: room.childrenDetails?.[index]?.bedType ?? ("Without Bed" as const),
    hotelApprovalAccepted: room.childrenDetails?.[index]?.hotelApprovalAccepted ?? false,
  }));

/**
 * Tours-only Rooms & Guests control. It shares DVI's existing rooms array and
 * occupancy validation; changes are committed only when Apply is clicked.
 * The Hotels component remains completely untouched.
 */
export function TravelExpertToursRoomsGuests({ rooms, setRooms, defaultRoomTemplate }: Props) {
  const [open, setOpen] = useState(false);
  const [draftRooms, setDraftRooms] = useState<RoomRow[]>([]);
  const [mode, setMode] = useState<RoomMode>("regular");
  const [error, setError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const adults = total(rooms, "adults");
  const children = total(rooms, "children");
  const infants = total(rooms, "infants");
  const draftAdults = total(draftRooms, "adults");
  const draftChildren = total(draftRooms, "children");
  const draftInfants = total(draftRooms, "infants");
  const minRooms = mode === "group" ? MIN_GROUP_ROOMS : 1;
  const maxRooms = mode === "group" ? MAX_GROUP_ROOMS : MAX_REGULAR_ROOMS;

  const draftChildrenList = draftRooms.flatMap((room, roomIndex) =>
    Array.from({ length: room.children }, (_, childIndex) => ({
      roomIndex,
      childIndex,
      child: room.childrenDetails?.[childIndex],
    })),
  );
  const missingChildAge = draftChildrenList.some(({ child }) =>
    !child || child.age === "" || !Number.isInteger(Number(child.age)) ||
    Number(child.age) < 5 || Number(child.age) > 11,
  );
  const invalidRoom = draftRooms.map((room) => getRoomOccupancyValidationError(room)).find(Boolean);
  const canApply = draftRooms.length >= minRooms && draftRooms.length <= maxRooms &&
    paidTotal(draftRooms) <= MAX_PAID_GUESTS && !missingChildAge && !invalidRoom;

  const openGuests = () => {
    const nextMode: RoomMode = rooms.length > MAX_REGULAR_ROOMS ? "group" : "regular";
    const min = nextMode === "group" ? MIN_GROUP_ROOMS : 1;
    const max = nextMode === "group" ? MAX_GROUP_ROOMS : MAX_REGULAR_ROOMS;
    setMode(nextMode);
    setDraftRooms(fitRooms(rooms, Math.min(max, Math.max(min, rooms.length)), defaultRoomTemplate));
    setError("");
    setOpen(true);
  };

  const closeGuests = () => {
    setOpen(false);
    setError("");
  };

  // Unlike the earlier Age/Bed overlay, all controls here are native elements,
  // so interacting with age/bed selects cannot trigger a portal outside-click.
  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target) && !document.getElementById("te-tours-rooms-guests-panel")?.contains(event.target)) {
        closeGuests();
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGuests();
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const changeMode = (nextMode: RoomMode) => {
    if (nextMode === mode) return;
    const target = nextMode === "group"
      ? MAX_GROUP_ROOMS
      : Math.min(MAX_REGULAR_ROOMS, Math.max(1, draftRooms.length));
    const proposed = fitRooms(draftRooms, target, defaultRoomTemplate);
    if (paidTotal(proposed) > MAX_PAID_GUESTS) {
      setError(`Maximum ${MAX_PAID_GUESTS} adults and older children allowed.`);
      return;
    }
    setMode(nextMode);
    setDraftRooms(proposed);
    setError("");
  };

  const changeRoomCount = (delta: -1 | 1) => {
    const target = Math.min(maxRooms, Math.max(minRooms, draftRooms.length + delta));
    if (target === draftRooms.length) return;
    const proposed = fitRooms(draftRooms, target, defaultRoomTemplate);
    if (paidTotal(proposed) > MAX_PAID_GUESTS) {
      setError(`Maximum ${MAX_PAID_GUESTS} adults and older children allowed.`);
      return;
    }
    setDraftRooms(proposed);
    setError("");
  };

  const changeOneRoom = (index: number, update: (room: RoomRow) => RoomRow) => {
    const originalRoom = draftRooms[index];
    if (!originalRoom) return false;
    const proposedRoom = update(originalRoom);
    const proposed = draftRooms.map((room, i) => i === index ? proposedRoom : room);
    const issue = getRoomOccupancyValidationError(proposedRoom);
    if (issue) {
      setError(`Room ${index + 1}: ${issue}`);
      return false;
    }
    if (paidTotal(proposed) > MAX_PAID_GUESTS) {
      setError(`Maximum ${MAX_PAID_GUESTS} adults and older children allowed.`);
      return false;
    }
    setDraftRooms(proposed);
    setError("");
    return true;
  };

  const nextRoom = (room: RoomRow, field: GuestType, delta: -1 | 1): RoomRow => {
    const currentCount = room[field];
    const value = currentCount + delta;
    if (value < (field === "adults" ? 1 : 0)) return room;
    if (field === "adults") {
      return { ...room, adults: value, extraBeds: Math.max(0, value - 2) };
    }
    if (field === "infants") return { ...room, infants: value };
    if (delta < 0) {
      const details = ensureChildren(room).slice(0, value);
      // If the last retained two children have no bed, try giving one a bed.
      if (value >= 2 && !details.some((item) => item.bedType === "With Bed")) {
        details[0] = { ...details[0], bedType: "With Bed", hotelApprovalAccepted: false };
      }
      return { ...room, children: value, childrenDetails: details };
    }
    const base = ensureChildren(room);
    // The second older child requires a bed under existing DVI rules.
    const preferredBeds: Array<"Without Bed" | "With Bed"> =
      room.children > 0 ? ["With Bed", "Without Bed"] : ["Without Bed", "With Bed"];
    for (const bedType of preferredBeds) {
      const candidate = {
        ...room,
        children: value,
        childrenDetails: [...base, { age: "" as const, bedType, hotelApprovalAccepted: false }],
      };
      if (!getRoomOccupancyValidationError(candidate)) return candidate;
    }
    return room;
  };

  const changeTotal = (field: GuestType, delta: -1 | 1) => {
    const indices = draftRooms.map((_, index) => index);
    if (delta < 0) indices.reverse();
    for (const index of indices) {
      const currentRoom = draftRooms[index];
      const candidate = nextRoom(currentRoom, field, delta);
      if (candidate === currentRoom) continue;
      const proposed = draftRooms.map((room, i) => i === index ? candidate : room);
      if (!getRoomOccupancyValidationError(candidate) && paidTotal(proposed) <= MAX_PAID_GUESTS) {
        setDraftRooms(proposed);
        setError("");
        return;
      }
    }
    setError(`Cannot ${delta > 0 ? "add" : "remove"} this guest. Check room limits and child beds.`);
  };

  const changeChildAge = (roomIndex: number, childIndex: number, age: number | "") => {
    const room = draftRooms[roomIndex];
    if (!room) return;
    const details = ensureChildren(room);
    if (!details[childIndex]) return;
    details[childIndex] = { ...details[childIndex], age };
    setDraftRooms(draftRooms.map((item, i) => i === roomIndex ? { ...item, childrenDetails: details } : item));
    setError("");
  };

  const changeChildBed = (roomIndex: number, childIndex: number, bedType: "With Bed" | "Without Bed") => {
    changeOneRoom(roomIndex, (room) => {
      const details = ensureChildren(room);
      if (!details[childIndex]) return room;
      details[childIndex] = { ...details[childIndex], bedType, hotelApprovalAccepted: false };
      return { ...room, childrenDetails: details };
    });
  };

  const applyGuests = () => {
    if (!canApply) {
      setError(missingChildAge ? "Choose an age from 5 to 11 for every older child." :
        invalidRoom || `Please select ${minRooms}-${maxRooms} rooms and valid guest counts.`);
      return;
    }
    setRooms(fitRooms(draftRooms, draftRooms.length, defaultRoomTemplate));
    closeGuests();
  };

  return (
    <div className="relative w-full max-w-sm" ref={wrapperRef} data-field="te-tours-rooms-guests">
      <label className="mb-1 block text-sm font-semibold text-slate-900">Rooms &amp; Guests <span className="text-red-500">*</span></label>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="te-tours-rooms-guests-panel"
        onClick={() => open ? closeGuests() : openGuests()}
        className="h-9 w-full min-w-0 justify-between border-[#e5d7f6] bg-white px-3 text-left font-normal"
      >
        <span className="flex min-w-0 items-center gap-1 truncate text-xs sm:text-sm">
          <Users className="h-4 w-4 shrink-0" />
          {roomCountLabel(rooms.length)}, {adults} Adults{children > 0 ? `, ${children} Children` : ""}{infants > 0 ? `, ${infants} Infants` : ""}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>

      {open && createPortal(
        <>
          {/* Tours-only full-viewport backdrop; clicking it closes without saving. */}
          <div
            className="fixed inset-0 z-[9998] bg-slate-950/50"
            aria-hidden="true"
            onPointerDown={closeGuests}
          />
          <div
            id="te-tours-rooms-guests-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Tours rooms and guests"
            className="fixed left-1/2 top-1/2 z-[9999] flex h-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[#e4ddec] bg-white shadow-2xl sm:max-h-[min(90dvh,760px)]"
          >
          <div className="border-b border-[#eae4f0] px-4 py-3">
            <h3 className="text-base font-semibold text-[#302940]">Rooms &amp; Guests</h3>
            <p className="mt-1 text-xs text-[#84758f]">Same room rules as Hotels. Changes apply only when you press Apply.</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" name="te-tours-room-mode" checked={mode === "regular"} onChange={() => changeMode("regular")} />
                Up to 8 Rooms
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" name="te-tours-room-mode" checked={mode === "group"} onChange={() => changeMode("group")} />
                Group 20 Rooms
              </label>
            </div>
          </div>

          {/* DVI_TE_TOURS_FIXED_COUNTERS_SCROLL_AGES_V1 */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-4 border-b border-[#e7e2eb] px-4 py-3">
            {([
              { field: "rooms", label: "Room", detail: "", count: draftRooms.length },
              { field: "adults", label: "Adults", detail: "1-3 per room", count: draftAdults },
              { field: "children", label: "Children (Age 5-11)", detail: "Age required", count: draftChildren },
              { field: "infants", label: "Children (Age 0-5)", detail: "Infant allocation", count: draftInfants },
            ] as const).map((item) => (
              <div key={item.field} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#352d43]">{item.label}</p>
                  {item.detail && <p className="text-xs text-[#857d8e]">{item.detail}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-md border border-[#ddd7e7] p-0.5">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.label}`}
                    disabled={item.field === "rooms" ? draftRooms.length <= minRooms : item.field === "adults" ? draftAdults <= draftRooms.length : item.count <= 0}
                    onClick={() => item.field === "rooms" ? changeRoomCount(-1) : changeTotal(item.field, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f7f3fc] disabled:cursor-not-allowed disabled:opacity-30"
                  ><Minus className="h-4 w-4" /></button>
                  <span className="min-w-7 text-center text-sm font-semibold tabular-nums">{item.count}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${item.label}`}
                    disabled={item.field === "rooms" ? draftRooms.length >= maxRooms : (item.field !== "infants" && paidTotal(draftRooms) >= MAX_PAID_GUESTS)}
                    onClick={() => item.field === "rooms" ? changeRoomCount(1) : changeTotal(item.field, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f7f3fc] disabled:cursor-not-allowed disabled:opacity-30"
                  ><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            </div>

            {/* Only the lower child age / bed details and customization scroll. */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
            {draftChildren > 0 && (
              <div className="space-y-3 border-t border-[#e7e2eb] pt-3">
                <h4 className="text-sm font-semibold">Age of Children</h4>
                {/* DVI_TE_TOURS_CHILD_INLINE_BED_V1: Age and Bed are edited together. */}
                <div className="grid grid-cols-1 gap-2">
                  {draftChildrenList.map(({ roomIndex, childIndex, child }, index) => (
                    <div
                      key={`${roomIndex}-${childIndex}`}
                      className="grid grid-cols-[minmax(0,1fr)_88px_132px] items-center gap-2 rounded-md bg-[#faf8ff] p-2 text-xs"
                    >
                      <span className="min-w-0 font-medium text-slate-800">
                        Child {index + 1}{draftRooms.length > 1 ? ` (Room ${roomIndex + 1})` : ""}
                      </span>
                      <select
                        aria-label={`Age of child ${index + 1}`}
                        value={child?.age ?? ""}
                        onChange={(event) => changeChildAge(
                          roomIndex,
                          childIndex,
                          event.target.value === "" ? "" : Number(event.target.value),
                        )}
                        className="h-9 w-full min-w-0 rounded-md border border-[#e5d7f6] bg-white px-2 text-xs text-slate-900"
                      >
                        <option value="">Age</option>
                        {Array.from({ length: 7 }, (_, age) => (
                          <option key={age + 5} value={age + 5}>{age + 5}</option>
                        ))}
                      </select>
                      <select
                        aria-label={`Bed option for child ${index + 1} in room ${roomIndex + 1}`}
                        value={child?.bedType === "With Bed" ? "With Bed" : "Without Bed"}
                        onChange={(event) => changeChildBed(
                          roomIndex,
                          childIndex,
                          event.target.value as "With Bed" | "Without Bed",
                        )}
                        className="h-9 w-full min-w-0 rounded-md border border-[#e5d7f6] bg-white px-2 text-xs text-slate-900"
                      >
                        <option value="Without Bed">Without Bed</option>
                        <option value="With Bed">With Bed</option>
                      </select>
                    </div>
                  ))}
                </div>
                {missingChildAge && <p className="text-xs text-amber-700">Select an age for each older child before Apply.</p>}
              </div>
            )}

            <details className="rounded-lg border border-[#e8e1f0]">
              <summary className="cursor-pointer select-none px-3 py-3 text-sm font-medium text-[#514061]">Customize individual rooms, infants &amp; child beds</summary>
              <div className="space-y-3 border-t p-3">
                {draftRooms.map((room, roomIndex) => (
                  <div key={room.id} className="space-y-3 rounded-lg border border-[#e9dce9] p-3">
                    <h5 className="text-sm font-semibold">Room {roomIndex + 1}</h5>
                    {([
                      ["adults", "Adults"], ["children", "Children (Age 5-11)"], ["infants", "Children (Age 0-5)"],
                    ] as const).map(([field, label]) => (
                      <div key={field} className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{label}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button size="icon" type="button" variant="outline" aria-label={`Remove ${label} from room ${roomIndex + 1}`} disabled={room[field] <= (field === "adults" ? 1 : 0)} onClick={() => changeOneRoom(roomIndex, (current) => nextRoom(current, field, -1))}><Minus className="h-4 w-4" /></Button>
                          <span className="min-w-6 text-center text-sm font-semibold">{room[field]}</span>
                          <Button size="icon" type="button" variant="outline" aria-label={`Add ${label} to room ${roomIndex + 1}`} onClick={() => changeOneRoom(roomIndex, (current) => nextRoom(current, field, 1))}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {ensureChildren(room).map((child, childIndex) => (
                      <div key={childIndex} className="flex items-center justify-between gap-2 rounded-md bg-[#faf8ff] p-2">
                        <span className="text-xs">Child {childIndex + 1} - {child.age === "" ? "Age not set" : `${child.age} years`}</span>
                        <select
                          value={child.bedType}
                          aria-label={`Room ${roomIndex + 1} child ${childIndex + 1} bed type`}
                          onChange={(event) => changeChildBed(roomIndex, childIndex, event.target.value as "With Bed" | "Without Bed")}
                          className="h-9 min-w-0 rounded-md border border-[#e5d7f6] bg-white px-2 text-xs"
                        >
                          <option value="Without Bed">Without Bed</option>
                          <option value="With Bed">With Bed</option>
                        </select>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
            {invalidRoom && <p role="alert" className="text-xs text-red-700">{invalidRoom}</p>}
            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</p>}
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-[#ece4f0] bg-[#fcfbfe] px-4 py-3">
            <Button type="button" variant="outline" onClick={closeGuests}>Cancel</Button>
            <Button type="button" disabled={!canApply} onClick={applyGuests} className="min-w-24 rounded-full bg-[#2685ee] text-white hover:bg-[#1976d2] disabled:bg-[#c7c7c7] disabled:text-white"><Check className="mr-2 h-4 w-4" />Apply</Button>
          </div>
        </div>
        </>,
        document.body
      )}
    </div>
  );
}
