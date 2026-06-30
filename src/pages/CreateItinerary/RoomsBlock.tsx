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
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { ChildDetail, RoomRow } from "./helpers/useRoomsAndTravellers";

type RoomsBlockProps = {
  itineraryPreference: "vehicle" | "hotel" | "both";
  rooms: RoomRow[];
setRooms: Dispatch<SetStateAction<RoomRow[]>>;
  addRoom: () => void;
  removeRoom: (id: number) => void;
};

// exact combinations from PHP `validCombinations`
const VALID_COMBINATIONS: Array<{ adult: number; child: number; infant: number }> = [
  { adult: 1, child: 0, infant: 0 },
  { adult: 1, child: 0, infant: 1 },
  { adult: 1, child: 0, infant: 2 },
  { adult: 1, child: 0, infant: 3 },
  { adult: 1, child: 0, infant: 4 },
  { adult: 1, child: 1, infant: 0 },
  { adult: 1, child: 1, infant: 1 },
  { adult: 1, child: 1, infant: 2 },
  { adult: 1, child: 1, infant: 3 },
  { adult: 1, child: 2, infant: 0 },
  { adult: 1, child: 2, infant: 1 },
  { adult: 1, child: 2, infant: 2 },
  { adult: 2, child: 0, infant: 0 },
  { adult: 2, child: 0, infant: 1 },
  { adult: 2, child: 0, infant: 2 },
  { adult: 2, child: 0, infant: 3 },
  { adult: 2, child: 1, infant: 0 },
  { adult: 2, child: 1, infant: 1 },
  { adult: 2, child: 1, infant: 2 },
  { adult: 2, child: 2, infant: 0 },
  { adult: 2, child: 2, infant: 1 },
  { adult: 3, child: 0, infant: 0 },
  { adult: 3, child: 0, infant: 1 },
  { adult: 3, child: 0, infant: 2 },
  { adult: 3, child: 1, infant: 0 },
  { adult: 3, child: 1, infant: 1 },
  { adult: 3, child: 2, infant: 0 },
];

const MAX_ADULTS_PER_ROOM = 3;
const MAX_ROOMS = 6;

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

      const ok = VALID_COMBINATIONS.some(
        (c) =>
          c.adult === adult && c.child === child && c.infant === infant
      );

      if (ok) return true;

      toast({
        title: "Reached the maximum of allowed room counts",
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

  if (!shouldShowRoomsBlock) {
  return null;
}

return (
  <div className="border border-dashed border-[#c985d7] rounded-lg bg-[#fff9ff] p-3">
      {rooms.map((room, idx) => {
        const childDetails = room.childrenDetails || [];
        const occupancyAlertChildIndex = getOccupancyAlertChildIndex(room);

        return (
          <div
            key={room.id}
            className={idx > 0 ? "mt-3 pt-3 border-t border-[#ead1f2]" : ""}
          >
            {/* header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-[#4a4260] mb-0">
                  #Room {idx + 1}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#4a4260]">
                  <span className="flex items-center gap-1">
                    [ Adult{" "}
                    <span className="text-[#6c6f82] flex items-center gap-1">
                      <i className="ti ti-info-circle ms-1" />
                      <small>Age: Above 11,</small>
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    Child{" "}
                    <span className="text-[#6c6f82] flex items-center gap-1">
                      <i className="ti ti-info-circle ms-1" />
                      <small>Age: 5 to 10,</small>
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    Infant{" "}
                    <span className="text-[#6c6f82] flex items-center gap-1">
                      <i className="ti ti-info-circle ms-1" />
                      <small>Age: Below 5</small>
                    </span>{" "}
                    ]
                  </span>
                </div>
              </div>

{rooms.length > 1 && (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    onClick={() => handleDeleteRoomBlock(room.id)}
    className="h-7 w-7 text-[#d03265]"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
)}
            </div>

           {/* counters row */}
<div className="flex flex-wrap items-center gap-4 mb-2">
  {/* Adults */}
  <div className="flex flex-col items-start gap-1">
    <div className="flex items-center border rounded-md bg-white">
      <Button
        type="button"
        variant="ghost"
        className="h-7 px-2"
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
<span className="px-3 text-sm select-none">
  {room.adults}
</span>
      <Button
        type="button"
        variant="ghost"
        className="h-7 px-2"
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

  {/* Children */}
<div className="flex flex-col items-start shrink-0">
  {room.children === 0 ? (
    <Button
      type="button"
      variant="outline"
      className="h-7 text-xs border-[#d39ce8] whitespace-nowrap"
      onClick={() =>
        tryUpdateCounts(
          room,
          room.adults,
          1,
          room.infants
        )
      }
    >
      + Add Child
    </Button>
  ) : (
    <div className="flex items-center border rounded-md bg-white">
      <Button
        type="button"
        variant="ghost"
        className="h-7 px-2"
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

      <span className="px-3 text-sm select-none">
        {room.children}
      </span>

      <Button
        type="button"
        variant="ghost"
        className="h-7 px-2"
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
  )}
</div>
  {/* Infant */}
  <div className="flex flex-col items-start gap-1">
    {room.infants === 0 ? (
      <Button
        type="button"
        variant="outline"
        className="h-7 text-xs border-[#d39ce8]"
        onClick={() =>
          tryUpdateCounts(room, room.adults, room.children, 1)
        }
      >
        + Add Infant
      </Button>
    ) : (
      <div className="flex items-center border rounded-md bg-white">
        <Button
          type="button"
          variant="ghost"
          className="h-7 px-2"
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
        <span className="px-3 text-sm select-none">
          {room.infants}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="h-7 px-2"
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
    )}
  </div>

  {/* Child age + bed type */}
  {childDetails.length > 0 && childDetails.map((child, cIdx) => (
    <div
      key={`${room.id}-${cIdx}`}
      className="flex items-center gap-2"
    >
      <span className="text-[11px] text-[#4a4260] whitespace-nowrap">
        Child #{cIdx + 1}
      </span>

      <Input
        type="number"
        min={5}
        max={10}
        placeholder="Age 5-10"
        value={child.age}
        onChange={(e) =>
          handleChildAgeChange(
            room.id,
            cIdx,
            e.target.value
          )
        }
        className="w-[80px] h-8 text-center px-1 py-1 bg-white"
      />

      <select
        className="h-8 text-xs border border-[#dee0ee] rounded px-2 bg-white"
        value={child.bedType}
        onChange={(e) =>
          handleChildBedTypeChange(
            room.id,
            cIdx,
            e.target.value as "Without Bed" | "With Bed"
          )
        }
      >
        <option value="Without Bed">Without Bed</option>
        <option value="With Bed">With Bed</option>
      </select>
    </div>
  ))}


  {occupancyAlertChildIndex >= 0 && (
    <div className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <div className="font-semibold">Occupancy Alert</div>

      <p className="mt-1">
        This room has two children aged 5 or above. At least one extra bed is
        required for the second child.
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            handleAddExtraBedForChild(room.id, occupancyAlertChildIndex)
          }
        >
          Add one extra bed
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs bg-white"
          onClick={() =>
            handleAddAdditionalRoomForChild(room.id, occupancyAlertChildIndex)
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
            handleProceedWithoutExtraBed(room.id, occupancyAlertChildIndex)
          }
        >
          Proceed subject to hotel approval
        </Button>
      </div>
    </div>
  )}
        {/* Total Rooms */}
<div className="flex items-center gap-2">
  <span className="text-xs text-muted-foreground">Total</span>

 <Input
  type="number"
  min={1}
  max={MAX_ROOMS}
  className="w-16 h-8 bg-white"
  value={targetRoomCount}
  onChange={(e) => {
    const value = Number(e.target.value);
    const safeValue = Number.isFinite(value) && value > 0 ? value : 1;
    const nextRoomCount = Math.min(safeValue, MAX_ROOMS);

    handleTotalRoomsChange(nextRoomCount);
  }}
/>

  <Button
    type="button"
    variant="link"
    className="h-8 px-0 text-primary"
    onClick={() => handleTotalRoomsChange(targetRoomCount)}
  >
    <span className="inline-flex items-center text-sm">
      <span className="mr-1">+</span> Add Rooms
    </span>
  </Button>
</div>
</div>
</div>
  );
    })}

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
        <DialogTitle>Maximum room occupancy reached</DialogTitle>
        <DialogDescription>
          This room now has 2 adults, 2 children, and 1 infant. This is the
          maximum room occupancy combination, so booking an additional room is
          recommended.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Adding another room will move one adult and one child into the new room,
        keeping the itinerary safer for hotel approval.
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setMaxRoomOccupancyAlertRoomId(null)}
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

