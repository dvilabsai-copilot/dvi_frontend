import { getTboAssignedRoomTypes } from "../itinerary-details/utils/tboMultiBatchBookingSelection.utils";

/**
 * The Hotel List must show the supplier's actual meal plan for every batch.
 * DVI's CP/MAP/EP display fallback can synthesize a breakfast-inclusive row,
 * but it does not change TBO's Room_Only BookingCodes or purchase breakfast.
 * This pure function deliberately prices only the original supplier batches.
 */
export type VerifiedTboSupplierOffer = {
  mealPlan: string;
  roomType: string;
  assignedRoomTypes: string[];
  currency: string;
  fullStayFare: number;
  refundable: boolean;
  needsBreakfastSupplement?: boolean;
};

type Batch = {
  batchIndex?: unknown;
  startRoomIndex?: unknown;
  roomCount?: unknown;
  hotelCode?: unknown;
  bookingCode?: unknown;
  roomType?: unknown;
  mealPlan?: unknown;
  currency?: unknown;
  isRefundable?: unknown;
  supplierTotalFare?: unknown;
};

type RateRow = {
  hotelCode?: unknown;
  roomType?: unknown;
  tboRoomBatches?: unknown;
};

const norm = (v: unknown): string => String(v ?? '').trim().toUpperCase();
const same = (a: unknown, b: unknown): boolean => norm(a) === norm(b);

export function getVerifiedTboSupplierOffer(
  row: RateRow,
  requestedRooms: number,
): VerifiedTboSupplierOffer | null {
  if (!Number.isInteger(requestedRooms) || requestedRooms < 7 || requestedRooms > 25) return null;
  const hotelCode = String(row?.hotelCode ?? '').trim();
  const roomType = String(row?.roomType ?? '').trim();
  const batches = row?.tboRoomBatches;
  if (!hotelCode || !roomType || !Array.isArray(batches) ||
      batches.length !== Math.ceil(requestedRooms / 6)) return null;
  const meals = new Set<string>();
  let firstCurrency = '';
  let firstRefundable = false;
  let totalCents = 0;
  const seenCodes = new Set<string>();
  const roomTypes = new Set<string>();
  const allocation: Array<{ roomType: string; roomCount: number }> = [];
  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index] as Batch | null;
    if (!batch) return null;
    const code = String(batch.bookingCode ?? '').trim();
    const meal = String(batch.mealPlan ?? '').trim();
    const currency = String(batch.currency ?? '').trim();
    const batchRoom = String(batch.roomType ?? '').trim();
    const price = Number(batch.supplierTotalFare);
    if (Number(batch.batchIndex) !== index ||
        Number(batch.startRoomIndex) !== index * 6 ||
        Number(batch.roomCount) !== Math.min(6, requestedRooms - index * 6) ||
        String(batch.hotelCode ?? '').trim() !== hotelCode ||
        !batchRoom || !meal || !currency ||
        !code.startsWith(`${hotelCode}!TB!`) || seenCodes.has(code) ||
        !Number.isFinite(price) || price <= 0) return null;
    if (index > 0 && (!same(firstCurrency, currency) || firstRefundable !== (batch.isRefundable === true))) return null;
    if (index === 0) {
      firstCurrency = currency;
      firstRefundable = batch.isRefundable === true;
    }
    seenCodes.add(code);
    roomTypes.add(batchRoom);
    allocation.push({ roomType: batchRoom, roomCount: Number(batch.roomCount) });
    meals.add(norm(meal));
    totalCents += Math.round(price * 100);
  }
  if (!same([...roomTypes].join(' + '), roomType)) return null;
  const mixedMeal = meals.size > 1;
  if (mixedMeal && !(norm(firstCurrency) === 'INR' && meals.size === 2 && meals.has('EP') && meals.has('CP'))) return null;
  return {
    mealPlan: mixedMeal ? 'EP' : [...meals][0],
    ...(mixedMeal ? { needsBreakfastSupplement: true } : {}),
    roomType,
    assignedRoomTypes: getTboAssignedRoomTypes(allocation),
    currency: firstCurrency,
    fullStayFare: totalCents / 100,
    refundable: firstRefundable,
  };
}
