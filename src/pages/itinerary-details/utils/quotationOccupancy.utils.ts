export interface QuotationOccupancy {
  adults: number;
  children: number;
  childrenAges: number[];
}

const DEFAULT_TBO_CHILD_AGE = 5;

export const buildTboOccupancies = (
  roomCount: number,
  totalAdults: number,
  childAges: number[],
): QuotationOccupancy[] => {
const rooms = Math.max(Number(roomCount) || 1, 1);

if (rooms > 6) {
  if (
    !Number.isSafeInteger(roomCount) ||
    rooms > 25 ||
    !Number.isSafeInteger(totalAdults) ||
    totalAdults < rooms ||
    totalAdults > rooms * 8 ||
    !Array.isArray(childAges) ||
    childAges.length > rooms * 4 ||
    childAges.some(
      (age) => !Number.isSafeInteger(age) || age < 0 || age > 11
    )
  ) {
    throw new Error(
      "Invalid TBO multi-batch occupancy. Check room count, " +
      "adult count, child ages and per-room supplier limits."
    );
  }
}

const occupancies = Array.from({ length: rooms }, () => ({
  adults: 1,
  children: 0,
  childrenAges: [] as number[],
}));

  let adultsLeft = Math.max(totalAdults - rooms, 0);
  let roomIndex = 0;
  while (adultsLeft > 0) {
    let assigned = false;
    for (let offset = 0; offset < rooms; offset++) {
      const idx = (roomIndex + offset) % rooms;
      if (occupancies[idx].adults < 8) {
        occupancies[idx].adults += 1;
        adultsLeft -= 1;
        roomIndex = (idx + 1) % rooms;
        assigned = true;
        break;
      }
    }
    if (!assigned) break;
  }

  for (const age of childAges) {
    let assigned = false;
    for (let offset = 0; offset < rooms; offset++) {
      const idx = (roomIndex + offset) % rooms;
      if (occupancies[idx].children < 4) {
        occupancies[idx].children += 1;
        occupancies[idx].childrenAges.push(age);
        roomIndex = (idx + 1) % rooms;
        assigned = true;
        break;
      }
    }
    if (!assigned) break;
  }

  return occupancies;
};

export const resolveTboHoldOccupancy = (
  roomCount: number,
  totalAdults: number,
  totalChildren: number,
  template: QuotationOccupancy[] | null,
): { occupancies: QuotationOccupancy[]; childAges: number[] } => {
const rooms = Math.max(Number(roomCount) || 1, 1);
const adults = Math.max(Number(totalAdults) || 1, 1);
const children = Math.max(Number(totalChildren) || 0, 0);

if (rooms > 6) {
  if (
    !Number.isSafeInteger(roomCount) ||
    rooms > 25 ||
    !Number.isSafeInteger(totalAdults) ||
    totalAdults < rooms ||
    totalAdults > rooms * 8 ||
    !Number.isSafeInteger(totalChildren) ||
    totalChildren < 0 ||
    totalChildren > rooms * 4
  ) {
    throw new Error(
      "Invalid TBO multi-batch room or traveller count."
    );
  }

  if (!template || template.length !== rooms) {
    throw new Error(
      "Complete room-wise traveller occupancy is required " +
      "for TBO bookings above 6 rooms."
    );
  }

  const hasInvalidChildAges = template.some(
    (occupancy) =>
      !Array.isArray(occupancy.childrenAges) ||
      occupancy.childrenAges.length !== Number(occupancy.children) ||
      occupancy.childrenAges.some(
        (age) =>
          !Number.isSafeInteger(age) ||
          age < 0 ||
          age > 11
      )
  );

  if (hasInvalidChildAges) {
    throw new Error(
      "Every child must have a valid actual age " +
      "assigned to the correct room."
    );
  }
}

if (template && template.length > 0) {
    const occupancies = template.map((occupancy) => ({
      adults: Number(occupancy.adults),
      children: Number(occupancy.children),
   childrenAges: rooms > 6
  ? [...occupancy.childrenAges]
  : Array.from({ length: Number(occupancy.children) }, (_, index) => (
      index < (occupancy.childrenAges || []).length
        ? Number(occupancy.childrenAges[index])
        : DEFAULT_TBO_CHILD_AGE
    )),
    }));
    const adultTotal = occupancies.reduce((sum, occupancy) => sum + occupancy.adults, 0);
    const childTotal = occupancies.reduce((sum, occupancy) => sum + occupancy.children, 0);
    const childAges = occupancies.flatMap((occupancy) => occupancy.childrenAges);
    const hasInvalidRooming = occupancies.some((occupancy) => (
      !Number.isInteger(occupancy.adults)
      || occupancy.adults < 1
    || !Number.isInteger(occupancy.children)
|| occupancy.children < 0
|| (
  rooms > 6 &&
  (occupancy.adults > 8 || occupancy.children > 4)
)
|| occupancy.childrenAges.length !== occupancy.children
|| occupancy.childrenAges.some((age) => !Number.isInteger(age) || age < 0 || age > 11)
    ));

    if (occupancies.length !== rooms || adultTotal !== adults || childTotal !== children || hasInvalidRooming) {
      throw new Error("Saved traveller rooming does not match the current hotel guest counts. Refresh the itinerary before holding this hotel.");
    }

    return { occupancies, childAges };
  }

  const childAges = Array.from({ length: children }, () => DEFAULT_TBO_CHILD_AGE);
  return { occupancies: buildTboOccupancies(rooms, adults, childAges), childAges };
};

export const buildSupplierOccupancies = (
  roomCount: number,
  totalAdults: number,
  totalChildren: number,
  childAges: number[] = [],
): QuotationOccupancy[] => {
  const rooms = Math.max(Number(roomCount) || 1, 1);

  if (rooms > 6) {
    if (
      !Number.isSafeInteger(roomCount) ||
      rooms > 25 ||
      !Number.isSafeInteger(totalAdults) ||
      totalAdults < rooms ||
      totalAdults > rooms * 8 ||
      !Number.isSafeInteger(totalChildren) ||
      totalChildren < 0 ||
      totalChildren > rooms * 4 ||
      !Array.isArray(childAges) ||
      childAges.length !== totalChildren ||
      childAges.some(
        (age) => !Number.isSafeInteger(age) || age < 0 || age > 11
      )
    ) {
      throw new Error(
        "Invalid TBO multi-batch occupancy. Verify adults, children, room count and actual child ages."
      );
    }
  }

  if (childAges.length > 0) {
    return buildTboOccupancies(roomCount, totalAdults, childAges);
  }

  const occupancies = Array.from({ length: rooms }, () => ({
    adults: 1,
    children: 0,
    childrenAges: [] as number[],
  }));

  let adultsLeft = Math.max(totalAdults - rooms, 0);
  let roomIndex = 0;
  while (adultsLeft > 0) {
    let assigned = false;
    for (let offset = 0; offset < rooms; offset++) {
      const idx = (roomIndex + offset) % rooms;
      if (occupancies[idx].adults < 8) {
        occupancies[idx].adults += 1;
        adultsLeft -= 1;
        roomIndex = (idx + 1) % rooms;
        assigned = true;
        break;
      }
    }
    if (!assigned) break;
  }

  let childrenLeft = Math.max(totalChildren, 0);
  let nextChildRoom = 0;
  while (childrenLeft > 0) {
    let assigned = false;
    for (let offset = 0; offset < rooms; offset++) {
      const idx = (nextChildRoom + offset) % rooms;
      if (occupancies[idx].children < 4) {
        occupancies[idx].children += 1;
        occupancies[idx].childrenAges.push(7);
        childrenLeft -= 1;
        nextChildRoom = (idx + 1) % rooms;
        assigned = true;
        break;
      }
    }
    if (!assigned) break;
  }

  return occupancies;
};

export const buildOccupanciesFromTravellers = (
  travellers: Array<Record<string, unknown>>,
  fallbackRooms: number,
): QuotationOccupancy[] => {
  const rooms = Math.max(Number(fallbackRooms) || 1, 1);
  const byRoom = new Map<number, QuotationOccupancy>();

  for (const traveller of Array.isArray(travellers) ? travellers : []) {
    const roomIdRaw = Number(traveller.room_id ?? traveller.roomId ?? 1);
    const roomId = Number.isFinite(roomIdRaw) && roomIdRaw > 0 ? roomIdRaw : 1;
    const paxType = Number(traveller.traveller_type ?? traveller.travellerType ?? 0);
    const rawAge = traveller.traveller_age ?? traveller.travellerAge;
    const ageText = String(rawAge ?? '').trim();
    const age = ageText === '' ? Number.NaN : Number(rawAge);

    if (!byRoom.has(roomId)) byRoom.set(roomId, { adults: 0, children: 0, childrenAges: [] });
    const occupancy = byRoom.get(roomId)!;
    if (paxType === 1) {
      occupancy.adults += 1;
    } else if (paxType === 2) {
      occupancy.children += 1;
      if (Number.isFinite(age) && age >= 0 && age <= 11) occupancy.childrenAges.push(Math.trunc(age));
    }
  }

  if (rooms > 6) {
    if (!Number.isSafeInteger(fallbackRooms) || rooms > 25) {
      throw new Error(
        "TBO multi-batch room count must be between 7 and 25."
      );
    }

    const hasInvalidRoomId = Array.from(byRoom.keys()).some(
      (roomId) =>
        !Number.isSafeInteger(roomId) ||
        roomId < 1 ||
        roomId > rooms
    );

    if (hasInvalidRoomId) {
      throw new Error(
        "Traveller room assignments must match the requested rooms."
      );
    }

    for (let roomId = 1; roomId <= rooms; roomId++) {
      const occupancy = byRoom.get(roomId);

      if (
        !occupancy ||
        occupancy.adults < 1 ||
        occupancy.adults > 8 ||
        occupancy.children < 0 ||
        occupancy.children > 4 ||
        occupancy.childrenAges.length !== occupancy.children ||
        occupancy.childrenAges.some(
          (age) =>
            !Number.isSafeInteger(age) ||
            age < 0 ||
            age > 11
        )
      ) {
        throw new Error(
          `Invalid traveller allocation for room ${roomId}. Check adults and actual child ages.`
        );
      }
    }
  }

  const maxRoomId = Math.max(rooms, ...Array.from(byRoom.keys()), 1);
  return Array.from({ length: maxRoomId }, (_, idx) => {
    const occupancy = byRoom.get(idx + 1) || { adults: 0, children: 0, childrenAges: [] };
    return {
      adults: Math.max(occupancy.adults, 1),
      children: Math.max(occupancy.children, 0),
      childrenAges: occupancy.childrenAges.slice(0, occupancy.children),
    };
  });
};

export const applyChildAgesToTemplate = (
  template: QuotationOccupancy[],
  childAges: number[],
): QuotationOccupancy[] => {
  if (template.length > 6) {
    if (template.length > 25) {
      throw new Error("Maximum 25 rooms are supported.");
    }

    const hasInvalidRooming = template.some(
      (occupancy) =>
        !Number.isSafeInteger(occupancy.adults) ||
        occupancy.adults < 1 ||
        occupancy.adults > 8 ||
        !Number.isSafeInteger(occupancy.children) ||
        occupancy.children < 0 ||
        occupancy.children > 4 ||
        !Array.isArray(occupancy.childrenAges) ||
        occupancy.childrenAges.length !== occupancy.children ||
        occupancy.childrenAges.some(
          (age) =>
            !Number.isSafeInteger(age) ||
            age < 0 ||
            age > 11
        )
    );

    if (hasInvalidRooming) {
      throw new Error(
        "Complete room-wise traveller ages are required for TBO multi-batch booking."
      );
    }

    const savedAges = template.flatMap(
      (occupancy) => occupancy.childrenAges
    );

    if (
      childAges.length > 0 &&
      (
        childAges.length !== savedAges.length ||
        childAges.some((age, index) => age !== savedAges[index])
      )
    ) {
      throw new Error(
        "Child ages have changed. Update the room-wise traveller details before booking."
      );
    }

    return template.map((occupancy) => ({
      adults: occupancy.adults,
      children: occupancy.children,
      childrenAges: [...occupancy.childrenAges],
    }));
  }

  const agesPool = [...childAges];
  return template.map((occupancy) => {
    const ages: number[] = [];
    for (let i = 0; i < Math.max(occupancy.children, 0); i++) {
      const nextAge = agesPool.length > 0 ? Number(agesPool.shift()) : Number(occupancy.childrenAges?.[i]);
      ages.push(Number.isFinite(nextAge) && nextAge >= 0 && nextAge <= 11 ? Math.trunc(nextAge) : 7);
    }
    return {
      adults: Math.max(Number(occupancy.adults || 1), 1),
      children: Math.max(Number(occupancy.children || 0), 0),
      childrenAges: ages,
    };
  });
};
