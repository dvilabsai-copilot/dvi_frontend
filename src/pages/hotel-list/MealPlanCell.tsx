import React from "react";
import {
  MEAL_CODE_LABEL,
  normalizeMealPlanLabel,
  normalizedLabelToCode,
} from "./hotelList.utils";

export const MealPlanCell: React.FC<{ mealPlanText: string; selectedCode?: string | null }> = ({
  mealPlanText,
  selectedCode,
}) => {
  const text = normalizeMealPlanLabel(mealPlanText);
  if (!selectedCode || selectedCode === "__ALL__") return <span>{text}</span>;
  const roomCode = normalizedLabelToCode(text);
  const matches = roomCode === selectedCode;
  return (
    <span className="flex items-center gap-1.5">
      <span>{text}</span>
      {matches ? (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-300" title={`Matches selected plan: ${MEAL_CODE_LABEL[selectedCode]}`}>
          ✓ {MEAL_CODE_LABEL[selectedCode]}
        </span>
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-300" title={`Selected: ${MEAL_CODE_LABEL[selectedCode] ?? selectedCode}`}>
          ⚠ {MEAL_CODE_LABEL[selectedCode] ?? selectedCode}
        </span>
      )}
    </span>
  );
};
