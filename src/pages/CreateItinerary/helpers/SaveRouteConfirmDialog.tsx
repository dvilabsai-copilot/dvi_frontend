// FILE: src/pages/CreateItinerary/SaveRouteConfirmDialog.tsx

import React from "react";
import { ItineraryPageLoader } from "../../itinerary-details/components/ItineraryPageLoader";

type Props = {
  open: boolean;
  isSaving: boolean;
  progressPercent: number;
  estimatedSeconds: number;
  dayCount: number;
  saveType: "itineary_basic_info" | "itineary_basic_info_with_optimized_route" | null;
  transportLoadingMessage?: string;
  onClose: () => void;
  onSaveSameRoute: () => void;
  onOptimizeRoute: () => void;
  suggestedRouteSelected?: boolean;
};

export const SaveRouteConfirmDialog: React.FC<Props> = ({
  open,
  isSaving,
  saveType,
  transportLoadingMessage,
  onClose,
  onSaveSameRoute,
  onOptimizeRoute,
  suggestedRouteSelected = false,
}) => {
  const autoSuggestedSaveStartedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) {
      autoSuggestedSaveStartedRef.current = false;
      return;
    }

    if (
      suggestedRouteSelected &&
      !isSaving &&
      !autoSuggestedSaveStartedRef.current
    ) {
      autoSuggestedSaveStartedRef.current = true;
      onSaveSameRoute();
    }
  }, [open, isSaving, suggestedRouteSelected, onSaveSameRoute]);

  if (!open) return null;

  // Suggested Routes are already chosen by the user.
  // Skip the extra confirmation screen and save directly.
  if (suggestedRouteSelected && !isSaving) {
    return null;
  }

  if (!isSaving) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            aria-label="Close route options"
          >
            &times;
          </button>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe9d6]">
            <span className="text-3xl">&#x1F9ED;</span>
          </div>
          <p className="text-sm text-slate-600">
            {suggestedRouteSelected ? "Your selected Suggested Route is ready to create." : "We found a better route for a smoother travel experience."}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={onSaveSameRoute}
              className="min-w-[170px] rounded-md bg-[#19b96b] px-6 py-2 text-sm font-semibold text-white shadow hover:bg-[#12a05b]"
            >
              {suggestedRouteSelected ? "Continue with Suggested Route" : "Continue with My Route"}
            </button>
            {!suggestedRouteSelected && (
              <button
                type="button"
                onClick={onOptimizeRoute}
                className="min-w-[170px] rounded-md bg-[#e0e0e0] px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-[#d4d4d4]"
              >
                Show Better Route
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <ItineraryPageLoader
          stage={saveType === "itineary_basic_info_with_optimized_route" ? "Optimizing route" : "Building itinerary details"}
          detail={transportLoadingMessage || "Analyzing destinations"}
          history={transportLoadingMessage ? [transportLoadingMessage] : []}
        />
      </div>
    </div>
  );
};
