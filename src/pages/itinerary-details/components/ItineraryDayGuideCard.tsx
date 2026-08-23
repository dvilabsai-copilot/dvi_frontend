import { Edit, Trash2 } from "lucide-react"; 
import type { ItineraryGuideAssignment } from "../itinerary-details.types";
import { getEffectiveGuideSlotLabel } from "../utils/guideAssignment.utils";

type ItineraryDayGuideCardProps = { 
  assignment: ItineraryGuideAssignment;
  dayStartTime?: string | null;
  dayEndTime?: string | null;
  readOnly: boolean; 
  onEdit: () => void; 
  onDelete: () => void; 
};

/** Renders the assigned guide summary and its edit/delete controls for a day. */
export function ItineraryDayGuideCard({
  assignment,
  dayStartTime,
  dayEndTime,
  readOnly,
  onEdit,
  onDelete,
}: ItineraryDayGuideCardProps) {
  const effectiveSlotLabels =
    Array.isArray(assignment.guideSlotIds) &&
    assignment.guideSlotIds.length > 0
      ? assignment.guideSlotIds
          .map((slotId, index) =>
            getEffectiveGuideSlotLabel(
              Number(slotId),
              dayStartTime,
              dayEndTime,
              assignment.guideSlotLabels[index] || "",
            ),
          )
          .filter((label): label is string => Boolean(label))
      : assignment.guideSlotLabels;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-[#f8f5fc] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#4a4260]">Guide{assignment.guideLanguageLabels.length > 0 && <> Language - <span className="text-[#d546ab]">{assignment.guideLanguageLabels.join(", ")}</span></>}</p>
{effectiveSlotLabels.length > 0 && (
  <p className="mt-1 text-sm text-[#6c6c6c]">
    Slot Timing -{" "}
    <span className="font-medium text-[#4a4260]">
      {effectiveSlotLabels.join(", ")}
    </span>
  </p>
)}      </div>
      <div className="ml-4 flex items-center gap-2">
        <span className="text-lg font-bold text-[#d546ab]">₹ {Number(assignment.guideCost || 0).toFixed(2)}</span>
        {!readOnly && <><button type="button" className="rounded-full p-2 text-[#4a4260] hover:bg-white hover:text-[#d546ab]" onClick={onEdit} aria-label="Edit guide"><Edit className="h-4 w-4" /></button><button type="button" className="rounded-full p-2 text-[#4a4260] hover:bg-white hover:text-red-600" onClick={onDelete} aria-label="Delete guide"><Trash2 className="h-4 w-4" /></button></>}
      </div>
    </div>
  );
}

export default ItineraryDayGuideCard;
