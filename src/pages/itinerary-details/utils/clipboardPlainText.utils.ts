import {
  expandHotelRowsForClipboard,
  getClipboardHotelDayLabel,
} from './clipboardHotelRows.utils';

export const buildClipboardPlainText = ({
  groups,
  roomCount,
  sectionTitle,
}: {
  groups: Array<{ hotels: unknown[] }>;
  roomCount: unknown;
  sectionTitle: string;
}): string => groups
  .map((group, groupIndex) => {
    const hotelLines = expandHotelRowsForClipboard(group.hotels)
      .map((hotel, index) => {
        const isDayZero =
          hotel.__clipboardDayZero === true || hotel.previousDayBillingSynthetic === true;
        const hotelName = isDayZero
          ? `${String(hotel.hotelName || '--')} (Early check-in room block)`
          : String(hotel.hotelName || '--');

        const rawHotelCategory = String(hotel.category ?? '').trim();
        const hotelCategorySuffix =
          rawHotelCategory && Number(rawHotelCategory) !== 0
            ? ` - ${rawHotelCategory}`
            : '';

      return `${getClipboardHotelDayLabel(hotel, index + 1)} | ${hotel.destination} | ${hotelName}${hotelCategorySuffix} | ${hotel.roomType} - ${roomCount} | ${hotel.mealPlan || 'CP'}`;
      })
      .join('\n');

    return `${sectionTitle} - ${groupIndex + 1}\n${hotelLines}`;
  })
  .join('\n\n');