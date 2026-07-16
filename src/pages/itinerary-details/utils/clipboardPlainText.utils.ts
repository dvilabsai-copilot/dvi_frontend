type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

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
    const hotelLines = group.hotels
      .map((hotelValue, index) => {
        const hotel = asRecord(hotelValue);
        return `Day-${index + 1} | ${hotel.day} | ${hotel.destination} | ${hotel.hotelName} - ${hotel.category} | ${hotel.roomType} - ${roomCount} | ${hotel.mealPlan || 'CP'}`;
      })
      .join('\n');
    return `${sectionTitle} - ${groupIndex + 1}\n${hotelLines}`;
  })
  .join('\n\n');
