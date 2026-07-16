type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

const readValue = (value: unknown, ...keys: string[]): unknown => {
  const record = asRecord(value);
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
};

export const resolveConfirmNationality = (
  plan: unknown,
  fallbackNationality = 'IN',
): string => {
  const explicitIso2 = String(
    readValue(plan, 'nationality_iso2', 'nationality_shortname', 'guestNationality') || '',
  )
    .trim()
    .toUpperCase();
  if (/^[A-Z]{2}$/.test(explicitIso2)) return explicitIso2;

  const rawNationality = readValue(plan, 'nationality');
  if (typeof rawNationality === 'string' && /^[A-Z]{2}$/i.test(rawNationality.trim())) {
    return rawNationality.trim().toUpperCase();
  }

  const legacyMap: Record<number, string> = {
    284: 'AE',
    229: 'NO',
    101: 'IN',
    177: 'IN',
  };
  const mapped = legacyMap[Number(rawNationality || 0)];
  const fallback = String(fallbackNationality || 'IN').trim().toUpperCase();
  return mapped || (/^[A-Z]{2}$/.test(fallback) ? fallback : 'IN');
};

export const buildOccupancyPreview = (
  roomCount: number,
  totalAdults: number,
  totalChildren: number,
): Array<{ adults: number; children: number }> => {
  const rooms = Math.max(Number(roomCount) || 1, 1);
  const occupancies = Array.from({ length: rooms }, () => ({ adults: 1, children: 0 }));

  let adultsLeft = Math.max(totalAdults - rooms, 0);
  let roomIndex = 0;
  while (adultsLeft > 0) {
    if (occupancies[roomIndex].adults < 8) {
      occupancies[roomIndex].adults += 1;
      adultsLeft -= 1;
    }
    roomIndex = (roomIndex + 1) % rooms;
  }

  let childrenLeft = Math.max(totalChildren, 0);
  let nextChildRoom = 0;
  while (childrenLeft > 0) {
    let assigned = false;
    for (let offset = 0; offset < rooms; offset++) {
      const idx = (nextChildRoom + offset) % rooms;
      if (occupancies[idx].children < 4) {
        occupancies[idx].children += 1;
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

export const getSafeErrorMessage = (error: unknown, fallback: string): string => {
  const message = readValue(error, 'message');
  const text = String(message || fallback);
  if (/session expired|stale|availability changed|booking code invalid|price changed/i.test(text)) {
    return 'This hotel session has expired or rates changed. Please refresh hotel selection and run prebook again.';
  }
  return text;
};

export const normalizePrebookItems = (value: unknown): string[] => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      if (typeof item === 'string') return item;
      return readValue(item, 'name', 'text', 'description') || JSON.stringify(item);
    })
    .map((text) => String(text || '').trim())
    .filter(Boolean);
};

export const resolvePrebookInclusions = (hotel: unknown): string[] => {
  const hotelRecord = asRecord(hotel);
  const candidateLists: unknown[] = [
    hotelRecord.inclusions,
    hotelRecord.Inclusions,
    hotelRecord.inclusion,
    hotelRecord.Inclusion,
    hotelRecord.facilities,
    hotelRecord.Facilities,
  ];
  for (const rooms of [hotelRecord.rooms, hotelRecord.Rooms]) {
    const room = Array.isArray(rooms) ? rooms[0] : undefined;
    candidateLists.push(readValue(room, 'inclusion'), readValue(room, 'Inclusion'));
  }
  const merged = candidateLists.flatMap((value) => normalizePrebookItems(value));
  return Array.from(new Set(merged.map((item) => String(item || '').trim()).filter(Boolean)));
};

export const resolvePrebookMealPlan = (hotel: unknown): string => {
  const hotelRecord = asRecord(hotel);
  const room = hotelRecord.room;
  const legacyRoom = hotelRecord.Room;
  const firstRoom = Array.isArray(hotelRecord.rooms) ? hotelRecord.rooms[0] : undefined;
  const legacyFirstRoom = Array.isArray(hotelRecord.Rooms) ? hotelRecord.Rooms[0] : undefined;
  const directValues = [
    hotelRecord.mealPlan,
    hotelRecord.MealPlan,
    hotelRecord.mealType,
    hotelRecord.MealType,
    hotelRecord.meal_type,
    hotelRecord.mealTypeName,
    hotelRecord.MealTypeName,
    hotelRecord.boardType,
    hotelRecord.BoardType,
    hotelRecord.boardBasis,
    hotelRecord.BoardBasis,
    readValue(room, 'mealType'),
    readValue(room, 'MealType'),
    readValue(legacyRoom, 'mealType'),
    readValue(legacyRoom, 'MealType'),
    readValue(firstRoom, 'mealType', 'MealType', 'boardBasis'),
    readValue(legacyFirstRoom, 'mealType', 'MealType', 'boardBasis'),
  ];
  for (const value of directValues) {
    const text = String(value || '').trim();
    if (text) return text;
  }

  const inclusionText = resolvePrebookInclusions(hotel).join(' ').toLowerCase();
  if (inclusionText.includes('full board')) return 'Full Board';
  if (inclusionText.includes('half board')) return 'Half Board';
  if (inclusionText.includes('room only') || inclusionText.includes('no meals')) return 'Room Only';
  if (inclusionText.includes('breakfast')) return 'Breakfast Included';
  return '';
};

export const normalizeCancellationPolicyItems = (value: unknown): string[] => {
  if (!value) return [];

  const chargeLabel = (chargeType: unknown, amount: unknown): string => {
    const normalizedType = String(chargeType || '').toLowerCase();
    const num = Number(amount);
    const safeAmount = Number.isFinite(num) ? num : amount;
    if (normalizedType === 'percentage' || normalizedType === '2') return `${safeAmount}%`;
    if (normalizedType === 'fixed' || normalizedType === '1') return `INR ${safeAmount}`;
    return String(safeAmount);
  };

  const formatEntry = (item: unknown): string => {
    if (!item) return '';
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) return '';
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed: unknown = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.map(formatEntry).filter(Boolean).join('\n');
          return formatEntry(parsed);
        } catch {
          return trimmed;
        }
      }
      if (trimmed.includes('#^#') || trimmed.includes('#!#')) {
        return trimmed.replace(/#\^#|#!#/g, '').split('|').map((part) => part.trim()).filter(Boolean).join('\n');
      }
      return trimmed;
    }

    const fromDate = readValue(item, 'FromDate', 'fromDate', 'startDate') || '-';
    const chargeType = readValue(item, 'ChargeType', 'chargeType') || '-';
    const cancellationCharge = readValue(item, 'CancellationCharge', 'cancellationCharge', 'Charge', 'charge') ?? '-';
    return `From ${fromDate} | ${chargeType} | Charge: ${chargeLabel(chargeType, cancellationCharge)}`;
  };

  const list = Array.isArray(value) ? value : [value];
  return list
    .flatMap((item) => {
      const formatted = formatEntry(item);
      return formatted ? formatted.split('\n') : [];
    })
    .map((item) => item.trim())
    .filter(Boolean);
};
