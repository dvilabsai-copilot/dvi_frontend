import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type ManualFitHereResultType =
  | "FITS_DIRECTLY"
  | "FITS_WITH_OPTIONAL_REMOVAL"
  | "REQUIRES_P3_CONFIRMATION"
  | "PRIORITY_CONFLICT"
  | "CANNOT_FIT"
  | "CONFLICT_ONLY";

export type ManualFitHerePreviewResponse = {
  attemptId: string;
  planId: number;
  routeId: number;
  selectedHotspotId: number;
  resultType: ManualFitHereResultType;
  canConfirm: boolean;
  canForceConflict?: boolean;
  requiresP3Confirmation?: boolean;
  requiresP1P2Override?: boolean;
  acceptedReason?: string | null;
  rejectedReasons?: string[];
  proposedTimeline?: any[];
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
};

type FitHereStepStatus =
  | "pending"
  | "running"
  | "passed"
  | "warning"
  | "failed"
  | "info"
  | "PASSED"
  | "WARNING"
  | "FAILED";

type FitHereProgressStep = {
  id: string;
  label: string;
  status: FitHereStepStatus;
  message: string;
};

const FIT_HERE_LOADING_STEPS: Array<Omit<FitHereProgressStep, "status">> = [
  {
    id: "timeline",
    label: "Reading current itinerary timeline",
    message: "Loading the existing travel, attraction, activity, and hotel rows.",
  },
  {
    id: "hotspot",
    label: "Checking selected hotspot details",
    message: "Reading duration, city, opening hours, closing hours, and priority rules.",
  },
  {
    id: "anchor",
    label: "Checking insertion position",
    message: "Resolving the exact Fit Here position selected on the timeline.",
  },
  {
    id: "travel_from_previous",
    label: "Calculating travel from previous stop",
    message: "Checking drive time from the previous itinerary row to the selected hotspot.",
  },
  {
    id: "travel_to_next",
    label: "Calculating travel to next stop",
    message: "Checking drive time from the selected hotspot to the next itinerary row.",
  },
  {
    id: "arrival_time",
    label: "Checking arrival time",
    message: "Verifying when the guest can realistically reach the inserted hotspot.",
  },
  {
    id: "opening_hours",
    label: "Checking opening and closing hours",
    message: "Validating whether the visit stays inside the hotspot timing window.",
  },
  {
    id: "priority_protection",
    label: "Checking P1/P2 priority protection",
    message: "Ensuring priority hotspots are not removed or invalidated.",
  },
  {
    id: "optional_removal",
    label: "Checking optional hotspot removal options",
    message: "Testing whether P3/P4 or optional rows can be adjusted safely.",
  },
  {
    id: "route_end",
    label: "Checking route end and hotel timing",
    message: "Ensuring the route can still finish within the planned day timing.",
  },
  {
    id: "timeline_build",
    label: "Building proposed timeline preview",
    message: "Preparing the final before/after route preview.",
  },
];

const normalizeFitHereStatus = (status: FitHereStepStatus): FitHereStepStatus => {
  if (status === "PASSED") return "passed";
  if (status === "WARNING") return "warning";
  if (status === "FAILED") return "failed";
  return status;
};

const getStepIcon = (status: FitHereStepStatus) => {
  const normalized = normalizeFitHereStatus(status);

  if (normalized === "passed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
  }

  if (normalized === "running") {
    return <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />;
  }

  if (normalized === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }

  if (normalized === "failed") {
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  }

  return <Circle className="h-4 w-4 text-slate-300" />;
};

const getStepTextClass = (status: FitHereStepStatus) => {
  const normalized = normalizeFitHereStatus(status);

  if (normalized === "passed") return "text-slate-800";
  if (normalized === "running") return "text-emerald-800";
  if (normalized === "warning") return "text-amber-800";
  if (normalized === "failed") return "text-red-800";

  return "text-slate-400";
};

const buildLoadingSteps = (activeStepIndex: number): FitHereProgressStep[] =>
  FIT_HERE_LOADING_STEPS.map((step, index) => {
    if (index < activeStepIndex) {
      return { ...step, status: "passed" };
    }

    if (index === activeStepIndex) {
      return { ...step, status: "running" };
    }

    return { ...step, status: "pending" };
  });

type ManualFitHerePreviewDialogProps = {
  open: boolean;
  loading?: boolean;
  loadingStepIndex?: number;
  failedReason?: string | null;
  attempt: ManualFitHerePreviewResponse | null;
  selectedHotspot?: any | null;
  onClose: () => void;
  onConfirm: () => void;
  onRetry?: () => void;
  confirmLoading?: boolean;
};

const getResultConfig = (resultType?: ManualFitHereResultType) => {
  switch (resultType) {
    case "FITS_DIRECTLY":
      return {
        badge: "Can Fit Directly",
        wrapperClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
        badgeClass: "bg-emerald-700 text-white",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    case "FITS_WITH_OPTIONAL_REMOVAL":
      return {
        badge: "Can Fit With Changes",
        wrapperClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
        badgeClass: "bg-emerald-700 text-white",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    case "REQUIRES_P3_CONFIRMATION":
      return {
        badge: "Needs Confirmation",
        wrapperClass: "border-amber-200 bg-amber-50 text-amber-900",
        badgeClass: "bg-amber-600 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    case "PRIORITY_CONFLICT":
      return {
        badge: "Priority Conflict",
        wrapperClass: "border-red-200 bg-red-50 text-red-900",
        badgeClass: "bg-red-600 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    case "CONFLICT_ONLY":
      return {
        badge: "Conflict Only",
        wrapperClass: "border-red-200 bg-red-50 text-red-900",
        badgeClass: "bg-red-600 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    default:
      return {
        badge: "Cannot Fit",
        wrapperClass: "border-slate-200 bg-slate-50 text-slate-800",
        badgeClass: "bg-slate-700 text-white",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
  }
};

const getFitHereResultMessage = (attempt: ManualFitHerePreviewResponse | null): string => {
  if (!attempt) return "";

  switch (attempt.resultType) {
    case "FITS_DIRECTLY":
      return "This hotspot fits at the selected position without removing any existing hotspot.";

    case "FITS_WITH_OPTIONAL_REMOVAL":
    case "REQUIRES_P3_CONFIRMATION":
      return "This hotspot can fit here, but the following optional/lower-priority hotspots must be removed.";

    case "PRIORITY_CONFLICT":
      return "This hotspot cannot fit here without affecting priority hotspots.";

    case "CANNOT_FIT":
    case "CONFLICT_ONLY":
    default:
      return "This hotspot cannot fit at this position because of timing, opening-hour, or route-window constraints.";
  }
};

const getRowName = (row: any): string =>
  String(
    row?.name ||
      row?.title ||
      row?.hotspot_name ||
      row?.text ||
      row?.to ||
      row?.type ||
      "Row",
  );

const getRowTime = (row: any): string =>
  String(
    row?.timeRange ||
      row?.visitTime ||
      row?.startTime ||
      row?.hotspot_start_time ||
      "",
  );

const getShortName = (name: string): string => {
  if (!name) return "Row";
  return name
    .replace(/Temple/gi, "")
    .replace(/Swamy/gi, "Swamy")
    .replace(/Amman/gi, "Amman")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
};

const getHotspotDurationLabel = (hotspot: any): string => {
  const raw = hotspot?.timeSpend || hotspot?.duration || hotspot?.durationLabel || "";
  if (!raw) return "";

  if (typeof raw === "number") {
    if (raw >= 60) {
      const hours = Math.floor(raw / 60);
      const minutes = raw % 60;
      return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    }

    return `${raw} min`;
  }

  return String(raw);
};

const getHotspotTimingLabel = (hotspot: any): string =>
  String(hotspot?.timings || hotspot?.openingHours || hotspot?.operatingHours || "");

export function ManualFitHerePreviewDialog({
  open,
  loading = false,
  loadingStepIndex = 0,
  failedReason = null,
  attempt,
  selectedHotspot,
  onClose,
  onConfirm,
  onRetry,
  confirmLoading = false,
}: ManualFitHerePreviewDialogProps) {
  if (!open) return null;

  const config = getResultConfig(attempt?.resultType);
  const removed = attempt?.removedHotspots || [];
  const shifted = attempt?.shiftedHotspots || [];
  const affectedPriority = attempt?.affectedPriorityHotspots || [];
  const timeline = attempt?.proposedTimeline || [];
  const reason =
    attempt?.acceptedReason ||
    attempt?.rejectedReasons?.[0] ||
    "Fit Here preview calculated.";
  const resultMessage = getFitHereResultMessage(attempt);

  const hotspotName =
    selectedHotspot?.name ||
    selectedHotspot?.title ||
    (attempt?.selectedHotspotId ? `Hotspot #${attempt.selectedHotspotId}` : "Selected hotspot");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        overlayClassName="z-[240] bg-black/60 pointer-events-none"
        className="pointer-events-auto z-[260] grid w-[96vw] max-w-3xl gap-0 overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl [&>button]:hidden"
      >
        <div className="flex max-h-[calc(100vh-2rem)] min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Fit Here Preview
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  {hotspotName} insertion preview
                </DialogDescription>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close Fit Here preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
              <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Optimising this insertion position...
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Checking timing, travel, opening hours, priority protection, optional removals,
                      and route feasibility.
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        95,
                        Math.max(8, ((loadingStepIndex + 1) / FIT_HERE_LOADING_STEPS.length) * 100),
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] font-medium text-emerald-800">
                  Step {Math.min(loadingStepIndex + 1, FIT_HERE_LOADING_STEPS.length)} of{" "}
                  {FIT_HERE_LOADING_STEPS.length}
                </p>
              </div>

              <div className="space-y-2">
                {buildLoadingSteps(loadingStepIndex).map((step) => (
                  <div
                    key={step.id}
                    className={[
                      "flex gap-3 rounded-xl border p-3 transition",
                      normalizeFitHereStatus(step.status) === "running"
                        ? "border-emerald-200 bg-white shadow-sm"
                        : "border-slate-100 bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="mt-0.5 shrink-0">{getStepIcon(step.status)}</div>

                    <div>
                      <p className={`text-sm font-bold ${getStepTextClass(step.status)}`}>
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{step.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Please wait while we test travel timing, opening hours, priority protection,
                shifted rows, optional removals, and final route feasibility.
              </p>
            </div>
          ) : failedReason ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Could not calculate Fit Here preview.</p>
                    <p className="mt-2 text-sm">
                      {failedReason || "The optimiser could not complete the preview calculation."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                This may happen if matrix data, timing data, or the selected route state changed while
                the preview was being calculated.
              </div>
            </div>
          ) : attempt ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-5 px-6 py-5">
                <section className={`flex gap-3 rounded-xl border p-4 ${config.wrapperClass}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70">
                    {config.icon}
                  </div>

                  <div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${config.badgeClass}`}>
                      {config.badge}
                    </span>
                    <p className="mt-2 text-sm leading-5">{resultMessage}</p>
                    {reason && reason !== resultMessage ? (
                      <p className="mt-2 text-xs text-slate-600">
                        Technical reason: {reason}
                      </p>
                    ) : null}
                  </div>
                </section>

                {attempt?.selectedAnchor && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <span className="font-bold">Insert position:</span>{" "}
                    {attempt.selectedAnchor.anchorLabel ||
                      attempt.anchorLabel ||
                      "Selected Fit Here position"}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Selected Hotspot
                      </p>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-emerald-700" />
                        <span className="font-bold text-slate-900">{hotspotName}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                        {getHotspotDurationLabel(selectedHotspot) && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getHotspotDurationLabel(selectedHotspot)}
                          </span>
                        )}

                        {getHotspotTimingLabel(selectedHotspot) && (
                          <span>{getHotspotTimingLabel(selectedHotspot)}</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Insert Position
                      </p>

                      <p className="text-sm font-semibold text-slate-900">
                        {attempt.selectedAnchor?.anchorLabel ||
                          attempt.anchorLabel ||
                          "Selected Fit Here position"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Changes Required
                    </p>

                    <div className="space-y-3">
                      {removed.length === 0 && shifted.length === 0 && affectedPriority.length === 0 && (
                        <p className="text-sm text-slate-600">
                          No existing hotspot removal is required.
                        </p>
                      )}

                      {removed.map((row: any, index: number) => (
                        <div key={`removed-${row?.hotspotId || row?.id || index}`} className="flex gap-2">
                          <Trash2 className="mt-0.5 h-4 w-4 text-red-600" />
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              Removed:{" "}
                              {row?.name ||
                                row?.hotspotName ||
                                row?.hotspot_name ||
                                `Hotspot #${row?.hotspotId || row?.id || index + 1}`}
                            </p>
                            <p className="text-xs text-slate-500">
                              {row?.reason || "Removed to fit route timing."}
                            </p>
                          </div>
                        </div>
                      ))}

                      {shifted.map((row: any, index: number) => (
                        <div key={`shifted-${row?.hotspotId || index}`} className="flex gap-2">
                          <RefreshCw className="mt-0.5 h-4 w-4 text-violet-600" />
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              Shifted: {row?.name || `Hotspot #${row?.hotspotId || index + 1}`}
                            </p>
                            <p className="text-xs text-slate-500">
                              {row?.fromTime && row?.toTime
                                ? `${row.fromTime} -> ${row.toTime}`
                                : row?.reason || "Shifted after insertion."}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <div
                        className={[
                          "flex items-center gap-2 text-xs font-bold",
                          affectedPriority.length === 0 ? "text-emerald-800" : "text-red-700",
                        ].join(" ")}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {affectedPriority.length === 0
                          ? "No P1/P2 hotspot is removed."
                          : `${affectedPriority.length} priority hotspot(s) affected.`}
                      </div>
                    </div>
                  </div>
                </div>

                {affectedPriority.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                    <p className="font-bold">Priority impact</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {affectedPriority.map((row: any, index: number) => (
                        <li key={`priority-${row?.hotspotId || row?.id || index}`}>
                          {row?.name || row?.hotspotName || "Priority hotspot"} -{" "}
                          {row?.reason || "Would be removed or become invalid."}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <section>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Horizontal Timeline Preview
                  </p>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex min-w-max items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div className="mb-2 h-3 w-3 rounded-full bg-emerald-700" />
                        <span className="text-[11px] font-medium text-slate-500">Start</span>
                      </div>

                      {timeline.slice(0, 14).map((row: any, index: number) => {
                        const name = getRowName(row);
                        const rowHotspotId = Number(row?.hotspotId || row?.locationId || row?.hotspot_ID || 0);
                        const isManual =
                          row?.isManual === true ||
                          row?.manual === true ||
                          rowHotspotId === Number(attempt.selectedHotspotId);
                        const isRemoved = row?.removed === true || row?.isRemoved === true;
                        const isConflict = row?.isConflict === true;

                        return (
                          <React.Fragment key={`${name}-${index}`}>
                            <div className="h-[2px] w-8 shrink-0 bg-emerald-700/25" />

                            <div
                              className={[
                                "flex min-w-[110px] flex-col items-center rounded-lg border px-3 py-2 text-center",
                                isManual
                                  ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-2"
                                  : isRemoved
                                    ? "border-dashed border-slate-300 bg-slate-50 opacity-50"
                                    : isConflict
                                      ? "border-red-300 bg-red-50"
                                      : "border-slate-200 bg-slate-50",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "text-xs font-bold",
                                  isManual
                                    ? "text-emerald-800"
                                    : isRemoved
                                      ? "text-slate-400 line-through"
                                      : "text-slate-800",
                                ].join(" ")}
                              >
                                {getShortName(name)}
                              </span>

                              <span className="mt-1 text-[10px] text-slate-500">
                                {getRowTime(row)}
                              </span>

                              {isManual && (
                                <span className="mt-1 text-[10px] font-bold uppercase text-emerald-700">
                                  Inserted
                                </span>
                              )}

                              {isRemoved && (
                                <span className="mt-1 text-[10px] font-bold uppercase text-red-600">
                                  Removed
                                </span>
                              )}

                              {isConflict && (
                                <span className="mt-1 text-[10px] font-bold uppercase text-red-600">
                                  Conflict
                                </span>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}

                      <div className="h-[2px] w-8 shrink-0 bg-emerald-700/25" />

                      <div className="flex flex-col items-center">
                        <div className="mb-2 h-3 w-3 rounded-full bg-slate-500" />
                        <span className="text-[11px] font-medium text-slate-500">Hotel</span>
                      </div>
                    </div>
                  </div>
                </section>

                {attempt?.suggestedAlternativePositions && attempt.suggestedAlternativePositions.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Suggested alternatives only
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      These are not selected. Click a different Fit Here button if you want to test another position.
                    </p>
                    <div className="mt-3 space-y-2">
                      {attempt.suggestedAlternativePositions.map((slot, index) => (
                        <div key={`alternative-${index}`} className="rounded-lg border border-white bg-white px-3 py-2 text-xs text-slate-700">
                          {slot?.label || `Alternative position ${index + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {attempt.attemptLog && attempt.attemptLog.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Optimiser Decision Log
                    </p>
                    <div className="space-y-2">
                      {attempt.attemptLog.map((log: any, index: number) => {
                        const status = normalizeFitHereStatus((log.status || "info") as FitHereStepStatus);
                        const label = log.label || log.step || `Check ${index + 1}`;
                        const message = log.message || log.reason || "Check completed.";

                        return (
                          <div
                            key={`${label}-${index}`}
                            className="flex gap-3 rounded-lg border border-white bg-white px-3 py-2"
                          >
                            <div className="mt-0.5 shrink-0">{getStepIcon(status)}</div>

                            <div>
                              <p className={`text-xs font-bold ${getStepTextClass(status)}`}>
                                {label}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">{message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            {failedReason && onRetry && (
              <Button type="button" variant="outline" onClick={onRetry}>
                Retry
                <RefreshCw className="ml-2 h-4 w-4" />
              </Button>
            )}

            <Button
              type="button"
              onClick={onConfirm}
              disabled={!attempt?.canConfirm || confirmLoading || loading || Boolean(failedReason)}
              className="bg-emerald-700 text-white hover:bg-emerald-800"
            >
              {confirmLoading ? "Confirming..." : "Confirm Fit Here"}
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
