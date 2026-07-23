import { escapeHtml } from './clipboardFormatting.utils';
import {
  expandHotelRowsForClipboard,
  getClipboardHotelDayLabel,
} from './clipboardHotelRows.utils';

export const buildClipboardHotelPackageSectionHtml = ({
  hotels,
  roomCount,
  groupIndex,
  sectionTitle,
  vehicleSectionHtml,
  costSectionHtml,
  styles,
}: {
  hotels: unknown[];
  roomCount: unknown;
  groupIndex: number;
  sectionTitle: string;
  vehicleSectionHtml: string;
  costSectionHtml: string;
  styles: {
    tableStyle: string;
    cellStyle: string;
    headerCellStyle: string;
    centerTitleStyle: string;
  };
}): string => {
  const clipboardHotels = expandHotelRowsForClipboard(hotels);
  const rowsHtml = clipboardHotels.length > 0
    ? clipboardHotels.map((hotel, index) => {
      const isDayZero =
        hotel.__clipboardDayZero === true || hotel.previousDayBillingSynthetic === true;
      const hotelName = isDayZero
        ? `${String(hotel.hotelName || '--')} (Early check-in room block)`
        : String(hotel.hotelName || '--');
      return `
                  <tr>
                    <td style="${styles.cellStyle}white-space:nowrap;">
                      ${escapeHtml(getClipboardHotelDayLabel(hotel, index + 1))}
                    </td>
                    <td style="${styles.cellStyle}">
                      ${escapeHtml(hotel.destination)}
                    </td>
                    <td style="${styles.cellStyle}">
                      ${escapeHtml(hotelName)} - ${escapeHtml(hotel.category)}
                    </td>
                    <td style="${styles.cellStyle}">
                      ${escapeHtml(hotel.roomType)} - ${escapeHtml(roomCount)}
                    </td>
                    <td style="${styles.cellStyle}">
                      ${escapeHtml(String(hotel.mealPlan || '').trim() || 'CP')}
                    </td>
                  </tr>
                `;
    }).join('')
    : `
            <tr>
              <td colspan="5" style="${styles.cellStyle}text-align:center;">No hotel available</td>
            </tr>
          `;

  return `
        <div style="${styles.centerTitleStyle}margin-top:${groupIndex === 0 ? '10px' : '34px'};">
          ${escapeHtml(sectionTitle)} - ${groupIndex + 1}
        </div>

        <table width="700" border="1" cellpadding="0" cellspacing="0" style="${styles.tableStyle}">
          <tr>
            <th style="${styles.headerCellStyle}width:20%;">Day</th>
            <th style="${styles.headerCellStyle}width:20%;">Destination</th>
            <th style="${styles.headerCellStyle}width:20%;">Hotel Name -<br/>Category</th>
            <th style="${styles.headerCellStyle}width:20%;">Room Type -<br/>Count</th>
            <th style="${styles.headerCellStyle}width:20%;">Meal Plan</th>
          </tr>
          ${rowsHtml}
        </table>

        ${vehicleSectionHtml}
        ${costSectionHtml}
      `;
};
