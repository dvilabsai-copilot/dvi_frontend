import { useMemo } from "react";

interface SummaryValuesOptions {
  netPayable: number;
  overallCost?: number | string | null;
  itinerary: Record<string, unknown> | null;
}

/** Derives stable summary strings used by the header and instructions card. */
export const useItinerarySummaryValues = ({ netPayable, overallCost, itinerary }: SummaryValuesOptions) => {
  const overallTripCostWithHotels = useMemo(
    () => Number(netPayable || overallCost || 0).toFixed(2),
    [netPayable, overallCost],
  );

  const specialInstructionsText = useMemo(() => {
    const source = itinerary as any;
    const rawValue = source?.special_instructions ?? source?.specialInstructions ?? source?.special_instruction
      ?? source?.specialInstruction ?? source?.plan?.special_instructions ?? source?.plan?.specialInstructions ?? "";
    return String(rawValue || "").trim();
  }, [itinerary]);

  return { overallTripCostWithHotels, specialInstructionsText };
};

