import { escapeHtml } from './clipboardFormatting.utils';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

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
  const rowsHtml = hotels.length > 0
    ? hotels.map((hotelValue, index) => {
      const hotel = asRecord(hotelValue);
      return `
                  <tr>
                    <td style="${styles.cellStyle}white-space:nowrap;">
                      Day- ${index + 1} | ${escapeHtml(hotel.date || hotel.day)}
                    </td>
                    <td style="${styles.cellStyle}">
                      ${escapeHtml(hotel.destination)}
                    </td>
                    <td style="${styles.cellStyle}">
                      ${escapeHtml(hotel.hotelName)} - ${escapeHtml(hotel.category)}
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
