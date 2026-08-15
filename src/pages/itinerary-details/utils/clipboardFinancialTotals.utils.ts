import type { ClipboardEntryTicket } from './clipboardItineraryTotals.utils';

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

export const buildClipboardGroupFinancialTotals = ({
  hotels,
  itinerary,
  costBreakdown: costBreakdownOverride,
  shouldShowHotels,
  shouldShowVehicles,
  computedVehicleAmount,
}: {
  hotels: unknown[];
  itinerary: unknown;
  costBreakdown?: unknown;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  computedVehicleAmount: number;
}): ClipboardFinancialTotals => {
  const plan = asRecord(itinerary);
  const costBreakdown = asRecord(costBreakdownOverride ?? plan.costBreakdown);
  const hotelAmount = shouldShowHotels ? Number(costBreakdown.totalHotelAmount ?? costBreakdown.totalRoomCost ?? 0) : 0;
  const amenitiesAmount = Number(costBreakdown.totalAmenitiesCost || 0);
  const extraBedAmount = Number(costBreakdown.extraBedCost || 0);
  const childWithBedAmount = Number(costBreakdown.childWithBedCost || 0);
  const childWithoutBedAmount = Number(costBreakdown.childWithoutBedCost || 0);
  const guideAmount = Number(costBreakdown.totalGuideCost || 0);
  const entryTicketBreakdown = Array.isArray(costBreakdown.entryTicketBreakdown)
    ? costBreakdown.entryTicketBreakdown as ClipboardEntryTicket[]
    : [];
  const hotspotAmount = Number(costBreakdown.totalHotspotCost || 0);
  const activityAmount = Number(costBreakdown.totalActivityCost || 0);
  const additionalMargin = Number(costBreakdown.additionalMargin || 0);
  const vehicleAmount = shouldShowVehicles
    ? Number(costBreakdown.totalVehicleAmount ?? costBreakdown.totalVehicleCost ?? computedVehicleAmount ?? 0)
    : 0;
  const totalAmount = Number(costBreakdown.totalAmount || 0);
  const couponDiscount = Number(costBreakdown.couponDiscount || 0);
  const agentMargin = Number(costBreakdown.agentMargin || 0);
  const netPayable = Number(costBreakdown.netPayable || 0);
  const roundOff = Number(costBreakdown.totalRoundOff || 0);

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
