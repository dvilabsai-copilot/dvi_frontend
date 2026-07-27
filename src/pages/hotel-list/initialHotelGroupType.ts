export type HotelTabGroup = { groupType?: number | string | null };

export function getInitialHotelGroupType(
  activeGroupType: number | null,
  hotelTabs: HotelTabGroup[] | null | undefined,
): number | null {
  if (activeGroupType) return activeGroupType;
  if (!hotelTabs?.length) return null;

  const firstGroupType = Number(hotelTabs[0]?.groupType || 1);
  return Number.isFinite(firstGroupType) && firstGroupType > 0 ? firstGroupType : 1;
}
