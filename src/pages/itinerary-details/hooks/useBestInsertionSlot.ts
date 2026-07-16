/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";

type UseBestInsertionSlotOptions = {
  matrixRequiresBuild: boolean;
  normalizedInsertionSlots: any[];
};

/** Selects the preferred normalized insertion slot for preview summaries. */
export const useBestInsertionSlot = ({
  matrixRequiresBuild,
  normalizedInsertionSlots,
}: UseBestInsertionSlotOptions) => useMemo(() => {
  if (matrixRequiresBuild) return null;
  const slots = normalizedInsertionSlots;

  if (slots.length === 0) return null;

  return slots.find((slot) => slot?.isBest)
    || [...slots].sort(
      (a, b) => Number(a?.distanceDelta || 0) - Number(b?.distanceDelta || 0),
    )[0]
    || null;
}, [matrixRequiresBuild, normalizedInsertionSlots]);
