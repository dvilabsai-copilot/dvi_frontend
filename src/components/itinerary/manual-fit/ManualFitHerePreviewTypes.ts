/* eslint-disable @typescript-eslint/no-explicit-any */

export type ManualFitHereResultType =
  | "FITS_DIRECTLY"
  | "FITS_WITH_OPTIONAL_REMOVAL"
  | "REQUIRES_P3_CONFIRMATION"
  | "PRIORITY_CONFLICT"
  | "CANNOT_FIT"
  | "CONFLICT_ONLY"
  | "SELECTED_HOTSPOT_CLOSED_AT_ATTEMPTED_TIME";

export type ManualFitHerePreviewResponse = {
  attemptId: string;
  planId: number;
  routeId: number;
  selectedHotspotId: number;
  resultType: ManualFitHereResultType;
  canConfirm: boolean;
  selectedAnchorPreserved?: boolean;
  canForceConflict?: boolean;
  exactAnchorMismatch?: {
    message?: string;
    anchorIntent?: "AFTER_START" | "AFTER_ATTRACTION";
    anchorFrom?: string | null;
    anchorTo?: string | null;
    afterHotspotId?: number | null;
    beforeHotspotId?: number | null;
  } | null;
  selectedOpeningConflict?: {
    hotspotId?: number;
    hotspotName?: string;
    attemptedVisitTime?: string;
    attemptedStartTime?: string;
    attemptedEndTime?: string;
    operatingHours?: string;
    openingTime?: string;
    closingTime?: string;
    reason?: string;
    reasonCode?: string;
  } | null;
  requiresTimingRiskConfirmation?: boolean;
  requiresPriorityRemovalConfirmation?: boolean;
  confirmButtonVariant?: "default" | "danger";
  timingRisk?: {
    type?: string;
    severity?: "warning" | "danger";
    hotspotId?: number;
    hotspotName?: string;
    proposedVisitStart?: string;
    proposedVisitEnd?: string;
    closingTime?: string;
    requestedDurationMinutes?: number;
    usableDurationMinutes?: number;
    overflowMinutes?: number;
    message?: string;
    canForceConfirm?: boolean;
  } | null;
  removedPrioritySummary?: {
    removedP3?: number;
    removedP2?: number;
    removedP1?: number;
    highestRemovedPriority?: number | null;
    removalOrder?: number[];
    requiresPriorityRemovalConfirmation?: boolean;
    severity?: "none" | "warning" | "danger";
    message?: string;
  } | null;
  changesRequiredDisplay?: {
    hasRemovals?: boolean;
    title?: string;
    removalOrderLabel?: string;
    removedItems?: Array<{
      hotspotId?: number;
      routeHotspotId?: number | null;
      name?: string;
      workPriority?: number | null;
      workPriorityLabel?: string;
      reason?: string | null;
    }>;
    noRemovalText?: string;
    exactAnchorFailure?: boolean;
  } | null;
  removalPolicy?: {
    allowP3Removal?: boolean;
    allowP1P2Removal?: boolean;
  } | null;
  requiresP3Confirmation?: boolean;
  requiresP1P2Override?: boolean;
  acceptedReason?: string | null;
  rejectedReasons?: string[];
  proposedTimeline?: any[];
  finalizedTimeline?: any[];
  authoritativeTimelineSource?: string;
  authoritativeRemovedHotspotIds?: number[];
  requiresRemovalAcknowledgementHotspotIds?: number[];
  removedHotspots?: any[];
  shiftedHotspots?: any[];
  affectedPriorityHotspots?: any[];
  anchorLabel?: string;
  selectedAnchor?: {
    anchorType?: string;
    anchorIntent?: "AFTER_START" | "AFTER_ATTRACTION";
    anchorIndex?: number;
    anchorFrom?: string | null;
    anchorTo?: string | null;
    anchorLabel?: string | null;
  } | null;
  expiresAt?: string;
  sourceFingerprint?: string;
  suggestedAlternativePositions?: Array<{
    label?: string;
    fromHotspotId?: number | null;
    toHotspotId?: number | null;
    slotIndex?: number | null;
  }>;
  attemptLog?: Array<{
    id?: string;
    label?: string;
    step?: string;
    status?: "pending" | "running" | "passed" | "warning" | "failed" | "info" | "PASSED" | "FAILED" | "WARNING";
    message?: string;
    reason?: string;
    details?: Record<string, any>;
  }>;
  resolution?: Record<string, any>;
  manualInsertionFit?: any;
};

export type FitHereStepStatus =
  | "pending"
  | "running"
  | "passed"
  | "warning"
  | "failed"
  | "info"
  | "PASSED"
  | "WARNING"
  | "FAILED";

export type FitHereProgressStep = {
  id: string;
  label: string;
  status: FitHereStepStatus;
  message: string;
};

export const FIT_HERE_LOADING_STEPS: Array<Omit<FitHereProgressStep, "status">> = [
  { id: "timeline", label: "Reading current itinerary timeline", message: "Loading the existing travel, attraction, activity, and hotel rows." },
  { id: "hotspot", label: "Checking selected hotspot details", message: "Reading duration, city, opening hours, closing hours, and priority rules." },
  { id: "anchor", label: "Checking insertion position", message: "Resolving the exact Fit Here position selected on the timeline." },
  { id: "travel_from_previous", label: "Calculating travel from previous stop", message: "Checking drive time from the previous itinerary row to the selected hotspot." },
  { id: "travel_to_next", label: "Calculating travel to next stop", message: "Checking drive time from the selected hotspot to the next itinerary row." },
  { id: "arrival_time", label: "Checking arrival time", message: "Verifying when the guest can realistically reach the inserted hotspot." },
  { id: "opening_hours", label: "Checking opening and closing hours", message: "Validating whether the visit stays inside the hotspot timing window." },
  { id: "priority_protection", label: "Checking Priority protection", message: "Ensuring important route hotspots are not removed unless allowed and proven necessary." },
  { id: "optional_removal", label: "Checking optional hotspot removal options", message: "Testing whether lower-priority or optional rows can be adjusted safely." },
  { id: "route_end", label: "Checking route end and hotel timing", message: "Ensuring the route can still finish within the planned day timing." },
  { id: "timeline_build", label: "Building proposed timeline preview", message: "Preparing the final before/after route preview." },
];

export type ManualFitHerePreviewDialogProps = {
  open: boolean;
  loading?: boolean;
  loadingStepIndex?: number;
  failedReason?: string | null;
  attempt: ManualFitHerePreviewResponse | null;
  selectedHotspot?: any | null;
  baseTimeline?: any[] | null;
  onClose: () => void;
  onConfirm: (options?: {
    allowClosedHotspotConflict?: boolean;
    allowTimingRisk?: boolean;
    acknowledgedRemovedHotspotIds?: number[];
  }) => void;
  onRetry?: () => void;
  confirmLoading?: boolean;
};
