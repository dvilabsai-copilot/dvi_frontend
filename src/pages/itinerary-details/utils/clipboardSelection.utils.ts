export type ClipboardSelectionGroup<THotel = unknown> = {
  label: string;
  groupType: number;
  hotels: THotel[];
};

export const buildSelectedClipboardGroups = <THotel>(
  recommendations: Array<{ label: string; groupType: number; hotels: THotel[] }>,
  selectedHotels: Record<string, boolean>,
): ClipboardSelectionGroup<THotel>[] => recommendations
  .filter((_item, index) => selectedHotels[`para-${index}`])
  .map((item) => ({ label: item.label, groupType: item.groupType, hotels: item.hotels }));
