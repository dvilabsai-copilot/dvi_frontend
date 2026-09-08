// FILE: src/pages/CreateItinerary/RoomsBlock.tsx

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
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
import {
  Baby,
  BedDouble,
  Info,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { ChildDetail, RoomRow } from "./helpers/useRoomsAndTravellers";

type RoomsBlockProps = {
  itineraryPreference: "vehicle" | "hotel" | "both";
  rooms: RoomRow[];
setRooms: Dispatch<SetStateAction<RoomRow[]>>;
  addRoom: () => void;
  removeRoom: (id: number) => void;
};

const MAX_ADULTS_PER_ROOM = 3;
const MAX_OCCUPANTS_PER_ROOM = 4;
const getAutomaticExtraBeds = (adults: number): number =>
  Math.max(Number(adults || 0) - 2, 0);
const MAX_ROOMS = 25;

export const RoomsBlock = ({
  itineraryPreference,
  rooms,
  setRooms,
  addRoom,
}: RoomsBlockProps) => {
    const [targetRoomCount, setTargetRoomCount] = useState<number>(
    rooms[0]?.roomCount || rooms.length || 1
  );

  const [maxRoomOccupancyAlertRoomId, setMaxRoomOccupancyAlertRoomId] =
    useState<number | null>(null);

  const shouldShowRoomsBlock =
    itineraryPreference === "hotel" || itineraryPreference === "both";
    //const initialRoomsFixedRef = useRef(false);

  const validateCombination = (
    adult: number,
    child: number,
    infant: number
  ): boolean => {
      if (adult > MAX_ADULTS_PER_ROOM) {
        toast({
          title: "Maximum of 3 adults only allowed per room",
          variant: "destructive",
        });
        return false;
      }

      const paidOccupants = adult + child;
      const infantLimitReached =
        (paidOccupants < MAX_OCCUPANTS_PER_ROOM &&
          paidOccupants + infant > MAX_OCCUPANTS_PER_ROOM) ||
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

      if (adult + child > MAX_OCCUPANTS_PER_ROOM) {
        toast({
          title: "Maximum 4 adults and children allowed per room",
          variant: "destructive",
        });
        return false;
      }

      const ok =
        adult >= 1 &&
        child >= 0 &&
        adult + child <= MAX_OCCUPANTS_PER_ROOM &&
        infant >= 0;

      if (ok) return true;

      toast({
        title: "Maximum 4 adults and children allowed per room",
        variant: "destructive",
      });

      return false;
  };

    const isMaxRoomOccupancyReachedCombination = (
    adult: number,
    child: number,
    infant: number
  ): boolean => {
    return (
      Number(adult) === 2 &&
      Number(child) === 2 &&
      Number(infant) === 1
    );
  };

  const updateRoom = (
    roomId: number,
    patch: Partial<Omit<RoomRow, "id">>
  ) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...patch } : r))
    );
  };

    const tryUpdateCounts = (
    room: RoomRow,
    nextAdults: number,
    nextChildren: number,
    nextInfants: number,
    opts?: { skipValidate?: boolean }
  ) => {
    if (!opts?.skipValidate) {
      if (!validateCombination(nextAdults, nextChildren, nextInfants)) {
        return;
      }
    }

    const shouldShowMaxRoomOccupancyAlert =
      !opts?.skipValidate &&
      isMaxRoomOccupancyReachedCombination(
        nextAdults,
        nextChildren,
        nextInfants
      );

    updateRoom(room.id, {
      adults: nextAdults,
      children: nextChildren,
      infants: nextInfants,
      extraBeds: getAutomaticExtraBeds(nextAdults),
    });

    if (shouldShowMaxRoomOccupancyAlert) {
      setMaxRoomOccupancyAlertRoomId(room.id);
    }
  };

   // sync childrenDetails with children count
  useEffect(() => {
    setRooms((prev) => {
      let changed = false;
      const next = prev.map((room) => {
        const extraBeds = getAutomaticExtraBeds(room.adults);
        if (Number(room.extraBeds || 0) === extraBeds) return room;
        changed = true;
        return { ...room, extraBeds };
      });
      return changed ? next : prev;
    });
  }, [setRooms]);

  useEffect(() => {
    setRooms((prev) => {
      let changed = false;

      const next = prev.map((room) => {
        const existing = Array.isArray(room.childrenDetails)
          ? room.childrenDetails
          : [];
        const desired = room.children;

        if (existing.length === desired) return room;

        if (existing.length < desired) {
          const arr = [...existing];
          const toAdd = desired - existing.length;
          for (let i = 0; i < toAdd; i++) {
            arr.push({
              age: "",
              bedType: "Without Bed",
              hotelApprovalAccepted: false,
            });
          }
          changed = true;
          return { ...room, childrenDetails: arr };
        }

        changed = true;
        return {
          ...room,
          childrenDetails: existing.slice(0, desired),
        };
      });

      return changed ? next : prev;
    });
  }, [rooms, setRooms]);

  
useEffect(() => {
  setRooms((prev) => {
    if (!Array.isArray(prev) || prev.length !== 1) {
      return prev;
    }

    const room = prev[0];

    const isInitialDefaultRoom =
      Number(room.id) === 1 &&
      Number(room.adults) === 1 &&
      Number(room.children || 0) === 0 &&
      Number(room.infants || 0) === 0 &&
      Number(room.roomCount || 1) === 1;

    if (!isInitialDefaultRoom) {
      return prev;
    }

    return [
      {
        ...room,
        adults: 2,
        roomCount: 1,
        childrenDetails: Array.isArray(room.childrenDetails)
          ? room.childrenDetails
          : [],
      },
    ];
  });
}, [setRooms]);


  const handleTotalRoomsChange = (value: number) => {
  if (!Number.isFinite(value) || value < 1) value = 1;

  if (value > MAX_ROOMS) {
    toast({
      title: `Maximum ${MAX_ROOMS} rooms are allowed per search`,
      variant: "destructive",
    });
    value = MAX_ROOMS;
  }

  setTargetRoomCount(value);

  setRooms((prev) => {
    const current = Array.isArray(prev) && prev.length > 0 ? [...prev] : [];

    while (current.length < value) {
      current.push({
        id: current.length + 1,
        adults: 2,
        children: 0,
        infants: 0,
        extraBeds: 0,
        roomCount: value,
        childrenDetails: [],
      });
    }

    if (current.length > value) {
      current.length = value;
    }

    return current.map((room, index) => ({
      ...room,
      id: index + 1,
      roomCount: value,
      childrenDetails: Array.isArray(room.childrenDetails)
        ? room.childrenDetails
        : [],
    }));
  });
};
  const handleChildAgeChange = (
    roomId: number,
    childIndex: number,
    value: string
  ) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;
        const nextChildren = [...(room.childrenDetails || [])];
        if (!nextChildren[childIndex]) return room;
        nextChildren[childIndex] = {
          ...nextChildren[childIndex],
          age: value === "" ? "" : Number(value),
          hotelApprovalAccepted: false,
        };
        return { ...room, childrenDetails: nextChildren };
      })
    );
  };

  const handleChildBedTypeChange = (
    roomId: number,
    childIndex: number,
    bedType: "Without Bed" | "With Bed"
  ) => {
    const room = rooms.find((item) => item.id === roomId);
    const currentChildren = Array.isArray(room?.childrenDetails)
      ? room.childrenDetails
      : [];
    const anotherChildHasBed = currentChildren.some(
      (child, index) => index !== childIndex && child.bedType === "With Bed"
    );

    if (bedType === "With Bed" && anotherChildHasBed) {
      toast({
        title: "Only 1 extra bed is allowed per room",
        description:
          "This child has been kept Without Bed because the extra bed is already assigned to another child.",
        variant: "destructive",
      });
      bedType = "Without Bed";
    } else if (bedType === "With Bed" && Number(room?.adults || 0) > 2) {
      toast({
        title: "Only 1 extra bed is allowed per room",
        description:
          "The extra bed is already assigned to the third adult. This child must remain Without Bed.",
        variant: "destructive",
      });
      bedType = "Without Bed";
    }

    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;
        const nextChildren = [...(room.childrenDetails || [])];
        if (!nextChildren[childIndex]) return room;
        nextChildren[childIndex] = {
          ...nextChildren[childIndex],
          bedType,
          hotelApprovalAccepted: false,
        };
        return { ...room, childrenDetails: nextChildren };
      })
    );
  };

    const isChildAgeFiveOrAbove = (age: number | ""): boolean => {
    if (age === "") {
      return true;
    }

    const numericAge = Number(age);
    return Number.isFinite(numericAge) && numericAge >= 5;
  };

  const getOccupancyAlertChildIndex = (room: RoomRow): number => {
    const eligibleChildren = (room.childrenDetails || [])
      .map((child, index) => ({ child, index }))
      .filter(({ child }) => isChildAgeFiveOrAbove(child.age));

    if (eligibleChildren.length < 2) {
      return -1;
    }

    const unresolvedSecondChild = eligibleChildren.slice(1).find(({ child }) => {
      const hasExtraBed = child.bedType === "With Bed";
      const hasHotelApproval = child.hotelApprovalAccepted === true;
      return !hasExtraBed && !hasHotelApproval;
    });

    return unresolvedSecondChild?.index ?? -1;
  };

  const handleAddExtraBedForChild = (roomId: number, childIndex: number) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;

        const nextChildren = [...(room.childrenDetails || [])];
        if (!nextChildren[childIndex]) return room;

        nextChildren[childIndex] = {
          ...nextChildren[childIndex],
          bedType: "With Bed",
          hotelApprovalAccepted: false,
        };

        return {
          ...room,
          childrenDetails: nextChildren,
        };
      })
    );

    toast({
      title: "Extra bed added",
      description: "The second child has been marked as With Bed.",
    });
  };

  const handleProceedWithoutExtraBed = (
    roomId: number,
    childIndex: number
  ) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;

        const nextChildren = [...(room.childrenDetails || [])];
        if (!nextChildren[childIndex]) return room;

        nextChildren[childIndex] = {
          ...nextChildren[childIndex],
          bedType: "Without Bed",
          hotelApprovalAccepted: true,
        };

        return {
          ...room,
          childrenDetails: nextChildren,
        };
      })
    );

    toast({
      title: "Hotel approval required",
      description:
        "This itinerary will proceed without extra bed for the second child, subject to hotel approval.",
    });
  };

  const handleAddAdditionalRoomForChild = (
    roomId: number,
    childIndex: number
  ) => {
    if (targetRoomCount >= MAX_ROOMS) {
      toast({
        title: `Maximum ${MAX_ROOMS} rooms are allowed per search`,
        variant: "destructive",
      });
      return;
    }

    const sourceRoom = rooms.find((room) => room.id === roomId);

    if (!sourceRoom || sourceRoom.adults <= 1) {
      handleTotalRoomsChange(targetRoomCount + 1);

      toast({
        title: "Additional room added",
        description:
          "Please adjust the adult and child distribution manually for the new room.",
      });

      return;
    }

    setRooms((prev) => {
      const sourceIndex = prev.findIndex((room) => room.id === roomId);
      if (sourceIndex < 0) return prev;

      const source = prev[sourceIndex];
      const childToMove = source.childrenDetails?.[childIndex] as
        | ChildDetail
        | undefined;

      if (!childToMove || source.adults <= 1) return prev;

      const nextRoomCount = prev.length + 1;

      const updatedSourceChildren = (source.childrenDetails || []).filter(
        (_, index) => index !== childIndex
      );

      const nextRooms = prev.map((room, index) => {
        if (index !== sourceIndex) {
          return {
            ...room,
            roomCount: nextRoomCount,
          };
        }

        return {
          ...room,
          adults: Math.max(Number(room.adults || 0) - 1, 1),
          children: Math.max(Number(room.children || 0) - 1, 0),
          childrenDetails: updatedSourceChildren,
          roomCount: nextRoomCount,
        };
      });

      nextRooms.push({
        id: nextRoomCount,
        roomCount: nextRoomCount,
        adults: 1,
        children: 1,
        infants: 0,
        extraBeds: 0,
        childrenDetails: [
          {
            ...childToMove,
            bedType: "Without Bed",
            hotelApprovalAccepted: false,
          },
        ],
      });

      setTargetRoomCount(nextRoomCount);

      return nextRooms.map((room, index) => ({
        ...room,
        id: index + 1,
        roomCount: nextRoomCount,
      }));
    });

    toast({
      title: "Additional room added",
      description:
        "One adult and the second child have been moved to the new room.",
    });
  };

    const maxRoomOccupancyAlertRoom =
    maxRoomOccupancyAlertRoomId !== null
      ? rooms.find((room) => room.id === maxRoomOccupancyAlertRoomId) || null
      : null;

  const handleAddAdditionalRoomForMaxOccupancy = (roomId: number) => {
    if (targetRoomCount >= MAX_ROOMS) {
      toast({
        title: `Maximum ${MAX_ROOMS} rooms are allowed per search`,
        variant: "destructive",
      });
      return;
    }

    setRooms((prev) => {
      const sourceIndex = prev.findIndex((room) => room.id === roomId);
      if (sourceIndex < 0) return prev;

      const sourceRoom = prev[sourceIndex];
      const nextRoomCount = prev.length + 1;

      const sourceChildrenDetails = Array.isArray(sourceRoom.childrenDetails)
        ? sourceRoom.childrenDetails
        : [];

      const childIndexToMove = Math.max(
        Number(sourceRoom.children || 0) - 1,
        0
      );

      const childToMove: ChildDetail =
        sourceChildrenDetails[childIndexToMove] || {
          age: "",
          bedType: "Without Bed",
          hotelApprovalAccepted: false,
        };

      const remainingSourceChildren = sourceChildrenDetails.filter(
        (_, index) => index !== childIndexToMove
      );

      const nextRooms = prev.map((room, index) => {
        if (index !== sourceIndex) {
          return {
            ...room,
            roomCount: nextRoomCount,
          };
        }

        return {
          ...room,
          adults: Math.max(Number(room.adults || 0) - 1, 1),
          children: Math.max(Number(room.children || 0) - 1, 0),
          infants: Number(room.infants || 0),
          childrenDetails: remainingSourceChildren,
          roomCount: nextRoomCount,
        };
      });

      nextRooms.push({
        id: nextRoomCount,
        roomCount: nextRoomCount,
        adults: 1,
        children: 1,
        infants: 0,
        extraBeds: 0,
        childrenDetails: [
          {
            ...childToMove,
            hotelApprovalAccepted: false,
          },
        ],
      });

      setTargetRoomCount(nextRoomCount);

      return nextRooms.map((room, index) => ({
        ...room,
        id: index + 1,
        roomCount: nextRoomCount,
        childrenDetails: Array.isArray(room.childrenDetails)
          ? room.childrenDetails
          : [],
      }));
    });

    setMaxRoomOccupancyAlertRoomId(null);

    toast({
      title: "Additional room added",
      description:
        "One adult and one child have been moved to the new room.",
    });
  };

   const handleDeleteRoomBlock = (roomId: number) => {
  setRooms((prev) => {
    if (!Array.isArray(prev) || prev.length <= 1) {
      return prev;
    }

    const filteredRooms = prev.filter((room) => room.id !== roomId);
    const nextRoomCount = filteredRooms.length || 1;

    setTargetRoomCount(nextRoomCount);

    return filteredRooms.map((room, index) => ({
      ...room,
      id: index + 1,
      roomCount: nextRoomCount,
      childrenDetails: Array.isArray(room.childrenDetails)
        ? room.childrenDetails
        : [],
    }));
  });
};

const bookingSummary = rooms.reduce(
  (summary, room) => {
    const adults = Math.max(Number(room.adults || 0), 0);
    const children = Math.max(Number(room.children || 0), 0);
    const infants = Math.max(Number(room.infants || 0), 0);
    const extraBeds = Math.max(Number(room.extraBeds || 0), 0);

    const childrenDetails = Array.isArray(room.childrenDetails)
      ? room.childrenDetails
      : [];

    const childrenWithBed = childrenDetails.filter(
      (child) => child.bedType === "With Bed"
    ).length;

    summary.adults += adults;
    summary.children += children;
    summary.infants += infants;
    summary.extraBeds += extraBeds;
    summary.childWithBed += childrenWithBed;
    summary.childNoBed += Math.max(children - childrenWithBed, 0);

    return summary;
  },
  {
    adults: 0,
    children: 0,
    infants: 0,
    extraBeds: 0,
    childWithBed: 0,
    childNoBed: 0,
  }
);

const totalPax =
  bookingSummary.adults +
  bookingSummary.children +
  bookingSummary.infants;

const chargeablePax =
  bookingSummary.adults + bookingSummary.children;

  if (!shouldShowRoomsBlock) {
  return null;
}

return (
  <div className="space-y-3">
{/* BOOKING SUMMARY */}
<div className="rounded-xl border border-[#d9e6f5] bg-[#f2f7ff] px-4 py-3 shadow-sm">
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_285px]">
    {/* LEFT SIDE */}
    <div className="min-w-0">
      {/* TITLE */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e2edff] text-[#4169c1]">
          <Users className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#243b68]">
            Booking Summary
          </p>

          <p className="text-[10px] text-[#71819e]">
            Auto-updates as you modify rooms
          </p>
        </div>
      </div>

      {/* SUMMARY DATA BOXES */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {/* TOTAL ROOMS */}
        <div className="min-w-0 rounded-lg border border-[#d4e2fb] bg-[#f8fbff] px-3 py-2 shadow-[0_1px_2px_rgba(55,93,151,0.06)]">
          <p className="truncate text-[10px] font-medium text-[#36527f]">
            Total Rooms
          </p>

          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f2f4ff]">
              <BedDouble className="h-4 w-4 text-[#4969dc]" />
            </div>

            <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#244c9b]">
              {rooms.length}
            </span>
          </div>
        </div>

        {/* TOTAL ADULTS */}
        <div className="min-w-0 rounded-lg border border-[#d6eddf] bg-[#f5fcf8] px-3 py-2 shadow-[0_1px_2px_rgba(55,133,85,0.06)]">
          <p className="truncate text-[10px] font-medium text-[#3f6b50]">
            Total Adults
          </p>

          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef9f2]">
              <Users className="h-4 w-4 text-[#17a15d]" />
            </div>

            <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#17663a]">
              {bookingSummary.adults}
            </span>
          </div>
        </div>

        {/* CHILD WITH BED */}
        <div className="min-w-0 rounded-lg border border-[#f3dfc7] bg-[#fffaf4] px-3 py-2 shadow-[0_1px_2px_rgba(183,106,35,0.06)]">
          <p className="text-left text-[10px] font-medium leading-tight text-[#8c5524]">
            Child With Bed
          </p>

          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#fff6eb]">
              <BedDouble className="h-4 w-4 text-[#ea8125]" />
            </div>

            <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#a65310]">
              {bookingSummary.childWithBed}
            </span>
          </div>
        </div>

        {/* CHILD NO BED */}
        <div className="min-w-0 rounded-lg border border-[#e7dcf6] bg-[#fbf8ff] px-3 py-2 shadow-[0_1px_2px_rgba(119,74,166,0.06)]">
          <p className="text-left text-[10px] font-medium leading-tight text-[#654283]">
            Child No Bed
          </p>

          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#faf3ff]">
              <Users className="h-4 w-4 text-[#914ac2]" />
            </div>

            <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#653196]">
              {bookingSummary.childNoBed}
            </span>
          </div>
        </div>

        {/* EXTRA BEDS */}
        <div className="min-w-0 rounded-lg border border-[#f2d9e0] bg-[#fff7f9] px-3 py-2 shadow-[0_1px_2px_rgba(190,61,92,0.06)]">
          <p className="truncate text-[10px] font-medium text-[#854052]">
            Extra Beds
          </p>

          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#fff2f5]">
              <BedDouble className="h-4 w-4 text-[#df5270]" />
            </div>

            <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#a52b4d]">
              {bookingSummary.extraBeds}
            </span>
          </div>
        </div>

        {/* INFANTS */}
        <div className="min-w-0 rounded-lg border border-[#d3ebef] bg-[#f5fcfd] px-3 py-2 shadow-[0_1px_2px_rgba(21,123,137,0.06)]">
          <p className="truncate text-[10px] font-medium text-[#39717b]">
            Infants
          </p>

          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef9fb]">
              <Baby className="h-4 w-4 text-[#199aac]" />
            </div>

            <span className="min-w-0 flex-1 text-right text-lg font-semibold leading-none tabular-nums text-[#08717e]">
              {bookingSummary.infants}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* TOTAL PAX */}
    <div className="flex items-end xl:pb-[1px]">
      <div className="w-full rounded-xl border border-[#ee9dcc] bg-[#fff0fa] px-4 py-3">
        <div className="flex min-h-[55px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ffd9f0] text-[#d4148e]">
            <Users className="h-5 w-5" />
          </div>

          <div className="min-w-[52px] shrink-0">
            <p className="text-[10px] font-semibold text-[#173d78]">
              Total Pax
            </p>

            <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-[#123568]">
              {totalPax}
            </p>
          </div>

          <div className="min-w-0 flex-1 border-l border-[#a9bddb] pl-3 text-[10px] text-[#29466f]">
            <p className="whitespace-nowrap">
              Chargeable Pax:{" "}
              <span className="font-semibold text-[#173d78]">
                {chargeablePax}
              </span>
            </p>

            <p className="mt-1.5 whitespace-nowrap">
              Room Occupancy:{" "}
              <span className="font-semibold text-[#173d78]">
                {rooms.length} {rooms.length === 1 ? "Room" : "Rooms"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

    {/* ROOM CONFIGURATION */}
    <div className="overflow-hidden rounded-xl border border-[#ebe5f1] bg-white shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col gap-3 border-b border-[#eee8f3] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#312746]">
            Room Configuration
          </h3>

          <p className="mt-0.5 text-xs text-[#8c8498]">
            Set the number of adults, children and infants for each room
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preserve existing total-room functionality */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#746b80]">
              Total Rooms
            </span>

            <Input
              type="number"
              min={1}
              max={MAX_ROOMS}
              value={targetRoomCount}
              className="h-9 w-16 border-[#e3d8eb] bg-white text-center"
              onChange={(e) => {
                const value = Number(e.target.value);

                const safeValue =
                  Number.isFinite(value) && value > 0 ? value : 1;

                handleTotalRoomsChange(
                  Math.min(safeValue, MAX_ROOMS)
                );
              }}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={targetRoomCount >= MAX_ROOMS}
            onClick={() =>
              handleTotalRoomsChange(targetRoomCount + 1)
            }
            className="h-9 border-[#c93bc4] px-4 text-[#b526b0] hover:bg-[#fff4ff] hover:text-[#9e1999]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Room
          </Button>
        </div>
      </div>

      {/* ROOMS */}
      <div className="divide-y divide-[#eee8f3]">
        {rooms.map((room, idx) => {
          const childDetails = room.childrenDetails || [];

          const occupancyAlertChildIndex =
            getOccupancyAlertChildIndex(room);

          return (
            <div
              key={room.id}
              className="relative px-4 py-4 sm:px-5"
            >
              {/* DELETE */}
              {rooms.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete room ${idx + 1}`}
                  onClick={() =>
                    handleDeleteRoomBlock(room.id)
                  }
                  className="absolute right-3 top-3 h-8 w-8 text-[#ef5a61] hover:bg-[#fff1f1] hover:text-[#dc343d]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              <div className="grid gap-4 pr-9 lg:grid-cols-[95px_minmax(0,1fr)]">
                {/* ROOM NUMBER */}
                <div className="pt-1">
                  <p className="text-sm font-semibold text-[#d227ad]">
                    #Room {idx + 1}
                  </p>
                </div>

                {/* OCCUPANCY CONTROLS */}
                <div className="grid gap-5 md:grid-cols-3">
                  {/* ADULT */}
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#3f3850]">
                        Adult
                      </span>

                      <span className="inline-flex items-center gap-1 text-[10px] text-[#928b9d]">
                        <Info className="h-3 w-3" />
                        Age: Above 11
                      </span>
                    </div>

                    <div className="inline-flex h-8 overflow-hidden rounded-md border border-[#dfe2ec] bg-white">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={room.adults <= 1}
                        className="h-8 w-8 rounded-none px-0 text-[#677085]"
                        onClick={() =>
                          tryUpdateCounts(
                            room,
                            Math.max(room.adults - 1, 1),
                            room.children,
                            room.infants
                          )
                        }
                      >
                        -
                      </Button>

                      <span className="flex min-w-[38px] items-center justify-center border-x border-[#e5e7ef] bg-[#fafbfe] text-sm font-medium text-[#3e4556]">
                        {room.adults}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-8 rounded-none px-0 text-[#66728c]"
                        onClick={() =>
                          tryUpdateCounts(
                            room,
                            room.adults + 1,
                            room.children,
                            room.infants
                          )
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* CHILD */}
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#3f3850]">
                        Child
                      </span>

                      <span className="inline-flex items-center gap-1 text-[10px] text-[#928b9d]">
                        <Info className="h-3 w-3" />
                        Age: 5 to 10
                      </span>
                    </div>

                    <div className="inline-flex h-8 overflow-hidden rounded-md border border-[#dfe2ec] bg-white">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={room.children <= 0}
                        className="h-8 w-8 rounded-none px-0 text-[#677085]"
                        onClick={() =>
                          tryUpdateCounts(
                            room,
                            room.adults,
                            Math.max(room.children - 1, 0),
                            room.infants
                          )
                        }
                      >
                        -
                      </Button>

                      <span className="flex min-w-[38px] items-center justify-center border-x border-[#e5e7ef] bg-[#fafbfe] text-sm font-medium text-[#3e4556]">
                        {room.children}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-8 rounded-none px-0 text-[#66728c]"
                        onClick={() =>
                          tryUpdateCounts(
                            room,
                            room.adults,
                            room.children + 1,
                            room.infants
                          )
                        }
                      >
                        +
                      </Button>
                    </div>

                    {/* CHILD DETAILS */}
                    {childDetails.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {childDetails.map((child, cIdx) => (
                          <div
                            key={`${room.id}-${cIdx}`}
                            className="rounded-md bg-[#faf9fc] p-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                type="number"
                                min={5}
                                max={10}
                                placeholder="Age"
                                value={child.age}
                                onChange={(e) =>
                                  handleChildAgeChange(
                                    room.id,
                                    cIdx,
                                    e.target.value
                                  )
                                }
                                className="h-8 w-[70px] bg-white px-2 text-center text-xs"
                              />

                              <select
                                value={child.bedType}
                                onChange={(e) =>
                                  handleChildBedTypeChange(
                                    room.id,
                                    cIdx,
                                    e.target.value as
                                      | "Without Bed"
                                      | "With Bed"
                                  )
                                }
                                className="h-8 min-w-[115px] rounded-md border border-[#dfe2ec] bg-white px-2 text-xs text-[#514b5e] outline-none"
                              >
                                <option value="Without Bed">
                                  Without Bed
                                </option>

                                <option value="With Bed">
                                  With Bed
                                </option>
                              </select>
                            </div>

                            <p className="mt-1 text-[10px] text-[#8f879a]">
                              Child #{cIdx + 1}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* INFANT */}
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#3f3850]">
                        Infant
                      </span>

                      <span className="inline-flex items-center gap-1 text-[10px] text-[#928b9d]">
                        <Info className="h-3 w-3" />
                        Age: Below 5
                      </span>
                    </div>

                    <div className="inline-flex h-8 overflow-hidden rounded-md border border-[#dfe2ec] bg-white">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={room.infants <= 0}
                        className="h-8 w-8 rounded-none px-0 text-[#677085]"
                        onClick={() =>
                          tryUpdateCounts(
                            room,
                            room.adults,
                            room.children,
                            Math.max(room.infants - 1, 0),
                            { skipValidate: true }
                          )
                        }
                      >
                        -
                      </Button>

                      <span className="flex min-w-[38px] items-center justify-center border-x border-[#e5e7ef] bg-[#fafbfe] text-sm font-medium text-[#3e4556]">
                        {room.infants}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-8 rounded-none px-0 text-[#66728c]"
                        onClick={() =>
                          tryUpdateCounts(
                            room,
                            room.adults,
                            room.children,
                            room.infants + 1
                          )
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* KEEP EXISTING OCCUPANCY ALERT */}
              {occupancyAlertChildIndex >= 0 && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 lg:ml-[95px]">
                  <div className="font-semibold">
                    Occupancy Alert
                  </div>

                  <p className="mt-1">
                    This room has two children aged 5 or above.
                    At least one extra bed is required for the
                    second child.
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        handleAddExtraBedForChild(
                          room.id,
                          occupancyAlertChildIndex
                        )
                      }
                    >
                      Add one extra bed
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 bg-white text-xs"
                      onClick={() =>
                        handleAddAdditionalRoomForChild(
                          room.id,
                          occupancyAlertChildIndex
                        )
                      }
                    >
                      Add additional room
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() =>
                        handleProceedWithoutExtraBed(
                          room.id,
                          occupancyAlertChildIndex
                        )
                      }
                    >
                      Proceed subject to hotel approval
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* EXISTING MAX OCCUPANCY DIALOG */}
    <Dialog
      open={Boolean(maxRoomOccupancyAlertRoom)}
      onOpenChange={(open) => {
        if (!open) {
          setMaxRoomOccupancyAlertRoomId(null);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Maximum room occupancy reached
          </DialogTitle>

          <DialogDescription>
            This room now has 2 adults, 2 children, and 1
            infant. This is the maximum room occupancy
            combination, so booking an additional room is
            recommended.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Adding another room will move one adult and one child
          into the new room, keeping the itinerary safer for
          hotel approval.
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setMaxRoomOccupancyAlertRoomId(null)
            }
          >
            Keep same room
          </Button>

          <Button
            type="button"
            onClick={() => {
              if (maxRoomOccupancyAlertRoom) {
                handleAddAdditionalRoomForMaxOccupancy(
                  maxRoomOccupancyAlertRoom.id
                );
              }
            }}
          >
            Add additional room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
};

