import { useMemo } from "react";

type MatrixFitShape = {
  chosenSlot?: { attemptedSlotLabel?: unknown } | null;
  bestSlot?: { attemptedSlotLabel?: unknown } | null;
  destinationHotelName?: unknown;
} | null | undefined;

type DestinationInsertionSlotLabelOptions = {
  matrixFit: MatrixFitShape;
  selectedAnchorSlot?: unknown;
  selectedPreviewCityContext?: string | null;
  destinationCityLabel: string;
  destinationHotelDisplayName: string;
};

/** Normalizes the matrix/anchor insertion label shown for destination-side previews. */
export const useDestinationInsertionSlotLabel = ({
  matrixFit,
  selectedAnchorSlot,
  selectedPreviewCityContext,
  destinationCityLabel,
  destinationHotelDisplayName,
}: DestinationInsertionSlotLabelOptions): string => useMemo(() => {
  const preferredRaw = String(
    matrixFit?.chosenSlot?.attemptedSlotLabel
    || matrixFit?.bestSlot?.attemptedSlotLabel
    || selectedAnchorSlot
    || "",
  ).trim();
  const matrixDestinationName = String(matrixFit?.destinationHotelName || "").trim();
  const escapedDestinationName = matrixDestinationName
    ? matrixDestinationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "";
  const preferred = preferredRaw
    .replace(/^Will\s+be\s+inserted\s+/i, "")
    .replace(/^Insert\s+after\s+/i, "After ")
    .replace(/->\s*Hotel(\b|$)/i, destinationHotelDisplayName ? `-> ${destinationHotelDisplayName}` : "-> Hotel")
    .replace(escapedDestinationName ? new RegExp(escapedDestinationName, "gi") : /$^/, destinationHotelDisplayName || matrixDestinationName)
    .trim();
  if (preferred.length > 0) return preferred;
  if (selectedPreviewCityContext === "DESTINATION_CITY") return `After reaching ${destinationCityLabel}`;
  return "";
}, [destinationCityLabel, destinationHotelDisplayName, matrixFit, selectedAnchorSlot, selectedPreviewCityContext]);
