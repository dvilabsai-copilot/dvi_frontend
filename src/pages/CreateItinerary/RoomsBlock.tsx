import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Baby, BedDouble, ChevronDown, Info, Plus, Trash2, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { ChildDetail, RoomRow, RoomTemplate } from "./helpers/useRoomsAndTravellers";
import {
  areRoomTemplatesEqual,
  cloneRoomFromTemplate,
  cloneRoomTemplate,
  getRoomBedValidationError,
  getRoomOccupancyValidationError,
  MAX_BEDS_PER_ROOM,
} from "./helpers/useRoomsAndTravellers";

type RoomsBlockProps = {
  itineraryPreference: "vehicle" | "hotel" | "both";
  rooms: RoomRow[];
  setRooms: Dispatch<SetStateAction<RoomRow[]>>;
  addRoom: () => void;
  removeRoom: (id: number) => void;
  defaultRoomTemplate: RoomTemplate;
  setDefaultRoomTemplate: Dispatch<SetStateAction<RoomTemplate>>;
};

const MAX_ADULTS_PER_ROOM = 3;
const MAX_OCCUPANTS_PER_ROOM = 4;
const MAX_ROOMS = 25;

const getAutomaticExtraBeds = (adults: number): number =>
  Math.max(Number(adults || 0) - 2, 0);

const emptyChild = (): ChildDetail => ({
  age: "",
  bedType: "Without Bed",
  hotelApprovalAccepted: false,
});

const cloneChildren = (children: ChildDetail[] = []): ChildDetail[] =>
  children.map((child) => ({
    age: child?.age ?? "",
    bedType: child?.bedType === "With Bed" ? "With Bed" : "Without Bed",
    hotelApprovalAccepted: child?.hotelApprovalAccepted === true,
  }));

function validateCombination(adult: number, child: number, infant: number): boolean {
  if (adult > MAX_ADULTS_PER_ROOM) {
    toast({ title: "Maximum of 3 adults only allowed per room", variant: "destructive" });
    return false;
  }

  const paidOccupants = adult + child;
  const infantLimitReached =
    (paidOccupants < MAX_OCCUPANTS_PER_ROOM && paidOccupants + infant > MAX_OCCUPANTS_PER_ROOM) ||
    (paidOccupants === MAX_OCCUPANTS_PER_ROOM && infant > 1);

  if (infantLimitReached) {
    toast({
      title:
        paidOccupants === MAX_OCCUPANTS_PER_ROOM
          ? "Only 1 infant is allowed with 4 adults and children"
          : "Maximum 4 total occupants allowed per room",
      variant: "destructive",
    });
    return false;
  }

  if (adult + child > MAX_OCCUPANTS_PER_ROOM || adult < 1 || child < 0 || infant < 0) {
    toast({ title: "Maximum 4 adults and children allowed per room", variant: "destructive" });
    return false;
  }

  return true;
}

function normalizeRoomRows(rooms: RoomRow[], roomCount: number): RoomRow[] {
  return rooms.map((room, index) => ({
    ...room,
    id: index + 1,
    roomCount,
    childrenDetails: cloneChildren(room.childrenDetails || []),
  }));
}

type OccupancyEditorProps = {
  room: RoomRow | RoomTemplate;
  label: string;
  onCountsChange: (adults: number, children: number, infants: number) => void;
  onChildAgeChange: (childIndex: number, value: string) => void;
  onChildBedTypeChange: (childIndex: number, bedType: "Without Bed" | "With Bed") => void;
};

const OccupancyEditor = ({
  room,
  label,
  onCountsChange,
  onChildAgeChange,
  onChildBedTypeChange,
}: OccupancyEditorProps) => {
  const childDetails = Array.isArray(room.childrenDetails) ? room.childrenDetails : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[95px_minmax(0,1fr)]">
      <div className="pt-1"><p className="text-sm font-semibold text-[#d227ad]">{label}</p></div>
      <div className="grid gap-5 md:grid-cols-3">
        <OccupancyCounter
          label="Adult"
          hint="Age: Above 11"
          value={room.adults}
          decrementDisabled={room.adults <= 1}
          onDecrement={() => onCountsChange(Math.max(room.adults - 1, 1), room.children, room.infants)}
          onIncrement={() => onCountsChange(room.adults + 1, room.children, room.infants)}
        />

        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5"><span className="text-xs font-semibold text-[#3f3850]">Child</span><span className="inline-flex items-center gap-1 text-[10px] text-[#928b9d]"><Info className="h-3 w-3" /> Age: 5 to 10</span></div>
          <div className="inline-flex h-8 overflow-hidden rounded-md border border-[#dfe2ec] bg-white">
            <Button type="button" variant="ghost" disabled={room.children <= 0} className="h-8 w-8 rounded-none px-0 text-[#677085]" aria-label={`Remove child from ${label}`} onClick={() => onCountsChange(room.adults, Math.max(room.children - 1, 0), room.infants)}>-</Button>
            <span className="flex min-w-[38px] items-center justify-center border-x border-[#e5e7ef] bg-[#fafbfe] text-sm font-medium text-[#3e4556]">{room.children}</span>
            <Button type="button" variant="ghost" className="h-8 w-8 rounded-none px-0 text-[#66728c]" aria-label={`Add child to ${label}`} onClick={() => onCountsChange(room.adults, room.children + 1, room.infants)}>+</Button>
          </div>
          {childDetails.length > 0 && <div className="mt-2 space-y-2">{childDetails.map((child, childIndex) => <div key={`${label}-${childIndex}`} className="rounded-md bg-[#faf9fc] p-2"><div className="flex flex-wrap items-center gap-2"><Input type="number" min={5} max={10} placeholder="Age" aria-label={`${label} child ${childIndex + 1} age`} value={child.age} onChange={(event) => onChildAgeChange(childIndex, event.target.value)} className="h-8 w-[70px] bg-white px-2 text-center text-xs" /><select value={child.bedType} aria-label={`${label} child ${childIndex + 1} bed type`} onChange={(event) => onChildBedTypeChange(childIndex, event.target.value as "Without Bed" | "With Bed")} className="h-8 min-w-[115px] rounded-md border border-[#dfe2ec] bg-white px-2 text-xs text-[#514b5e] outline-none"><option value="Without Bed">Without Bed</option><option value="With Bed">With Bed</option></select></div><p className="mt-1 text-[10px] text-[#8f879a]">Child #{childIndex + 1}</p></div>)}</div>}
        </div>

        <OccupancyCounter
          label="Infant"
          hint="Age: Below 5"
          value={room.infants}
          decrementDisabled={room.infants <= 0}
          onDecrement={() => onCountsChange(room.adults, room.children, Math.max(room.infants - 1, 0))}
          onIncrement={() => onCountsChange(room.adults, room.children, room.infants + 1)}
        />
      </div>
    </div>
  );
};

type OccupancyCounterProps = {
  label: string;
  hint: string;
  value: number;
  decrementDisabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
};

const OccupancyCounter = ({ label, hint, value, decrementDisabled, onDecrement, onIncrement }: OccupancyCounterProps) => (
  <div>
    <div className="mb-2 flex flex-wrap items-center gap-1.5"><span className="text-xs font-semibold text-[#3f3850]">{label}</span><span className="inline-flex items-center gap-1 text-[10px] text-[#928b9d]"><Info className="h-3 w-3" /> {hint}</span></div>
    <div className="inline-flex h-8 overflow-hidden rounded-md border border-[#dfe2ec] bg-white"><Button type="button" variant="ghost" disabled={decrementDisabled} className="h-8 w-8 rounded-none px-0 text-[#677085]" aria-label={`Remove ${label.toLowerCase()}`} onClick={onDecrement}>-</Button><span className="flex min-w-[38px] items-center justify-center border-x border-[#e5e7ef] bg-[#fafbfe] text-sm font-medium text-[#3e4556]">{value}</span><Button type="button" variant="ghost" className="h-8 w-8 rounded-none px-0 text-[#66728c]" aria-label={`Add ${label.toLowerCase()}`} onClick={onIncrement}>+</Button></div>
  </div>
);

type OccupancyAlertProps = {
  onAddExtraBed: () => void;
  onProceedWithoutExtraBed: () => void;
  onAddAdditionalRoom?: () => void;
};

const OccupancyAlert = ({
  onAddExtraBed,
  onProceedWithoutExtraBed,
  onAddAdditionalRoom,
}: OccupancyAlertProps) => (
  <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 lg:ml-[95px]">
    <div className="font-semibold">Occupancy Alert</div>
    <p className="mt-1">This room has two children aged 5 or above. At least one extra bed is required for the second child.</p>
    <div className="mt-2 flex flex-wrap gap-2">
      <Button type="button" size="sm" className="h-7 text-xs" onClick={onAddExtraBed}>Add one extra bed</Button>
      {onAddAdditionalRoom && <Button type="button" size="sm" variant="outline" className="h-7 bg-white text-xs" onClick={onAddAdditionalRoom}>Add additional room</Button>}
      <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={onProceedWithoutExtraBed}>Proceed subject to hotel approval</Button>
    </div>
  </div>
);

export const RoomsBlock = ({ itineraryPreference, rooms, setRooms, defaultRoomTemplate, setDefaultRoomTemplate }: RoomsBlockProps) => {
  const shouldShowRoomsBlock = itineraryPreference === "hotel" || itineraryPreference === "both";
  const [targetRoomCount, setTargetRoomCount] = useState<number>(rooms[0]?.roomCount || rooms.length || 1);
  const [roomsExpanded, setRoomsExpanded] = useState(false);
  const [maxRoomOccupancyAlertRoomId, setMaxRoomOccupancyAlertRoomId] = useState<number | null>(null);
  const [roomValidationMessage, setRoomValidationMessage] = useState<string | null>(null);
  const [stagedDefaultRoomTemplate, setStagedDefaultRoomTemplate] = useState<RoomTemplate | null>(null);
  const displayedDefaultRoom = stagedDefaultRoomTemplate || defaultRoomTemplate;

  const showRoomValidationMessage = (message: string) => {
    setRoomValidationMessage(message);
  };

  const getRoomForCountChange = (
    room: RoomRow | RoomTemplate,
    adults: number,
    children: number,
    infants: number,
  ): RoomRow | RoomTemplate => {
    const existingChildren = Array.isArray(room.childrenDetails) ? room.childrenDetails : [];
    const nextChildren = Math.max(Number(children || 0), 0);

    return {
      ...room,
      adults,
      children,
      infants,
      childrenDetails: Array.from(
        { length: nextChildren },
        (_, index) => existingChildren[index] || emptyChild(),
      ),
    };
  };

  const validateRoomChange = (
    room: RoomRow | RoomTemplate,
    adults: number,
    children: number,
    infants: number,
  ): boolean => {
    if (!validateCombination(adults, children, infants)) return false;

    const error = getRoomBedValidationError(
      getRoomForCountChange(room, adults, children, infants),
    );
    if (error) {
      showRoomValidationMessage(error);
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (rooms.length > 0 && targetRoomCount !== rooms.length) setTargetRoomCount(rooms.length);
  }, [rooms.length, targetRoomCount]);

  useEffect(() => {
    setRooms((previousRooms) => {
      let changed = false;
      const nextRooms = previousRooms.map((room) => {
        const extraBeds = getAutomaticExtraBeds(room.adults);
        if (Number(room.extraBeds || 0) === extraBeds) return room;
        changed = true;
        return { ...room, extraBeds };
      });
      return changed ? nextRooms : previousRooms;
    });
  }, [setRooms]);

  useEffect(() => {
    setRooms((previousRooms) => {
      let changed = false;
      const nextRooms = previousRooms.map((room) => {
        const existing = Array.isArray(room.childrenDetails) ? room.childrenDetails : [];
        const desired = Math.max(Number(room.children || 0), 0);
        if (existing.length === desired) return room;
        changed = true;
        return { ...room, childrenDetails: Array.from({ length: desired }, (_, index) => existing[index] ? { ...existing[index] } : emptyChild()) };
      });
      return changed ? nextRooms : previousRooms;
    });
  }, [rooms, setRooms]);

  const customRoomCount = useMemo(() => rooms.filter((room) => !areRoomTemplatesEqual(room, defaultRoomTemplate)).length, [rooms, defaultRoomTemplate]);

  const updateActualRoom = (roomId: number, patch: Partial<RoomRow>) => setRooms((previousRooms) => previousRooms.map((room) => room.id === roomId ? { ...room, ...patch } : room));

  const commitDefaultEdit = (nextTemplate: RoomTemplate) => {
    const next = cloneRoomTemplate(nextTemplate);
    setDefaultRoomTemplate(next);
    setRooms((previousRooms) => previousRooms.map((_, index) => cloneRoomFromTemplate(next, index + 1, previousRooms.length)));
    setStagedDefaultRoomTemplate(null);
  };

  const stageOrApplyDefaultEdit = (nextTemplate: RoomTemplate) => {
    const bedValidationError = getRoomBedValidationError(nextTemplate);
    if (bedValidationError) {
      showRoomValidationMessage(bedValidationError);
      return;
    }
    if (customRoomCount === 0) commitDefaultEdit(nextTemplate);
    else setStagedDefaultRoomTemplate(cloneRoomTemplate(nextTemplate));
  };

  const handleDefaultCountsChange = (adults: number, children: number, infants: number) => {
    if (!validateRoomChange(displayedDefaultRoom, adults, children, infants)) return;
    stageOrApplyDefaultEdit({ ...displayedDefaultRoom, adults, children, infants, extraBeds: getAutomaticExtraBeds(adults) });
  };

  const handleActualCountsChange = (room: RoomRow, adults: number, children: number, infants: number) => {
    if (!validateRoomChange(room, adults, children, infants)) return;
    updateActualRoom(room.id, { adults, children, infants, extraBeds: getAutomaticExtraBeds(adults) });
    if (adults === 2 && children === 2 && infants === 1) setMaxRoomOccupancyAlertRoomId(room.id);
  };

  const updateDefaultChild = (childIndex: number, patch: Partial<ChildDetail>) => {
    const childrenDetails = cloneChildren(displayedDefaultRoom.childrenDetails || []);
    if (!childrenDetails[childIndex]) return;
    childrenDetails[childIndex] = { ...childrenDetails[childIndex], ...patch };
    const bedValidationError = getRoomBedValidationError({
      ...displayedDefaultRoom,
      childrenDetails,
    });
    if (bedValidationError) {
      showRoomValidationMessage(bedValidationError);
      return;
    }
    stageOrApplyDefaultEdit({ ...displayedDefaultRoom, childrenDetails });
  };

  const updateActualChild = (roomId: number, childIndex: number, patch: Partial<ChildDetail>) => setRooms((previousRooms) => previousRooms.map((room) => {
    if (room.id !== roomId) return room;
    const childrenDetails = cloneChildren(room.childrenDetails || []);
    if (!childrenDetails[childIndex]) return room;
    childrenDetails[childIndex] = { ...childrenDetails[childIndex], ...patch };
    const bedValidationError = getRoomBedValidationError({ ...room, childrenDetails });
    if (bedValidationError) {
      showRoomValidationMessage(bedValidationError);
      return room;
    }
    return { ...room, childrenDetails };
  }));

  const canChangeBedType = (
    room: RoomRow | RoomTemplate,
    childIndex: number,
    bedType: "Without Bed" | "With Bed",
  ): boolean => {
    if (bedType !== "With Bed") return true;

    const childrenDetails = cloneChildren(room.childrenDetails || []);
    if (!childrenDetails[childIndex]) return false;
    childrenDetails[childIndex] = {
      ...childrenDetails[childIndex],
      bedType,
    };

    const error = getRoomBedValidationError({
      ...room,
      childrenDetails,
    });
    if (error) {
      showRoomValidationMessage(error);
      return false;
    }

    return true;
  };

  const handleDefaultChildAgeChange = (childIndex: number, value: string) => updateDefaultChild(childIndex, { age: value === "" ? "" : Number(value), hotelApprovalAccepted: false });
  const handleActualChildAgeChange = (roomId: number, childIndex: number, value: string) => updateActualChild(roomId, childIndex, { age: value === "" ? "" : Number(value), hotelApprovalAccepted: false });
  const handleDefaultBedTypeChange = (childIndex: number, bedType: "Without Bed" | "With Bed") => {
    if (bedType === "With Bed" && !canChangeBedType(displayedDefaultRoom, childIndex, bedType)) return;
    updateDefaultChild(childIndex, { bedType, hotelApprovalAccepted: false });
  };
  const handleActualBedTypeChange = (room: RoomRow, childIndex: number, bedType: "Without Bed" | "With Bed") => {
    if (bedType === "With Bed" && !canChangeBedType(room, childIndex, bedType)) return;
    updateActualChild(room.id, childIndex, { bedType, hotelApprovalAccepted: false });
  };

  const handleTotalRoomsChange = (requestedValue: number) => {
    let value = Number.isFinite(requestedValue) && requestedValue >= 1 ? Math.floor(requestedValue) : 1;
    if (value > MAX_ROOMS) {
      toast({ title: `Maximum ${MAX_ROOMS} rooms are allowed per search`, variant: "destructive" });
      value = MAX_ROOMS;
    }
    setTargetRoomCount(value);
    setRooms((previousRooms) => {
      const nextRooms = previousRooms.slice(0, value);
      while (nextRooms.length < value) nextRooms.push(cloneRoomFromTemplate(defaultRoomTemplate, nextRooms.length + 1, value));
      return normalizeRoomRows(nextRooms, value);
    });
  };

  const handleDeleteRoom = (roomId: number) => setRooms((previousRooms) => {
    if (previousRooms.length <= 1) return previousRooms;
    const nextRooms = previousRooms.filter((room) => room.id !== roomId);
    const roomCount = Math.max(nextRooms.length, 1);
    setTargetRoomCount(roomCount);
    return normalizeRoomRows(nextRooms, roomCount);
  });

  const isChildAgeFiveOrAbove = (age: number | "") => age === "" || (Number.isFinite(Number(age)) && Number(age) >= 5);
  const getOccupancyAlertChildIndex = (room: RoomRow | RoomTemplate): number => {
    const eligibleChildren = (room.childrenDetails || []).map((child, index) => ({ child, index })).filter(({ child }) => isChildAgeFiveOrAbove(child.age));
    if (eligibleChildren.length < 2) return -1;
    return eligibleChildren.slice(1).find(({ child }) => child.bedType !== "With Bed" && child.hotelApprovalAccepted !== true)?.index ?? -1;
  };

  const handleAddExtraBedForChild = (roomId: number, childIndex: number) => {
    const room = rooms.find((candidate) => candidate.id === roomId);
    if (!room || !canChangeBedType(room, childIndex, "With Bed")) return;
    updateActualChild(roomId, childIndex, { bedType: "With Bed", hotelApprovalAccepted: false });
    toast({ title: "Extra bed added", description: "The second child has been marked as With Bed." });
  };
  const handleProceedWithoutExtraBed = (roomId: number, childIndex: number) => {
    updateActualChild(roomId, childIndex, { bedType: "Without Bed", hotelApprovalAccepted: true });
    toast({ title: "Hotel approval required", description: "This itinerary will proceed without extra bed for the second child, subject to hotel approval." });
  };

  const handleAddExtraBedForDefault = (childIndex: number) => {
    if (!canChangeBedType(displayedDefaultRoom, childIndex, "With Bed")) return;
    updateDefaultChild(childIndex, { bedType: "With Bed", hotelApprovalAccepted: false });
    toast({ title: "Extra bed added", description: "The second Default Room child has been marked as With Bed." });
  };
  const handleProceedWithoutExtraBedForDefault = (childIndex: number) => {
    updateDefaultChild(childIndex, { bedType: "Without Bed", hotelApprovalAccepted: true });
    toast({ title: "Hotel approval required", description: "The Default Room will proceed without an extra bed for the second child, subject to hotel approval." });
  };

  // These actions redistribute the selected actual room and intentionally do
  // not clone the Default Room template.
  const handleAddAdditionalRoomForChild = (roomId: number, childIndex: number) => {
    setRooms((previousRooms) => {
      if (previousRooms.length >= MAX_ROOMS) return previousRooms;
      const sourceIndex = previousRooms.findIndex((room) => room.id === roomId);
      const sourceRoom = previousRooms[sourceIndex];
      const childToMove = sourceRoom?.childrenDetails?.[childIndex];
      if (!sourceRoom || !childToMove || sourceRoom.adults <= 1) return previousRooms;
      const roomCount = previousRooms.length + 1;
      const nextRooms = previousRooms.map((room, index) => index !== sourceIndex ? { ...room, roomCount } : ({ ...room, adults: Math.max(Number(room.adults || 0) - 1, 1), children: Math.max(Number(room.children || 0) - 1, 0), roomCount, childrenDetails: cloneChildren(room.childrenDetails || []).filter((_, index) => index !== childIndex) }));
      nextRooms.push({ id: roomCount, roomCount, adults: 1, children: 1, infants: 0, extraBeds: 0, childrenDetails: [{ ...childToMove, bedType: "Without Bed", hotelApprovalAccepted: false }] });
      setTargetRoomCount(roomCount);
      return normalizeRoomRows(nextRooms, roomCount);
    });
    toast({ title: "Additional room added", description: "One adult and the second child have been moved to the new room." });
  };

  const handleAddAdditionalRoomForMaxOccupancy = (roomId: number) => {
    setRooms((previousRooms) => {
      if (previousRooms.length >= MAX_ROOMS) return previousRooms;
      const sourceIndex = previousRooms.findIndex((room) => room.id === roomId);
      const sourceRoom = previousRooms[sourceIndex];
      if (!sourceRoom) return previousRooms;
      const roomCount = previousRooms.length + 1;
      const childIndex = Math.max(Number(sourceRoom.children || 0) - 1, 0);
      const childToMove = cloneChildren(sourceRoom.childrenDetails || [])[childIndex] || emptyChild();
      const nextRooms = previousRooms.map((room, index) => index !== sourceIndex ? { ...room, roomCount } : ({ ...room, adults: Math.max(Number(room.adults || 0) - 1, 1), children: Math.max(Number(room.children || 0) - 1, 0), roomCount, childrenDetails: cloneChildren(room.childrenDetails || []).filter((_, index) => index !== childIndex) }));
      nextRooms.push({ id: roomCount, roomCount, adults: 1, children: 1, infants: 0, extraBeds: 0, childrenDetails: [{ ...childToMove, hotelApprovalAccepted: false }] });
      setTargetRoomCount(roomCount);
      return normalizeRoomRows(nextRooms, roomCount);
    });
    setMaxRoomOccupancyAlertRoomId(null);
    toast({ title: "Additional room added", description: "One adult and one child have been moved to the new room." });
  };

  const maxRoomOccupancyAlertRoom = maxRoomOccupancyAlertRoomId === null ? null : rooms.find((room) => room.id === maxRoomOccupancyAlertRoomId) || null;
  const bookingSummary = useMemo(() => rooms.reduce((summary, room) => {
    const adults = Math.max(Number(room.adults || 0), 0);
    const children = Math.max(Number(room.children || 0), 0);
    const infants = Math.max(Number(room.infants || 0), 0);
    const extraBeds = Math.max(Number(room.extraBeds || 0), 0);
    const childrenWithBed = (room.childrenDetails || []).filter((child) => child.bedType === "With Bed").length;
    summary.adults += adults; summary.children += children; summary.infants += infants; summary.extraBeds += extraBeds; summary.childWithBed += childrenWithBed; summary.childNoBed += Math.max(children - childrenWithBed, 0);
    return summary;
  }, { adults: 0, children: 0, infants: 0, extraBeds: 0, childWithBed: 0, childNoBed: 0 }), [rooms]);

  if (!shouldShowRoomsBlock) return null;
  const totalPax = bookingSummary.adults + bookingSummary.children + bookingSummary.infants;
  const chargeablePax = bookingSummary.adults + bookingSummary.children;
  const defaultOccupancyAlertChildIndex = getOccupancyAlertChildIndex(displayedDefaultRoom);

  return (
    <div className={`space-y-3 ${roomsExpanded ? "[&>div:nth-of-type(2)>div:nth-of-type(2)]:hidden" : ""}`}>
      <div className="rounded-xl border border-[#d9e6f5] bg-[#f2f7ff] px-4 py-3 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_285px]">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2edff] text-[#4169c1]">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#243b68]">Booking Summary</p>
                <p className="text-[10px] text-[#71819e]">Auto-updates as you modify rooms</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <div className="min-w-0 rounded-lg border border-[#d4e2fb] bg-[#f8fbff] px-3 py-2 shadow-[0_1px_2px_rgba(55,93,151,0.06)]">
                <p className="truncate text-[10px] font-medium text-[#36527f]">Total Rooms</p>
                <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f2f4ff]"><BedDouble className="h-4 w-4 text-[#4969dc]" /></div>
                  <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#244c9b]">{rooms.length}</span>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-[#d6eddf] bg-[#f5fcf8] px-3 py-2 shadow-[0_1px_2px_rgba(55,133,85,0.06)]">
                <p className="truncate text-[10px] font-medium text-[#3f6b50]">Total Adults</p>
                <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef9f2]"><Users className="h-4 w-4 text-[#17a15d]" /></div>
                  <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#17663a]">{bookingSummary.adults}</span>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-[#f3dfc7] bg-[#fffaf4] px-3 py-2 shadow-[0_1px_2px_rgba(183,106,35,0.06)]">
                <p className="text-left text-[10px] font-medium leading-tight text-[#8c5524]">Child With Bed</p>
                <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#fff6eb]"><BedDouble className="h-4 w-4 text-[#ea8125]" /></div>
                  <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#a65310]">{bookingSummary.childWithBed}</span>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-[#e7dcf6] bg-[#fbf8ff] px-3 py-2 shadow-[0_1px_2px_rgba(119,74,166,0.06)]">
                <p className="text-left text-[10px] font-medium leading-tight text-[#654283]">Child No Bed</p>
                <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#faf3ff]"><Users className="h-4 w-4 text-[#914ac2]" /></div>
                  <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#653196]">{bookingSummary.childNoBed}</span>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-[#f2d9e0] bg-[#fff7f9] px-3 py-2 shadow-[0_1px_2px_rgba(190,61,92,0.06)]">
                <p className="truncate text-[10px] font-medium text-[#854052]">Extra Beds</p>
                <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#fff2f5]"><BedDouble className="h-4 w-4 text-[#df5270]" /></div>
                  <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#a52b4d]">{bookingSummary.extraBeds}</span>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-[#d3ebef] bg-[#f5fcfd] px-3 py-2 shadow-[0_1px_2px_rgba(21,123,137,0.06)]">
                <p className="truncate text-[10px] font-medium text-[#39717b]">Infants</p>
                <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef9fb]"><Baby className="h-4 w-4 text-[#199aac]" /></div>
                  <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#08717e]">{bookingSummary.infants}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end xl:pb-[1px]">
            <div className="w-full rounded-xl border border-[#ee9dcc] bg-[#fff0fa] px-4 py-3">
              <div className="flex min-h-[55px] items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ffd9f0] text-[#d4148e]"><Users className="h-5 w-5" /></div>
                <div className="min-w-[52px] shrink-0">
                  <p className="text-[10px] font-semibold text-[#173d78]">Total Pax</p>
                  <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-[#123568]">{totalPax}</p>
                </div>
                <div className="min-w-0 flex-1 border-l border-[#a9bddb] pl-3 text-[10px] text-[#29466f]">
                  <p className="whitespace-nowrap">Chargeable Pax: <span className="font-semibold text-[#173d78]">{chargeablePax}</span></p>
                  <p className="mt-1.5 whitespace-nowrap">Room Occupancy: <span className="font-semibold text-[#173d78]">{rooms.length} {rooms.length === 1 ? "Room" : "Rooms"}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#ebe5f1] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#eee8f3] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-base font-semibold text-[#312746]">Room Configuration</h3><p className="mt-0.5 text-xs text-[#8c8498]">Set a Default Room, then customize individual rooms only when needed.</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs text-[#746b80]">Total Rooms<Input type="number" min={1} max={MAX_ROOMS} value={targetRoomCount} aria-label="Total Rooms" className="h-9 w-16 border-[#e3d8eb] bg-white text-center" onChange={(event) => handleTotalRoomsChange(Number(event.target.value))} /></label><Button type="button" variant="outline" disabled={targetRoomCount >= MAX_ROOMS} onClick={() => handleTotalRoomsChange(targetRoomCount + 1)} className="h-9 border-[#c93bc4] px-4 text-[#b526b0] hover:bg-[#fff4ff] hover:text-[#9e1999]"><Plus className="mr-1.5 h-4 w-4" />Add Room</Button><Button type="button" variant="outline" aria-expanded={roomsExpanded} aria-controls="individual-room-list" onClick={() => setRoomsExpanded((expanded) => !expanded)} className="h-9 border-[#7c5bd6] px-4 text-[#6542b5]">{roomsExpanded ? "Close Rooms" : "Edit Individual Rooms"}<ChevronDown className={`ml-1.5 h-4 w-4 transition-transform ${roomsExpanded ? "rotate-180" : ""}`} /></Button></div></div>

        <div className="border-b border-[#eee8f3] bg-[#fcfaff] px-4 py-4 sm:px-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-semibold text-[#312746]">Default Room</h4><p className="text-xs text-[#8c8498]">Template only — not saved as a room or traveller.</p></div><span className="rounded-full bg-[#f2e8ff] px-2.5 py-1 text-[10px] font-medium text-[#6941a5]">Applied to new rooms</span></div><OccupancyEditor room={displayedDefaultRoom} label="Default" onCountsChange={handleDefaultCountsChange} onChildAgeChange={handleDefaultChildAgeChange} onChildBedTypeChange={handleDefaultBedTypeChange} />{defaultOccupancyAlertChildIndex >= 0 && <OccupancyAlert onAddExtraBed={() => handleAddExtraBedForDefault(defaultOccupancyAlertChildIndex)} onProceedWithoutExtraBed={() => handleProceedWithoutExtraBedForDefault(defaultOccupancyAlertChildIndex)} />}{customRoomCount > 0 && <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{customRoomCount} individual {customRoomCount === 1 ? "room is" : "rooms are"} customized. Changing the Default Room will ask before replacing those customizations.</p>}</div>

        {roomsExpanded && <div id="individual-room-list" role="region" className="max-h-[55vh] overflow-y-auto divide-y divide-[#eee8f3] lg:max-h-[560px]" aria-label="Individual room editors">{rooms.map((room, index) => { const isTemplateManagedRoom = areRoomTemplatesEqual(room, defaultRoomTemplate); const alertChildIndex = isTemplateManagedRoom ? -1 : getOccupancyAlertChildIndex(room); return <div key={room.id} className="relative px-4 py-4 sm:px-5">{rooms.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Delete room ${index + 1}`} onClick={() => handleDeleteRoom(room.id)} className="absolute right-3 top-3 h-8 w-8 text-[#ef5a61] hover:bg-[#fff1f1] hover:text-[#dc343d]"><Trash2 className="h-4 w-4" /></Button>}<OccupancyEditor room={room} label={`#Room ${index + 1}`} onCountsChange={(adults, children, infants) => handleActualCountsChange(room, adults, children, infants)} onChildAgeChange={(childIndex, value) => handleActualChildAgeChange(room.id, childIndex, value)} onChildBedTypeChange={(childIndex, bedType) => handleActualBedTypeChange(room, childIndex, bedType)} />{alertChildIndex >= 0 && <OccupancyAlert onAddExtraBed={() => handleAddExtraBedForChild(room.id, alertChildIndex)} onAddAdditionalRoom={() => handleAddAdditionalRoomForChild(room.id, alertChildIndex)} onProceedWithoutExtraBed={() => handleProceedWithoutExtraBed(room.id, alertChildIndex)} />}</div>; })}</div>}
        {roomsExpanded && <div className="border-t border-[#eee8f3] px-4 py-3 text-right"><Button type="button" variant="ghost" aria-label="Close individual room editors" onClick={() => setRoomsExpanded(false)}>Close Rooms</Button></div>}
      </div>

      <Dialog open={Boolean(roomValidationMessage)} onOpenChange={(open) => { if (!open) setRoomValidationMessage(null); }}>
        <DialogContent className="max-w-md border-amber-300">
          <DialogHeader>
            <DialogTitle>Room occupancy not allowed</DialogTitle>
            <DialogDescription>
              This change was not applied because the room would exceed its bed or occupancy rules.
            </DialogDescription>
          </DialogHeader>
          <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            {roomValidationMessage || `A maximum of ${MAX_BEDS_PER_ROOM} beds is allowed per room.`}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setRoomValidationMessage(null)}>Review room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(stagedDefaultRoomTemplate)} onOpenChange={(open) => { if (!open) setStagedDefaultRoomTemplate(null); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Apply Default Room changes?</DialogTitle><DialogDescription>Some individual rooms are customized. Applying this Default Room will replace every actual room with a deep copy of the new template while preserving room IDs and the total room count.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setStagedDefaultRoomTemplate(null)}>Cancel</Button><Button type="button" onClick={() => stagedDefaultRoomTemplate && commitDefaultEdit(stagedDefaultRoomTemplate)}>Apply to all rooms</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={Boolean(maxRoomOccupancyAlertRoom)} onOpenChange={(open) => { if (!open) setMaxRoomOccupancyAlertRoomId(null); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Maximum room occupancy reached</DialogTitle><DialogDescription>This room now has 2 adults, 2 children, and 1 infant. This is the maximum room occupancy combination, so booking an additional room is recommended.</DialogDescription></DialogHeader><div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Adding another room will move one adult and one child to the new room, keeping the itinerary safer for hotel approval.</div><DialogFooter><Button type="button" variant="outline" onClick={() => setMaxRoomOccupancyAlertRoomId(null)}>Keep same room</Button><Button type="button" onClick={() => maxRoomOccupancyAlertRoom && handleAddAdditionalRoomForMaxOccupancy(maxRoomOccupancyAlertRoom.id)}>Add additional room</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};
