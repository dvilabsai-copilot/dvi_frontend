import {
  getActivityAmountFromItineraryDays,
  type ClipboardEntryTicket,
} from './clipboardItineraryTotals.utils';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export type ClipboardFinancialTotals = {
  hotelAmount: number;
  vehicleAmount: number;
  totalAmount: number;
  roundOff: number;
  netPayable: number;
  amenitiesAmount: number;
  extraBedAmount: number;
  childWithBedAmount: number;
  childWithoutBedAmount: number;
  guideAmount: number;
  hotspotAmount: number;
  entryTicketBreakdown: ClipboardEntryTicket[];
  activityAmount: number;
  couponDiscount: number;
  agentMargin: number;
};

const getHotelBaseAmount = (hotels: unknown[]): number => hotels.reduce<number>((sum, hotelValue) => {
  const hotel = asRecord(hotelValue);
  return sum + Number(hotel.totalHotelCost || 0) + Number(hotel.totalHotelTaxAmount || 0);
}, 0);

export const buildClipboardGroupFinancialTotals = ({
  hotels,
  itinerary,
  shouldShowHotels,
  shouldShowVehicles,
  computedVehicleAmount,
}: {
  hotels: unknown[];
  itinerary: unknown;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  computedVehicleAmount: number;
}): ClipboardFinancialTotals => {
  const plan = asRecord(itinerary);
  const costBreakdown = asRecord(plan.costBreakdown);
  const hotelAmount = shouldShowHotels ? getHotelBaseAmount(hotels) : 0;
  const amenitiesAmount = Number(costBreakdown.totalAmenitiesCost || 0);
  const extraBedAmount = Number(costBreakdown.extraBedCost || 0);
  const childWithBedAmount = Number(costBreakdown.childWithBedCost || 0);
  const childWithoutBedAmount = Number(costBreakdown.childWithoutBedCost || 0);
  const guideAmount = Number(costBreakdown.totalGuideCost || 0);
  const entryTicketBreakdown = Array.isArray(costBreakdown.entryTicketBreakdown)
    ? costBreakdown.entryTicketBreakdown as ClipboardEntryTicket[]
    : [];
  const hotspotAmount = Number(costBreakdown.totalHotspotCost || 0);
  const activityAmountFromCostBreakdown = Number(costBreakdown.totalActivityCost || 0);
  const activityAmountFromDays = getActivityAmountFromItineraryDays(plan.days);
  const activityAmount = activityAmountFromCostBreakdown > 0
    ? activityAmountFromCostBreakdown
    : activityAmountFromDays;
  const additionalMargin = Number(costBreakdown.additionalMargin || 0);
  const vehicleAmount = shouldShowVehicles ? Number(computedVehicleAmount || 0) : 0;
  const totalAmount = hotelAmount + amenitiesAmount + extraBedAmount + childWithBedAmount +
    childWithoutBedAmount + guideAmount + hotspotAmount + activityAmount + additionalMargin + vehicleAmount;
  const couponDiscount = Number(costBreakdown.couponDiscount || 0);
  const agentMargin = Number(costBreakdown.agentMargin || 0);
  const netBeforeRound = totalAmount - couponDiscount + agentMargin;
  const netPayable = Math.round(netBeforeRound);
  const roundOff = Number((netPayable - netBeforeRound).toFixed(2));

  return {
    hotelAmount,
    vehicleAmount,
    totalAmount,
    roundOff,
    netPayable,
    amenitiesAmount,
    extraBedAmount,
    childWithBedAmount,
    childWithoutBedAmount,
    guideAmount,
    hotspotAmount,
    entryTicketBreakdown,
    activityAmount,
    couponDiscount,
    agentMargin,
  };
};
