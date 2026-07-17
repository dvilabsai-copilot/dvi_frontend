import type { ItineraryHotelRow } from "../ItineraryDetails";
import type { HotelRoomDetail } from "./hotelList.types";

export type HotelLike = Partial<ItineraryHotelRow> & Record<string, unknown>;

export const MEAL_CODE_LABEL: Record<string, string> = { CP: "CP", EP: "EP", MAP: "MAP", AP: "AP" };

export const normalizeMealPlanLabel = (value?: string | null): string => {
  const mealPlanLabelByCode: Record<string, string> = {
    CP: "CP - Continental Plan (Breakfast only)",
    EP: "EP - European Plan (Room only)",
    MAP: "MAP - Modified American Plan (Breakfast + Lunch or Dinner)",
    AP: "AP - American Plan (Breakfast + Lunch + Dinner)",
  };

  const raw = String(value || "").trim();
  if (!raw || raw === "-") return mealPlanLabelByCode.EP;

  const upper = raw.toUpperCase();
  if (upper === "CP" || upper.includes("CONTINENTAL PLAN")) return mealPlanLabelByCode.CP;
  if (upper === "MAP" || upper.includes("MODIFIED AMERICAN PLAN")) return mealPlanLabelByCode.MAP;
  if (upper === "AP" || upper === "AMERICAN PLAN") return mealPlanLabelByCode.AP;
  if (upper === "EP" || upper.includes("EUROPEAN PLAN") || upper.includes("ROOM ONLY") || upper.includes("NO MEAL")) {
    return mealPlanLabelByCode.EP;
  }
  if (upper.includes("ALL MEALS") || upper.includes("FULL BOARD") || upper.includes("FULLBOARD")) return mealPlanLabelByCode.AP;
  if (upper.includes("HALF BOARD") || upper.includes("HALFBOARD")) return mealPlanLabelByCode.MAP;

  const hasBreakfast = upper.includes("BREAKFAST");
  const hasLunch = upper.includes("LUNCH");
  const hasDinner = upper.includes("DINNER");
  if (hasBreakfast && hasLunch && hasDinner) return mealPlanLabelByCode.AP;
  if ((hasBreakfast && hasLunch) || (hasBreakfast && hasDinner) || (hasLunch && hasDinner)) return mealPlanLabelByCode.MAP;
  if (hasBreakfast) return mealPlanLabelByCode.CP;
  return mealPlanLabelByCode.EP;
};

export const normalizedLabelToCode = (label: string): string | null => {
  const normalized = String(label || "").trim().toUpperCase();
  if (normalized.startsWith("CP")) return "CP";
  if (normalized.startsWith("EP")) return "EP";
  if (normalized.startsWith("MAP")) return "MAP";
  if (normalized.startsWith("AP")) return "AP";
  return null;
};

export const toMoneyNumber = (value: number | string | undefined | null): number => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};

export const formatCurrency = (value: number | string | undefined | null): string =>
  `\u20B9 ${toMoneyNumber(value).toFixed(2)}`;

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const stripHtml = (value: string): string =>
  String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const normalizeTextList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [stripHtml(item)];
        if (typeof item === "number") return [String(item)];
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const candidate =
            record.description ??
            record.text ??
            record.title ??
            record.name ??
            record.type;
          return candidate ? [stripHtml(String(candidate))] : [];
        }
        return [];
      })
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        return normalizeTextList(JSON.parse(text));
      } catch {
        // Fall through to plain text parsing.
      }
    }
    return text.split(/\r?\n|\||;/).map(stripHtml).map((part) => part.trim()).filter(Boolean);
  }

  if (typeof value === "number") return [String(value)];
  return [];
};

export const pickListFromKeys = (source: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const values = normalizeTextList(source[key]);
    if (values.length > 0) return Array.from(new Set(values));
  }
  return [];
};

export const normalizeHotelStarCategory = (value: unknown): number | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const starLabelMatch = raw.match(/([1-5])\s*(?:\*|STAR)?/i);
  if (starLabelMatch) {
    const parsed = Number(starLabelMatch[1]);
    if (parsed >= 1 && parsed <= 5) return parsed;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 1 && numeric <= 5) return numeric;
  const lastDigit = Math.floor(numeric) % 10;
  if (numeric >= 10 && numeric < 100 && lastDigit >= 1 && lastDigit <= 5) return lastDigit;
  return null;
};

export const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getStayKey = (hotel: Pick<ItineraryHotelRow, "itineraryRouteId" | "date" | "day">): string =>
  `${toNumber(hotel.itineraryRouteId, 0)}::${String(hotel.date || hotel.day || "").trim()}`;

export const getHotelOptionKey = (hotel: HotelLike): string => [
  String(hotel.provider || ""),
  String(hotel.bookingCode || ""),
  String(hotel.searchReference || ""),
  String(hotel.hotelId || ""),
  String(hotel.roomType || hotel.roomTypeName || ""),
  String(hotel.mealPlan || ""),
  String(hotel.availabilityStatus || ""),
  String(Number(hotel.totalHotelCost ?? hotel.totalAmount ?? 0)),
  String(Number(hotel.totalHotelTaxAmount ?? hotel.taxAmount ?? 0)),
].join("|");

export const normalizeHotelIdentity = (hotel: HotelLike): string => [
  String(hotel.provider || "").trim().toLowerCase(),
  String(hotel.hotelCode || hotel.hotelId || "").trim().toLowerCase(),
  String(hotel.hotelName || "").trim().toLowerCase(),
].join("|");

export const normalizeRoomMealIdentity = (hotel: HotelLike): string => [
  String(hotel.roomId || "").trim().toLowerCase(),
  String(hotel.rateId || "").trim().toLowerCase(),
  String(hotel.roomType || hotel.roomTypeName || "").trim().toLowerCase(),
  normalizeMealPlanLabel(String(hotel.mealPlan || "")).trim().toLowerCase(),
].join("|");

export const isSameHotelIdentity = (a: HotelLike, b: HotelLike): boolean =>
  normalizeHotelIdentity(a) === normalizeHotelIdentity(b);

export const isSameRoomMealIdentity = (a: HotelLike, b: HotelLike): boolean =>
  normalizeRoomMealIdentity(a) === normalizeRoomMealIdentity(b);

export const getStaySortValue = (hotel: HotelLike): string => [
  String(hotel.date || hotel.checkInDate || ""),
  String(hotel.day || ""),
  String(hotel.itineraryRouteId || hotel.routeId || ""),
].join("|");

export const sortStayGroupsByDate = (groups: ItineraryHotelRow[][]): ItineraryHotelRow[][] =>
  [...groups].sort((a, b) => getStaySortValue(a[0]).localeCompare(getStaySortValue(b[0])));

export const getEffectiveRoomCount = (hotel: Pick<ItineraryHotelRow, "noOfRooms">, roomCount: number): number =>
  Math.max(toNumber(hotel.noOfRooms, 0) || toNumber(roomCount, 1) || 1, 1);

export const getHotelBaseAmount = (hotel: HotelLike): number => toNumber(
  hotel.baseHotelCost ?? hotel.basePricePerNight ?? hotel.baseAmount ?? 0,
);

export const getHotelDisplayAmount = (hotel: HotelLike): number => {
  const directTotal = toNumber(hotel.totalAmount ?? hotel.totalPrice, 0);
  if (directTotal > 0) return directTotal;
  const totalHotelCost = toNumber(hotel.totalHotelCost ?? hotel.perNightAmount ?? hotel.pricePerNight, 0);
  const totalHotelTaxAmount = toNumber(hotel.totalHotelTaxAmount ?? hotel.taxAmount, 0);
  const computedAmount = totalHotelCost + totalHotelTaxAmount;
  return computedAmount > 0 ? computedAmount : totalHotelCost;
};

export const getHotelAmountWithRooms = (hotel: HotelLike): number => getHotelDisplayAmount(hotel);

export const isPlaceholderHotel = (hotel?: HotelLike | null): boolean => {
  if (!hotel) return true;
  const name = String(hotel.hotelName || "").trim().toLowerCase();
  const provider = String(hotel.provider || "").trim().toLowerCase();
  const availabilityStatus = String(hotel.availabilityStatus || "").trim().toUpperCase();
  return name === "no hotels available" ||
    name.includes("no hotel booked") ||
    name.includes("stay arranged externally") ||
    provider === "external" ||
    availabilityStatus === "NO_SUPPLIER_AVAILABILITY" ||
    hotel.externalStay === true;
};

export const isExternalStayRow = (hotel?: HotelLike | null): boolean => {
  if (!hotel) return false;
  const provider = String(hotel.provider || "").trim().toLowerCase();
  const hotelName = String(hotel.hotelName || "").trim().toLowerCase();
  const availabilityStatus = String(hotel.availabilityStatus || "").trim().toUpperCase();
  return hotel.externalStay === true ||
    provider === "external" || provider === "none" || provider === "self-arranged" ||
    availabilityStatus === "NO_SUPPLIER_AVAILABILITY" ||
    hotelName === "no hotels available" ||
    hotelName.includes("no hotel booked") ||
    hotelName.includes("no hotels available") ||
    hotelName.includes("stay arranged externally");
};

export const isSelectableHotel = (hotel?: HotelLike | null): boolean => {
  if (!hotel) return false;
  const availabilityStatus = String(hotel.availabilityStatus || "").trim().toUpperCase();
  if (availabilityStatus === "NOT_BOOKABLE" || availabilityStatus === "NO_SUPPLIER_AVAILABILITY") return false;
  if (hotel.isBookable === false || hotel.externalStay === true) return false;
  const provider = String(hotel.provider || "").trim().toLowerCase();
  if (!provider || provider === "external" || provider === "none" || provider === "self-arranged") return false;
  const amount = getHotelAmountWithRooms(hotel);
  return Number.isFinite(amount) && amount > 0;
};

export const findMatchingRoomMealInStay = (
  stayHotels: ItineraryHotelRow[],
  previousSelectedHotel?: ItineraryHotelRow | null,
): ItineraryHotelRow | null => {
  if (!previousSelectedHotel) return null;
  return stayHotels.find((hotel) =>
    isSelectableHotel(hotel) &&
    isSameHotelIdentity(hotel, previousSelectedHotel) &&
    isSameRoomMealIdentity(hotel, previousSelectedHotel),
  ) || null;
};

export const getMealPlanCodeOnly = (value: unknown): string => {
  const code = normalizedLabelToCode(normalizeMealPlanLabel(String(value || "")));
  return code || String(value || "").trim() || "-";
};

export const getRoomMealDisplayLabel = (hotel: HotelLike): string => {
  const roomType = String(hotel.roomType || hotel.roomTypeName || "Room").trim();
  return `${roomType} / ${getMealPlanCodeOnly(hotel.mealPlan)}`;
};

export const getAutoSkipRoomMealMismatchMessage = (
  hotel: HotelLike,
  selectedForStay?: HotelLike | null,
  previousSelectedHotel?: HotelLike | null,
): string => {
  if (!hotel || !previousSelectedHotel || !isSelectableHotel(hotel)) return "";
  if (selectedForStay && getHotelOptionKey(hotel) === getHotelOptionKey(selectedForStay)) return "";
  if (!isSameHotelIdentity(hotel, previousSelectedHotel) || isSameRoomMealIdentity(hotel, previousSelectedHotel)) return "";
  return [
    "Not auto-selected because the room type or meal plan is different from the previous night.",
    `Previous: ${getRoomMealDisplayLabel(previousSelectedHotel)}.`,
    `This option: ${getRoomMealDisplayLabel(hotel)}.`,
    "You can still choose this manually if you want.",
  ].join(" ");
};

export const hasSelectableHotelIdentity = (hotel: HotelLike): boolean => {
  const hotelId = Number(hotel.hotelId ?? hotel.hotel_id ?? hotel.id ?? NaN);
  if (Number.isFinite(hotelId) && hotelId > 0) return true;
  return Boolean(String(hotel.bookingCode || "").trim() || String(hotel.searchReference || "").trim() || String(hotel.hotelName || "").trim());
};

export const getLowestRoomTypeAmount = (roomTypeOptions: HotelRoomDetail[]): number =>
  roomTypeOptions.reduce((lowest, option) => {
    const optionAmount = getHotelDisplayAmount(option);
    if (lowest === 0) return optionAmount;
    if (optionAmount <= 0) return lowest;
    return optionAmount < lowest ? optionAmount : lowest;
  }, 0);

export const getLowestRoomTypeBaseAmount = (roomTypeOptions: HotelRoomDetail[]): number =>
  roomTypeOptions.reduce((lowest, option) => {
    const optionAmount = getHotelBaseAmount(option);
    if (lowest === 0) return optionAmount;
    if (optionAmount <= 0) return lowest;
    return optionAmount < lowest ? optionAmount : lowest;
  }, 0);

export const getHotelsForStay = (
  sourceHotels: ItineraryHotelRow[],
  routeId: number,
  stayDate: string,
  groupType: number | undefined,
  planId: number,
  roomCount: number,
): HotelRoomDetail[] => {
  const hotelsForRoute = sourceHotels
    .filter((hotel) => toNumber(hotel.itineraryRouteId, 0) === routeId)
    .filter((hotel) => !groupType || groupType <= 0 || toNumber(hotel.groupType, 0) === toNumber(groupType, 0))
    .filter((hotel) => String(hotel.date || "").trim() === stayDate)
    .map((hotel) => ({
      ...hotel,
      itineraryPlanId: planId,
      hotelCategory: hotel.category,
      pricePerNight: hotel.totalHotelCost,
      perNightAmount: hotel.totalHotelCost,
      taxAmount: hotel.totalHotelTaxAmount || 0,
      totalAmount: getHotelAmountWithRooms(hotel),
      noOfRooms: getEffectiveRoomCount(hotel, roomCount),
      roomTypeName: hotel.roomType,
      availableRoomTypes: hotel.roomType
        ? [{ roomTypeId: 1, roomTypeTitle: hotel.roomType }]
        : [],
    } as HotelRoomDetail));

  const uniqueByRateOption = new Map<string, HotelRoomDetail>();
  hotelsForRoute.forEach((hotel) => {
    const key = [
      String(hotel.provider || ""), String(hotel.bookingCode || ""), String(hotel.searchReference || ""),
      String(hotel.hotelId || ""), String(hotel.roomType || ""), String(hotel.mealPlan || ""),
      String(hotel.availabilityStatus || ""), String(hotel.totalHotelCost || 0), String(hotel.totalHotelTaxAmount || 0),
    ].join("|");
    if (!uniqueByRateOption.has(key)) uniqueByRateOption.set(key, hotel);
  });
  return Array.from(uniqueByRateOption.values());
};

export const mergeHotelOptions = (...hotelGroups: HotelRoomDetail[][]): HotelRoomDetail[] => {
  const uniqueByRateOption = new Map<string, HotelRoomDetail>();
  hotelGroups.flat().filter(Boolean).forEach((hotel) => {
    const key = [
      String(hotel.provider || ""), String(hotel.bookingCode || ""), String(hotel.searchReference || ""),
      String(hotel.hotelId || ""), String(hotel.roomType || hotel.roomTypeName || ""), String(hotel.mealPlan || ""),
      String(hotel.availabilityStatus || ""), String(hotel.totalHotelCost || hotel.pricePerNight || 0),
      String(hotel.totalHotelTaxAmount || hotel.taxAmount || 0),
    ].join("|");
    if (!uniqueByRateOption.has(key)) uniqueByRateOption.set(key, hotel);
  });
  return Array.from(uniqueByRateOption.values());
};
