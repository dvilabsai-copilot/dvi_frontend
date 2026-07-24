import type { ItineraryVehicleRow } from "../itinerary-details.types";

export const normalizeMealPlanLabel = (value?: string | null): string => {
  const mealPlanLabelByCode: Record<string, string> = {
    CP: 'CP - Continental Plan (Breakfast only)',
    EP: 'EP - European Plan (Room only)',
    MAP: 'MAP - Modified American Plan (Breakfast + Lunch or Dinner)',
    AP: 'AP - American Plan (Breakfast + Lunch + Dinner)',
  };

  const raw = String(value || '').trim();
  if (!raw || raw === '-') return mealPlanLabelByCode.EP;

  const upper = raw.toUpperCase();
  if (upper === 'CP' || upper.includes('CONTINENTAL PLAN')) return mealPlanLabelByCode.CP;
  if (upper === 'MAP' || upper.includes('MODIFIED AMERICAN PLAN')) return mealPlanLabelByCode.MAP;
  if (upper === 'AP' || upper === 'AMERICAN PLAN') return mealPlanLabelByCode.AP;
  if (upper === 'EP' || upper.includes('EUROPEAN PLAN') || upper.includes('ROOM ONLY') || upper.includes('NO MEAL')) return mealPlanLabelByCode.EP;

  if (upper.includes('ALL MEALS') || upper.includes('FULL BOARD') || upper.includes('FULLBOARD')) return mealPlanLabelByCode.AP;
  if (upper.includes('HALF BOARD') || upper.includes('HALFBOARD')) return mealPlanLabelByCode.MAP;

  const hasBreakfast = upper.includes('BREAKFAST');
  const hasLunch = upper.includes('LUNCH');
  const hasDinner = upper.includes('DINNER');

  if (hasBreakfast && hasLunch && hasDinner) return mealPlanLabelByCode.AP;
  if ((hasBreakfast && hasLunch) || (hasBreakfast && hasDinner) || (hasLunch && hasDinner)) return mealPlanLabelByCode.MAP;
  if (hasBreakfast) return mealPlanLabelByCode.CP;
  return mealPlanLabelByCode.EP;
};

export const getVehicleAmountNumber = (vehicle: ItineraryVehicleRow): number => {
  const raw =
    (vehicle as ItineraryVehicleRow & { grandTotal?: number | string }).grandTotal ??
    (vehicle as ItineraryVehicleRow & { vehicleGrandTotal?: number | string }).vehicleGrandTotal ??
    (vehicle as ItineraryVehicleRow & { totalAmount?: number | string }).totalAmount ??
    (vehicle as ItineraryVehicleRow & { total_amount?: number | string }).total_amount ??
    (vehicle as ItineraryVehicleRow & { TotalAmount?: number | string }).TotalAmount ??
    (vehicle as ItineraryVehicleRow & { finalAmount?: number | string }).finalAmount ??
    (vehicle as ItineraryVehicleRow & { amount?: number | string }).amount ??
    0;

  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const amount = Number(String(raw).replace(/,/g, "").replace(/[^\d.-]/g, "").trim());
  return Number.isFinite(amount) ? amount : 0;
};

export const getCheapestVehicleForType = (vehicles: ItineraryVehicleRow[]) => {
  if (!vehicles.length) return null;
  return vehicles.reduce((cheapest, current) => (
    getVehicleAmountNumber(current) < getVehicleAmountNumber(cheapest) ? current : cheapest
  ), vehicles[0]);
};

export const isSupplierBookableHotel = (entry: any): boolean => {
  if (!entry) return false;

  const hotelName = String(entry?.hotelName || '').trim().toLowerCase();
  const hotelCode = String(entry?.hotelCode || entry?.hotelId || '').trim();
  const provider = String(entry?.provider || '').trim().toLowerCase();
  const bookingCode = String(
    entry?.bookingCode || entry?.searchReference || entry?.roomTypes?.[0]?.roomCode || '',
  ).trim();
  const availabilityStatus = String(entry?.availabilityStatus || '').trim().toUpperCase();
  const amount = Number(entry?.netAmount) > 0
    ? Number(entry.netAmount)
    : Number(entry?.totalHotelCost || 0) + Number(entry?.totalHotelTaxAmount || 0) > 0
      ? Number(entry.totalHotelCost || 0) + Number(entry.totalHotelTaxAmount || 0)
      : Number(entry?.price || 0);

  if (
    entry?.externalStay === true || entry?.isBookable === false ||
    availabilityStatus === 'NO_SUPPLIER_AVAILABILITY' || availabilityStatus === 'NOT_BOOKABLE' ||
    provider === 'external' || provider === 'none' || provider === 'self-arranged' ||
    hotelName === 'no hotels available' || !hotelCode || hotelCode === '0'
  ) return false;

  if (!['tbo', 'resavenue', 'hobse', 'axisrooms', 'staah'].includes(provider)) return false;
  if (!Number.isFinite(amount) || amount <= 0) return false;
  return provider !== 'tbo' || bookingCode.includes('!TB!');
};

/** Offline catalog rates are selectable, but require hotel-side confirmation. */
export const isManualApprovalHotel = (entry: any): boolean => {
  if (!entry) return false;

  const provider = String(entry?.provider || '').trim().toLowerCase();
  const bookingMode = String(entry?.bookingMode || '').trim().toUpperCase();
  const availabilityStatus = String(entry?.availabilityStatus || '').trim().toUpperCase();

  return provider === 'offline' ||
    entry?.requiresHotelApproval === true ||
    bookingMode === 'MANUAL_APPROVAL' ||
    availabilityStatus === 'OFFLINE_APPROVAL_REQUIRED';
};
