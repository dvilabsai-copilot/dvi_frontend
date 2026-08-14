// FILE: src/pages/CreateItinerary/SaveRouteConfirmDialog.tsx

import React, { useEffect, useRef } from "react";

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
};

export const SaveRouteConfirmDialog: React.FC<Props> = ({
  open,
  isSaving,
  onSaveSameRoute,
}) => {
  const autoSaveTriggeredRef = useRef(false);

  useEffect(() => {
    if (!open) {
      autoSaveTriggeredRef.current = false;
      return;
    }

    if (isSaving || autoSaveTriggeredRef.current) return;

    autoSaveTriggeredRef.current = true;
    onSaveSameRoute();
  }, [open, isSaving, onSaveSameRoute]);

  return null;
};