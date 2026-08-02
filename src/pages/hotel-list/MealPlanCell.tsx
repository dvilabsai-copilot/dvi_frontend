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
  const rawText = String(mealPlanText || "").trim();
  const multiplePlans = rawText
    .split("/")
    .map((value) => normalizeMealPlanLabel(value.trim()))
    .filter((value) => value !== "UNKNOWN");
  const text = multiplePlans.length > 1
    ? Array.from(new Set(multiplePlans)).join(" / ")
    : normalizeMealPlanLabel(rawText);

  if (multiplePlans.length > 1) {
    return (
      <span title="Meal plans available in supplier rate conditions">
        {text}
      </span>
    );
  }

  if (!selectedCode || selectedCode === "__ALL__") return <span>{text}</span>;

  const roomCode = normalizedLabelToCode(text);
  const matches = roomCode === selectedCode;
  if (!roomCode) {
    return (
      <span className="text-amber-700" title="Meal plan is not available in structured supplier data">
        {text}
      </span>
    );
  }

  if (matches) {
    return (
      <span className="font-medium" title={`Matches requested plan: ${MEAL_CODE_LABEL[selectedCode]}`}>
        {text}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300"
      title={`Available meal plan: ${roomCode}; requested: ${MEAL_CODE_LABEL[selectedCode] ?? selectedCode}`}
    >
      {text} - Unavailable for {MEAL_CODE_LABEL[selectedCode] ?? selectedCode}
    </span>
  );
};
