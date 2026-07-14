import { escapeHtml } from './clipboardFormatting.utils';
import {
  formatClipboardMoney,
  formatClipboardMoneyWithSymbol,
  getClipboardHotelPaxCount,
} from './clipboardItineraryTotals.utils';
import {
  buildClipboardGroupFinancialTotals,
  type ClipboardFinancialTotals,
} from './clipboardFinancialTotals.utils';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export const buildClipboardCostSectionHtml = ({
  hotels,
  itinerary,
  shouldShowHotels,
  shouldShowVehicles,
  computedVehicleAmount,
  computedVehicleQty,
  styles,
}: {
  hotels: unknown[];
  itinerary: unknown;
  shouldShowHotels: boolean;
  shouldShowVehicles: boolean;
  computedVehicleAmount: number;
  computedVehicleQty: number;
  styles: { tableStyle: string; cellStyle: string };
}): string => {
  const totals: ClipboardFinancialTotals = buildClipboardGroupFinancialTotals({
    hotels,
    itinerary,
    shouldShowHotels,
    shouldShowVehicles,
    computedVehicleAmount,
  });
  const plan = asRecord(itinerary);
  const costBreakdown = asRecord(plan.costBreakdown);
  const hotelPaxCount = getClipboardHotelPaxCount(itinerary);
  const hotelPerPaxAmount = hotelPaxCount > 0 ? Number(totals.hotelAmount || 0) / hotelPaxCount : 0;
  const row = (label: string, amount: unknown, prefix = '') => `
              <tr>
                <td style="${styles.cellStyle}font-weight:700;">${label}</td>
                <td style="${styles.cellStyle}">${prefix}${escapeHtml(formatClipboardMoneyWithSymbol(Number(amount || 0)))}</td>
              </tr>
            `;

  const detailRows = Array.isArray(totals.entryTicketBreakdown) && totals.entryTicketBreakdown.length > 0
    ? totals.entryTicketBreakdown.map((item) => `
                  <tr>
                    <td style="${styles.cellStyle}padding-left:18px;color:#5d5d5d;">Day ${escapeHtml(item.dayNumber || 0)} - ${escapeHtml(item.locationName || 'Sightseeing Location')}</td>
                    <td style="${styles.cellStyle}color:#5d5d5d;">${escapeHtml(formatClipboardMoneyWithSymbol(item.amount || 0))}</td>
                  </tr>
                `).join('')
    : '';

  return `
      <table width="700" border="1" cellpadding="0" cellspacing="0" style="${styles.tableStyle}margin-top:18px;">
        ${shouldShowHotels ? row(`Total Room Cost (${escapeHtml(hotelPaxCount)} Pax * ${escapeHtml(formatClipboardMoney(hotelPerPaxAmount))})`, totals.hotelAmount) : ''}
        ${totals.extraBedAmount > 0 || Number(plan.extraBed || 0) > 0 ? row(`Extra Bed Cost (${escapeHtml(plan.extraBed || 0)})`, totals.extraBedAmount) : ''}
        ${totals.childWithBedAmount > 0 || Number(plan.childWithBed || 0) > 0 ? row(`Child With Bed Cost (${escapeHtml(plan.childWithBed || 0)})`, totals.childWithBedAmount) : ''}
        ${totals.childWithoutBedAmount > 0 || Number(plan.childWithoutBed || 0) > 0 ? row(`Child Without Bed Cost (${escapeHtml(plan.childWithoutBed || 0)})`, totals.childWithoutBedAmount) : ''}
        ${shouldShowVehicles ? row(`Total Vehicle Cost (${escapeHtml(computedVehicleQty || 0)})`, totals.vehicleAmount) : ''}
        ${totals.hotspotAmount > 0 ? row('Total Entry Ticket Cost', totals.hotspotAmount) : ''}
        ${detailRows}
        ${totals.activityAmount > 0 ? row('Total Activity Cost', totals.activityAmount) : ''}
        ${row('Total Amount', totals.totalAmount)}
        ${totals.couponDiscount > 0 ? row('Coupon Discount', totals.couponDiscount, '- ') : ''}
        <tr>
          <td style="${styles.cellStyle}font-weight:700;">Total Round Off</td>
          <td style="${styles.cellStyle}">${totals.roundOff >= 0 ? '+ ' : '- '}${escapeHtml(formatClipboardMoneyWithSymbol(Math.abs(totals.roundOff)))}</td>
        </tr>
        <tr>
          <td style="${styles.cellStyle}font-weight:700;">Net Payable To ${escapeHtml(costBreakdown.companyName || 'Doview Holidays India Pvt ltd')}</td>
          <td style="${styles.cellStyle}font-weight:700;">${escapeHtml(formatClipboardMoneyWithSymbol(totals.netPayable))}</td>
        </tr>
      </table>
    `;
};
