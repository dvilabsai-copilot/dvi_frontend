// FILE: src/pages/CreateItinerary/RoomsBlock.tsx

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { RoomRow } from "./helpers/useRoomsAndTravellers";

type RoomsBlockProps = {
  itineraryPreference: "vehicle" | "hotel" | "both";
  rooms: RoomRow[];
  setRooms: React.Dispatch<React.SetStateAction<RoomRow[]>>;
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
  removeRoom,
}: RoomsBlockProps) => {
  if (!(itineraryPreference === "hotel" || itineraryPreference === "both")) {
    return null;
  }
  const [targetRoomCount, setTargetRoomCount] = useState<number>(rooms.length || 1);

    const totalRooms = rooms.length || 1;


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
    updateRoom(room.id, {
      adults: nextAdults,
      children: nextChildren,
      infants: nextInfants,
    });
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

  // sync roomCount automatically for every room
  useEffect(() => {
    const calculatedTotalRooms = rooms.length || 1;

    if (rooms.some((room) => room.roomCount !== calculatedTotalRooms)) {
      setRooms((prev) =>
        prev.map((room) => ({
          ...room,
          roomCount: calculatedTotalRooms,
        }))
      );
    }
  }, [rooms, setRooms]);

  const handleTotalRoomsChange = (value: number) => {
    if (!Number.isFinite(value) || value < 1) value = 1;
    if (value > MAX_ROOMS) {
      toast({
        title: `Maximum ${MAX_ROOMS} rooms are allowed per search`,
        variant: "destructive",
      });
      value = MAX_ROOMS;
    }

    setRooms((prev) => {
      const current = [...prev];

      if (value === current.length) return current;

      if (value > current.length) {
        let lastId = current.length ? current[current.length - 1].id : 0;
        const toAdd = value - current.length;
        for (let i = 0; i < toAdd; i++) {
          lastId += 1;
        current.push({
            id: lastId,
            adults: 1,
            children: 0,
            infants: 0,
            roomCount: 1,
            childrenDetails: [],
          });
        }
        return current;
      }

      if (value < current.length) {
        current.length = value;
        return current;
      }

      return current;
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
        };
        return { ...room, childrenDetails: nextChildren };
      })
    );
  };

  return (
    <div className="border border-dashed border-[#c985d7] rounded-lg bg-[#fff9ff] p-3">
      {rooms.map((room, idx) => {
        const childDetails = room.childrenDetails || [];

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
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRoom(room.id)}
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
        setTargetRoomCount(Math.min(safeValue, MAX_ROOMS));
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

     
    </div>
  );
};
