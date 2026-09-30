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
  packageTotalHtml,
  costSectionHtml,
  styles,
}: {
  hotels: unknown[];
  roomCount: unknown;
  groupIndex: number;
  sectionTitle: string;
  vehicleSectionHtml: string;
  packageTotalHtml: string;
  costSectionHtml: string;
  styles: {
    tableStyle: string;
    cellStyle: string;
    headerCellStyle: string;
    centerTitleStyle: string;
  };
}): string => {
const normalizeClipboardDate = (value: unknown): string => {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '';
  }

  return raw.slice(0, 10);
};

const clipboardHotels = hotels.flatMap((hotel: any) => {
  const legItinerary = hotel?.__clipboardLegItinerary;

  const expandedRows = expandHotelRowsForClipboard([hotel]);

  return expandedRows.map((expandedHotel: any) => {
    const hotelDate = normalizeClipboardDate(
      expandedHotel.startDate ??
      expandedHotel.date ??
      expandedHotel.checkInDate ??
      expandedHotel.hotelCheckInDate
    );

    const matchingDay = Array.isArray(legItinerary?.days)
      ? legItinerary.days.find((day: any) => {
          const dayDate = normalizeClipboardDate(
            day.startDate ??
            day.date ??
            day.travelDate
          );

          return Boolean(
            hotelDate &&
            dayDate &&
            hotelDate === dayDate
          );
        })
      : undefined;

    const stayDestination =
      String(
        expandedHotel.destination ??
        expandedHotel.destinationName ??
        expandedHotel.hotelDestination ??
        expandedHotel.cityName ??
        expandedHotel.city ??
        ''
      ).trim() ||
      String(
        matchingDay?.destination ??
        matchingDay?.destinationName ??
        matchingDay?.cityName ??
        matchingDay?.city ??
        ''
      ).trim();

    return {
      ...expandedHotel,
      destination: stayDestination,
    };
  });
});

  const rowsHtml = clipboardHotels.length > 0
    ? clipboardHotels.map((hotel, index) => {
        const isDayZero =
          hotel.__clipboardDayZero === true ||
          hotel.previousDayBillingSynthetic === true;

        const hotelName = isDayZero
          ? `${String(hotel.hotelName || '--')} (Early check-in room block)`
          : String(hotel.hotelName || '--');

        const rawHotelCategory = String(hotel.category ?? '').trim();

        const hotelCategorySuffix =
          rawHotelCategory && Number(rawHotelCategory) !== 0
            ? ` - ${escapeHtml(rawHotelCategory)}`
            : '';

        return `
          <tr>
            <td style="${styles.cellStyle}white-space:nowrap;">
              ${escapeHtml(getClipboardHotelDayLabel(hotel, index + 1))}
            </td>

            <td style="${styles.cellStyle}">
              ${escapeHtml(hotel.destination)}
            </td>

            <td style="${styles.cellStyle}">
              ${escapeHtml(hotelName)}${hotelCategorySuffix}
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
          <td colspan="5" style="${styles.cellStyle}text-align:center;">
            No hotel available
          </td>
        </tr>
      `;

  return `
    <div style="${styles.centerTitleStyle}margin-top:${groupIndex === 0 ? '10px' : '34px'};">
      ${escapeHtml(sectionTitle)} - ${groupIndex + 1}
    </div>

    <table
      width="700"
      border="1"
      cellpadding="0"
      cellspacing="0"
      style="${styles.tableStyle}"
    >
      <tr>
        <th style="${styles.headerCellStyle}width:20%;">Day</th>
        <th style="${styles.headerCellStyle}width:20%;">Destination</th>
        <th style="${styles.headerCellStyle}width:20%;">
          Hotel Name -<br/>Category
        </th>
        <th style="${styles.headerCellStyle}width:20%;">
          Room Type -<br/>Count
        </th>
        <th style="${styles.headerCellStyle}width:20%;">Meal Plan</th>
      </tr>

      ${rowsHtml}
    </table>

    ${vehicleSectionHtml}

    ${packageTotalHtml}

    ${costSectionHtml}
  `;
};