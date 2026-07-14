import { formatHeaderDate } from './timeline.utils';
import { escapeHtml } from './clipboardFormatting.utils';
import { formatClipboardMoney } from './clipboardItineraryTotals.utils';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export const buildClipboardVehicleSectionHtml = ({
  vehiclesValue,
  daysValue,
  shouldShowVehicles,
  styles,
}: {
  vehiclesValue: unknown;
  daysValue: unknown;
  shouldShowVehicles: boolean;
  styles: {
    tableStyle: string;
    cellStyle: string;
    headerCellStyle: string;
    centerTitleStyle: string;
  };
}): string => {
  if (!shouldShowVehicles) return '';
  const vehicles = Array.isArray(vehiclesValue) ? vehiclesValue : [];
  const days = Array.isArray(daysValue) ? daysValue : [];
  const firstDay = asRecord(days[0]);
  const lastDay = asRecord(days[days.length - 1]);
  const startDate = firstDay.date
    ? formatHeaderDate(String(firstDay.date)).replace(/^\w+,\s*/, '')
    : '';
  const endDate = lastDay.date
    ? formatHeaderDate(String(lastDay.date)).replace(/^\w+,\s*/, '')
    : '';
  const vehicleRowsHtml = vehicles.length > 0
    ? vehicles.map((vehicleValue) => {
      const vehicle = asRecord(vehicleValue);
      const fromToText = vehicle.fromLabel || vehicle.toLabel
        ? `${vehicle.fromLabel || ''} ==> ${vehicle.toLabel || ''}`
        : `${firstDay.departure || ''} ==> ${lastDay.arrival || ''}`;
      return `
                <tr>
                  <td style="${styles.cellStyle}">
                    ${escapeHtml(vehicle.vehicleTypeName || 'Vehicle')} (${escapeHtml(vehicle.totalQty || 1)}) -
                    ${escapeHtml(fromToText)}
                    ${startDate || endDate ? ` - ${escapeHtml(startDate)} ==> ${escapeHtml(endDate)}` : ''}
                  </td>
                  <td style="${styles.cellStyle}font-weight:700;">
                    ${escapeHtml(formatClipboardMoney(Number(vehicle.totalAmount || 0)))}
                  </td>
                </tr>
              `;
    }).join('')
    : `
          <tr>
            <td colspan="2" style="${styles.cellStyle}text-align:center;">No Vehicle available</td>
          </tr>
        `;

  return `
      <div style="${styles.centerTitleStyle}margin-top:22px;">Vehicle Details</div>
      <table width="700" border="1" cellpadding="0" cellspacing="0" style="${styles.tableStyle}">
        <tr>
          <th style="${styles.headerCellStyle}width:85%;">Vehicle Details</th>
          <th style="${styles.headerCellStyle}width:15%;">Total Amount</th>
        </tr>
        ${vehicleRowsHtml}
      </table>
    `;
};
