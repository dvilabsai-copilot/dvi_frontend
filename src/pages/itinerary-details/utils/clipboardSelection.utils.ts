export type ClipboardSelectionGroup<THotel = unknown> = {
  label: string;
  groupType: number;
  hotels: THotel[];
};

export const getClipboardSelectionKey = (groupType: number): string =>
  `clipboard-group-${Number(groupType)}`;

export const buildSelectedClipboardGroups = <THotel>(
  recommendations: Array<{ label: string; groupType: number; hotels: THotel[] }>,
  selectedHotels: Record<string, boolean>,
): ClipboardSelectionGroup<THotel>[] => recommendations
  .filter((item) => selectedHotels[getClipboardSelectionKey(item.groupType)])
  .map((item) => ({ label: item.label, groupType: item.groupType, hotels: item.hotels }));
