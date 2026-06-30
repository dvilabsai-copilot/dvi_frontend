// FILE: src/pages/CreateItinerary/useRoomsAndTravellers.ts

import { useState } from "react";

export type ChildDetail = {
  age: number | "";
  bedType: "Without Bed" | "With Bed";
  hotelApprovalAccepted?: boolean;
};

export type RoomRow = {
  id: number;
  roomCount: number;
  adults: number;
  children: number;
  infants: number;
  childrenDetails: ChildDetail[];
};

export type TravellersResult = {
  totalAdults: number;
  totalChildren: number;
  totalInfants: number;
  travellerRows: {
    room_id: number;
    traveller_type: 1 | 2 | 3;
    traveller_age?: string;
    child_bed_type?: number;
    child_extra_bed_hotel_approval_required?: number;
  }[];
};

function mapChildBedTypeToApiValue(bedType: string | undefined): number {
  if (bedType === "With Bed") {
    return 2;
  }

  if (bedType === "Without Bed") {
    return 1;
  }

  return 0;
}

function isChildAgeFiveOrAbove(age: number | ""): boolean {
  if (age === "") {
    return true;
  }

  const numericAge = Number(age);
  return Number.isFinite(numericAge) && numericAge >= 5;
}

export function getUnresolvedChildExtraBedOccupancyRooms(
  rooms: RoomRow[]
): number[] {
  const unresolvedRoomIds: number[] = [];

  for (const room of rooms || []) {
    const eligibleChildren = (room.childrenDetails || [])
      .map((child, index) => ({ child, index }))
      .filter(({ child }) => isChildAgeFiveOrAbove(child.age));

    if (eligibleChildren.length < 2) {
      continue;
    }

    const hasUnresolvedSecondChild = eligibleChildren
      .slice(1)
      .some(({ child }) => {
        const hasExtraBed = child.bedType === "With Bed";
        const hasHotelApproval = child.hotelApprovalAccepted === true;
        return !hasExtraBed && !hasHotelApproval;
      });

    if (hasUnresolvedSecondChild) {
      unresolvedRoomIds.push(room.id);
    }
  }

  return unresolvedRoomIds;
}

export function useRoomsAndTravellers() {
  const [rooms, setRooms] = useState<RoomRow[]>([
    {
      id: 1,
      roomCount: 1,
      adults: 1,
      children: 0,
      infants: 0,
      childrenDetails: [],
    },
  ]);

  const addRoom = () => {
    setRooms((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: last.id + 1,
          roomCount: 1,
          adults: 1,
          children: 0,
          infants: 0,
          childrenDetails: [],
        },
      ];
    });
  };

  const removeRoom = (idToRemove: number) => {
    setRooms((prev) => prev.filter((r) => r.id !== idToRemove));
  };

  const buildTravellers = (): TravellersResult => {
    let totalAdults = 0;
    let totalChildren = 0;
    let totalInfants = 0;

    const travellerRows: TravellersResult["travellerRows"] = [];

    for (const room of rooms) {
      const adults = room.adults ?? 0;
      const children = room.children ?? 0;
      const infants = room.infants ?? 0;

      totalAdults += adults;
      totalChildren += children;
      totalInfants += infants;

      for (let i = 0; i < adults; i++) {
        travellerRows.push({
          room_id: room.id,
          traveller_type: 1,
        });
      }

      for (let i = 0; i < children; i++) {
        const childInfo = room.childrenDetails?.[i];

        travellerRows.push({
          room_id: room.id,
          traveller_type: 2,
          traveller_age:
            childInfo && childInfo.age !== ""
              ? String(childInfo.age)
              : undefined,
          child_bed_type: mapChildBedTypeToApiValue(childInfo?.bedType),
          child_extra_bed_hotel_approval_required:
            childInfo?.hotelApprovalAccepted === true ? 1 : 0,
        });
      }

      for (let i = 0; i < infants; i++) {
        travellerRows.push({
          room_id: room.id,
          traveller_type: 3,
        });
      }
    }

    return {
      totalAdults,
      totalChildren,
      totalInfants,
      travellerRows,
    };
  };

  return {
    rooms,
    setRooms,
    addRoom,
    removeRoom,
    buildTravellers,
  };
}