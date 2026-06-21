// FILE: src/pages/CreateItinerary/RoomsBlock.tsx

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import type { RoomRow } from "./helpers/useRoomsAndTravellers";

type RoomsBlockProps = {
  itineraryPreference: "vehicle" | "hotel" | "both";
  rooms: RoomRow[];
  setRooms: Dispatch<SetStateAction<RoomRow[]>>;
  addRoom: () => void;
  removeRoom: (id: number) => void;
};

const stayOptions = [
  {
    label: "Comfort",
    description: "Balanced options for a pleasant stay",
    icon: "✦",
  },
  {
    label: "Standard",
    description: "Budget-friendly comfortable stays",
    icon: "☆",
  },
  {
    label: "Luxury",
    description: "Premium stays with top amenities",
    icon: "♕",
  },
];

export const RoomsBlock = ({
  itineraryPreference,
  rooms,
  setRooms,
}: RoomsBlockProps) => {
  const [stayPreference, setStayPreference] = useState<"Comfort" | "Standard" | "Luxury">("Comfort");

  const shouldShowRoomsBlock =
    itineraryPreference === "hotel" || itineraryPreference === "both";

  useEffect(() => {
    setRooms((prev) => {
      if (!Array.isArray(prev) || prev.length !== 1) return prev;

      const room = prev[0];
      const isInitialDefaultRoom =
        Number(room.id) === 1 &&
        Number(room.adults) === 1 &&
        Number(room.children || 0) === 0 &&
        Number(room.infants || 0) === 0 &&
        Number(room.roomCount || 1) === 1;

      if (!isInitialDefaultRoom) return prev;

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

  useEffect(() => {
    setRooms((prev) => {
      let changed = false;

      const next = prev.map((room) => {
        const existing = Array.isArray(room.childrenDetails)
          ? room.childrenDetails
          : [];
        const desired = Number(room.children || 0);

        if (existing.length === desired) return room;

        changed = true;

        if (existing.length < desired) {
          const nextChildren = [...existing];

          while (nextChildren.length < desired) {
            nextChildren.push({ age: "", bedType: "Without Bed" });
          }

          return { ...room, childrenDetails: nextChildren };
        }

        return { ...room, childrenDetails: existing.slice(0, desired) };
      });

      return changed ? next : prev;
    });
  }, [rooms, setRooms]);

  if (!shouldShowRoomsBlock) return null;

  const totalAdults = rooms.reduce(
    (sum, room) => sum + Number(room.adults || 0),
    0,
  );
  const totalChildren = rooms.reduce(
    (sum, room) => sum + Number(room.children || 0),
    0,
  );
  const totalInfants = rooms.reduce(
    (sum, room) => sum + Number(room.infants || 0),
    0,
  );

  const childAgeFields = rooms.flatMap((room, roomIndex) =>
    (room.childrenDetails || []).map((child, childIndex) => ({
      key: `child-${room.id}-${childIndex}`,
      label: `Room ${roomIndex + 1} Child ${childIndex + 1} Age`,
      value: child.age || "",
    })),
  );

  const infantAgeFields = rooms.flatMap((room, roomIndex) =>
    Array.from({ length: Number(room.infants || 0) }).map((_, infantIndex) => ({
      key: `infant-${room.id}-${infantIndex}`,
      label: `Room ${roomIndex + 1} Infant ${infantIndex + 1} Age`,
      value: "",
    })),
  );

  const ageFields = [...childAgeFields, ...infantAgeFields];

  return (
    <div className="rounded-xl border border-[#eee6fb] bg-white p-3">
      <h2 className="mb-3 text-sm font-bold text-[#231942]">
        Stay Preferences & Occupancy Details
      </h2>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_230px]">
        <div>
          <p className="mb-2 text-[11px] font-semibold text-[#231942]">
            Stay Preference <span className="text-red-500">*</span>
          </p>

          <div className="grid grid-cols-3 gap-2">
            {stayOptions.map((item) => {
              const active = stayPreference === item.label;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
  setStayPreference(item.label as "Comfort" | "Standard" | "Luxury");

  setRooms((prev) =>
    prev.map((room) => ({
      ...room,
      stayPreference: item.label,
    }))
  );
}}
                  className={`relative min-h-[94px] rounded-lg border px-2 py-3 text-center transition ${
                    active
                      ? "border-[#6d28d9] bg-[#faf7ff]"
                      : "border-[#eee6fb] bg-white"
                  }`}
                >
                  {active && (
                    <span className="absolute -left-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#4f16e8] text-[10px] text-white">
                      ✓
                    </span>
                  )}

                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#efe7ff] text-[#6d28d9]">
                    {item.icon}
                  </div>
                  <div className="text-[11px] font-bold text-[#4f16e8]">
                    {item.label}
                  </div>
                  <div className="mt-1 text-[9px] font-medium leading-tight text-[#7b728d]">
                    {item.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-l border-[#eee6fb] pl-4">
          <p className="mb-2 text-[11px] font-semibold text-[#231942]">
            Occupancy Details (Per Room) <span className="text-red-500">*</span>
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold text-[#231942]">
                Number of Rooms
              </p>
              <Input
               value={rooms[0]?.roomCount || rooms.length || 1}
                readOnly
                className="h-8 text-[11px]"
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold text-[#231942]">
                Adults (12+ Years)
              </p>
              <Input value={totalAdults} readOnly className="h-8 text-[11px]" />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold text-[#231942]">
                Children (5 - 11 Years)
              </p>
              <Input
                value={totalChildren}
                readOnly
                className="h-8 text-[11px]"
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold text-[#231942]">
                Infants (0 - 4 Years)
              </p>
              <Input
                value={totalInfants}
                readOnly
                className="h-8 text-[11px]"
              />
            </div>
          </div>
        </div>

        <div className="border-l border-[#eee6fb] pl-4">
          <p className="mb-2 text-[11px] font-semibold text-[#231942]">Ages</p>

          <div className="grid grid-cols-2 gap-2">
            {ageFields.length > 0 ? (
              ageFields.map((item) => (
                <div key={item.key}>
                  <p className="mb-1 text-[9px] font-semibold text-[#231942]">
                    {item.label}
                  </p>
                  <Input
                    value={item.value}
                    readOnly
                    className="h-8 text-[11px]"
                  />
                </div>
              ))
            ) : (
              <p className="col-span-2 text-[11px] text-[#7b728d]">
                No child/infant ages added
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-[#fbf8ff] px-3 py-2 text-[11px] text-[#6b647a]">
        {rooms.map((room, index) => (
          <span key={room.id}>
            ⓘ Room {index + 1}: {room.adults} Adults, {room.children} Child,{" "}
            {room.infants} Infant
          </span>
        ))}
      </div>
    </div>
  );
};
