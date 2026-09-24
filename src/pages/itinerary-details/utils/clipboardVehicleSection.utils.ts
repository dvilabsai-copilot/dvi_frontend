import { formatHeaderDate } from './timeline.utils';
import { escapeHtml } from './clipboardFormatting.utils';
import { formatClipboardMoney } from './clipboardItineraryTotals.utils';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};
export const buildClipboardVehicleSectionHtml = ({
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
    </table>
  `;
};