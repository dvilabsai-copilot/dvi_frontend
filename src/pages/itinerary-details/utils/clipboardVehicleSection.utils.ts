import { formatHeaderDate } from './timeline.utils';
import { escapeHtml } from './clipboardFormatting.utils';
import {
  formatClipboardMoneyWithSymbol,
} from './clipboardItineraryTotals.utils';
type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object'
    ? (value as UnknownRecord)
    : {};

const getVehicleDateRange = (
  vehicle: UnknownRecord,
  days: UnknownRecord[],
): string => {
  const startDate =
    vehicle.startDate ??
    vehicle.fromDate ??
    vehicle.start_date;

  const endDate =
    vehicle.endDate ??
    vehicle.toDate ??
    vehicle.end_date;

  if (startDate || endDate) {
    const start = startDate
      ? formatHeaderDate(String(startDate))
      : '';

    const end = endDate
      ? formatHeaderDate(String(endDate))
      : '';

    if (start && end) {
      return `${start} ==> ${end}`;
    }

    return start || end;
  }

  if (!days.length) {
    return '';
  }

  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  const firstDate =
    firstDay.date ??
    firstDay.itineraryDate ??
    firstDay.travelDate;

  const lastDate =
    lastDay.date ??
    lastDay.itineraryDate ??
    lastDay.travelDate;

  if (!firstDate && !lastDate) {
    return '';
  }

  const start = firstDate
    ? formatHeaderDate(String(firstDate))
    : '';

  const end = lastDate
    ? formatHeaderDate(String(lastDate))
    : '';

  if (start && end) {
    return `${start} ==> ${end}`;
  }

  return start || end;
};

export const buildClipboardVehicleSectionHtml = ({
  vehiclesValue,
  daysValue,
  shouldShowVehicles,
  packageTotalHtml = '',
  styles,
}: {
  vehiclesValue: unknown;
  daysValue: unknown;
  shouldShowVehicles: boolean;
  packageTotalHtml?: string;
  styles: {
    tableStyle: string;
    cellStyle: string;
    headerCellStyle: string;
    centerTitleStyle: string;
  };
}): string => {
  if (!shouldShowVehicles) return '';

  const vehicles = Array.isArray(vehiclesValue)
    ? vehiclesValue.map(asRecord)
    : [];

  const days = Array.isArray(daysValue)
    ? daysValue.map(asRecord)
    : [];

  const vehicleRows = vehicles
    .map((vehicle) => {
      const vehicleName = String(
        vehicle.vehicleTypeName ??
          vehicle.vehicleName ??
          'Vehicle',
      ).trim();

      const quantityValue = Number(
        vehicle.totalQty ?? vehicle.quantity ?? 1,
      );

      const quantity =
        Number.isFinite(quantityValue) &&
        quantityValue > 0
          ? quantityValue
          : 1;

const detailText =
  `${vehicleName} (${quantity})`;

const amount = Number(
  vehicle.totalAmount ??
    vehicle.amount ??
    vehicle.totalCost ??
    0,
);

const safeAmount = Number.isFinite(amount)
  ? amount
  : 0;

      return `
        <tr>
          <td style="${styles.cellStyle}font-weight:700;">
            ${escapeHtml(detailText)}
          </td>

          <td style="${styles.cellStyle}font-weight:700;">
           ${escapeHtml(
  formatClipboardMoneyWithSymbol(safeAmount),
)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="${styles.centerTitleStyle}margin-top:22px;">
      Vehicle Details
    </div>

    <table
      width="700"
      border="1"
      cellpadding="0"
      cellspacing="0"
      style="${styles.tableStyle}"
    >
      <tr>
        <th style="${styles.headerCellStyle}width:85%;">
          Vehicle Details
        </th>

        <th style="${styles.headerCellStyle}width:15%;">
          Total Amount
        </th>
      </tr>

      ${packageTotalHtml}

      ${
        vehicleRows ||
        `
          <tr>
            <td
              colspan="2"
              style="${styles.cellStyle}text-align:center;"
            >
              No Vehicle available
            </td>
          </tr>
        `
      }
    </table>
  `;
};