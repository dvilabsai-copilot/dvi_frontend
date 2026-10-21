export type PricingRecord = Record<string, unknown>;

export type HotelPricingPayload = {
  hotels?: PricingRecord[];
  hotelTabs?: PricingRecord[];
  hotelSelectionState?: PricingRecord[];
};

export type PricingContractSummary = {
  selectedRecords: PricingRecord[];
  breakdownChecked: number;
  providers: string[];
};

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const firstNumber = (record: PricingRecord, ...fields: string[]): number | null => {
  for (const field of fields) {
    const value = toFiniteNumber(record[field]);
    if (value !== null) return value;
  }
  return null;
};

const sumNumbers = (record: PricingRecord, ...fields: string[]): number => (
  fields.reduce((sum, field) => sum + (toFiniteNumber(record[field]) ?? 0), 0)
);

const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) <= 0.01;

/**
 * The only payable values accepted by parity tests. Unit-rate fields are
 * deliberately excluded so a regression cannot pass by falling back to
 * pricePerNight.
 */
export const getBackendPayable = (record: PricingRecord, label = 'hotel'): number => {
  const totalHotelCost = firstNumber(record, 'totalHotelCost', 'total_hotel_cost');
  const totalPrice = firstNumber(record, 'totalPrice', 'total_price');

  if (totalHotelCost !== null && totalPrice !== null && !closeEnough(totalHotelCost, totalPrice)) {
    throw new Error(`${label}: backend totalHotelCost (${totalHotelCost}) differs from totalPrice (${totalPrice})`);
  }

  const payable = totalHotelCost ?? totalPrice;
  if (payable === null) {
    throw new Error(`${label}: API did not provide totalHotelCost or totalPrice`);
  }
  if (payable < 0) {
    throw new Error(`${label}: payable amount cannot be negative (${payable})`);
  }
  return payable;
};

const selectedRowsFromState = (payload: HotelPricingPayload): PricingRecord[] => {
  const groups = Array.isArray(payload.hotelSelectionState) ? payload.hotelSelectionState : [];
  return groups.flatMap((group) => {
    const routes = Array.isArray(group.routes) ? group.routes : [];
    return routes.flatMap((route) => {
      if (String(route.selectionStatus || group.selectionStatus || '').toUpperCase() !== 'SELECTED') return [];
      const selected = route.selected && typeof route.selected === 'object'
        ? route.selected as PricingRecord
        : null;
      if (!selected) return [];
      return [{
        ...selected,
        groupType: group.groupType,
        itineraryRouteId: route.routeId,
        date: route.routeDate,
        isSelected: true,
      }];
    });
  });
};

export const getSelectedBackendRows = (
  payload: HotelPricingPayload,
  groupType?: number,
): PricingRecord[] => {
  const rows = (Array.isArray(payload.hotels) ? payload.hotels : [])
    .filter((row) => row.isSelected === true)
    .filter((row) => groupType === undefined || Number(row.groupType) === Number(groupType));
  if (rows.length > 0) return rows;

  return selectedRowsFromState(payload)
    .filter((row) => groupType === undefined || Number(row.groupType) === Number(groupType));
};

/**
 * Reconcile only explicit backend breakdown fields. Missing optional fields
 * are treated as zero; the check is enabled only when the API supplied both
 * room cost and margin, avoiding a second business formula in the test.
 */
export const getBackendBreakdown = (record: PricingRecord) => {
  const roomCost = firstNumber(record, 'totalRoomCost', 'total_room_cost');
  const margin = firstNumber(record, 'hotelMarginTotalAmount', 'hotelMarginAmount', 'hotel_margin_amount');
  const payable = getBackendPayable(record);
  if (roomCost === null || margin === null) return null;

  const supplementAndMealCost = (
    (firstNumber(record, 'totalExtraBedCost', 'extraBedAmount', 'total_extra_bed_cost') ?? 0) +
    (firstNumber(record, 'totalChildWithBedCost', 'childWithBedAmount', 'total_child_with_bed_cost') ?? 0) +
    (firstNumber(record, 'totalChildWithoutBedCost', 'childWithoutBedAmount', 'total_child_without_bed_cost') ?? 0) +
    (firstNumber(record, 'hotelMealPlanCost', 'hotel_meal_plan_cost') ?? 0)
  );
  const componentTaxFields = [
    // `hotelMarginGstAmount` is an internal margin-tax field in the API. The
    // persisted `totalHotelCost` and the customer-facing tooltip total do not
    // include it, so adding it here would create a second payable formula.
    'hotelRoomGstAmount', 'hotelMealPlanGstAmount',
    'totalExtraBedCostGstAmount', 'totalChildWithBedCostGstAmount',
    'totalChildWithoutBedCostGstAmount',
  ];
  const hasComponentTax = componentTaxFields.some((field) => toFiniteNumber(record[field]) !== null);
  const taxes = hasComponentTax
    ? sumNumbers(record, ...componentTaxFields)
    : (toFiniteNumber(record.totalHotelTaxAmount) ?? 0);

  return {
    actual: payable,
    expected: Number((roomCost + supplementAndMealCost + taxes + margin).toFixed(2)),
  };
};

export const assertBackendPricingContract = (
  payload: HotelPricingPayload,
  label = 'itinerary',
): PricingContractSummary => {
  const selectedRecords = getSelectedBackendRows(payload);
  if (selectedRecords.length === 0) {
    throw new Error(`${label}: API returned no selected hotel rows or selected hotel routes`);
  }

  let breakdownChecked = 0;
  selectedRecords.forEach((record, index) => {
    const recordLabel = `${label} selected hotel ${index + 1}`;
    getBackendPayable(record, recordLabel);
    const breakdown = getBackendBreakdown(record);
    if (breakdown) {
      breakdownChecked += 1;
      if (!closeEnough(breakdown.expected, breakdown.actual)) {
        throw new Error(
          `${recordLabel}: breakdown totals ${breakdown.expected} but backend payable is ${breakdown.actual}`,
        );
      }
    }
  });

  (Array.isArray(payload.hotelTabs) ? payload.hotelTabs : []).forEach((tab, index) => {
    const total = firstNumber(tab, 'totalAmount', 'total_amount');
    if (total === null || total < 0) {
      throw new Error(`${label} recommendation ${index + 1}: API did not provide a valid totalAmount`);
    }
  });

  return {
    selectedRecords,
    breakdownChecked,
    providers: Array.from(new Set(selectedRecords.map((row) => String(row.provider || '').trim().toLowerCase()).filter(Boolean))),
  };
};

export const parseCurrency = (value: string): number => {
  const normalized = value.replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`Could not parse currency from: ${value}`);
  return parsed;
};

export const formatOccupancyCase = (record: PricingRecord, fallback: PricingRecord = {}): string => {
  const value = (field: string, ...aliases: string[]) => firstNumber(record, field, ...aliases) ?? firstNumber(fallback, field, ...aliases) ?? 0;
  const providerValue = String(record.providerDisplayName || record.provider || 'unknown').trim().toLowerCase();
  const provider = providerValue.includes('vsr') ? 'vsr' : providerValue;
  return `${provider}|rooms=${value('noOfRooms', 'roomCount', 'rooms')}|extraBed=${value('extraBedCount', 'extra_bed_count')}|childWithBed=${value('childWithBedCount', 'child_with_bed_count')}|childWithoutBed=${value('childWithoutBedCount', 'child_without_bed_count')}`;
};
