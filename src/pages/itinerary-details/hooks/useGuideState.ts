import { useState } from "react";

export function useGuideState() {
  const [guideAssignments, setGuideAssignments] = useState<any[]>([]);
  const [guideAvailability, setGuideAvailability] = useState<any | null>(null);
  const [guideAvailabilityLoading, setGuideAvailabilityLoading] = useState(false);
  const [guideModal, setGuideModal] = useState<any>({ open: false, loading: false, saving: false, planId: null, day: null, routeGuideId: null, guideType: 2, guideLanguage: "", guideSlots: [], options: { languages: [], slots: [], assignment: null } });
  const [deleteGuideModal, setDeleteGuideModal] = useState<any>({ open: false, assignment: null, deleting: false });
  return {
    guideAssignments, setGuideAssignments, guideAvailability, setGuideAvailability,
    guideAvailabilityLoading, setGuideAvailabilityLoading, guideModal, setGuideModal,
    deleteGuideModal, setDeleteGuideModal,
  };
}
