// FILE: src/pages/daily-moment-tracker/DailyMomentDayView.tsx
// Full multi-day accordion view for Daily Moment (replicated from PHP day_list)

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CarIcon,
  Star,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Camera,
  Download,
  CalendarDays,
  MoveRight,
  ChevronsRight,
  Timer,
  Gauge,
  ImageIcon,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

import {
  fetchDayView,
  DayViewPlan,
  DayViewDay,
  DayViewHotspot,
  DayViewActivity,
  DayViewGuide,
  updateHotspotStatus,
  updateActivityStatus,
  updateGuideStatus,
  updateWholedayGuideStatus,
  fetchDailyMomentCharges,
  upsertDailyMomentCharge,
  deleteDailyMomentCharge,
  upsertDriverRating,
  upsertGuideRating,
  deleteDriverRating,
  deleteGuideRating,
    saveOpeningKm,
  saveClosingKm,
  completeDailyMomentTrip,
  uploadDayImages,
uploadOpeningSpeedometerImage,
uploadClosingSpeedometerImage,
getDailyMomentDayImageUrl,
getDailyMomentSpeedometerImageUrl,
DailyMomentCharge,
} from "@/services/dailyMomentTracker";
import { fetchDriverRatings as fetchDriverRatingsApi } from "@/services/dailyMomentTracker";
import { fetchGuideRatings as fetchGuideRatingsApi } from "@/services/dailyMomentTracker";
import { KmModal, NotVisitedModal } from "./DailyMomentDayDialogs";

/* ============================================================ helpers */

function formatAmount(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "0.00";
  return Number(v).toFixed(2);
}

function formatB2BDate(value: string) {
  const parts = String(value || "").split("-");

  if (parts.length !== 3) {
    return value || "--";
  }

  const dd = Number(parts[0]);
  const mm = Number(parts[1]);
  const yyyy = Number(parts[2]);

  if (!dd || !mm || !yyyy) {
    return value || "--";
  }

  const date = new Date(yyyy, mm - 1, dd);

  if (Number.isNaN(date.getTime())) {
    return value || "--";
  }

  const month = date.toLocaleString("en-US", {
    month: "short",
  });

  return `${month} ${String(dd).padStart(2, "0")},${yyyy}`;
}

function formatB2BDayDate(value: string) {
  const parts = String(value || "").split("-");

  if (parts.length !== 3) {
    return value || "--";
  }

  const dd = Number(parts[0]);
  const mm = Number(parts[1]);
  const yyyy = Number(parts[2]);

  if (!dd || !mm || !yyyy) {
    return value || "--";
  }

  const date = new Date(yyyy, mm - 1, dd);

  if (Number.isNaN(date.getTime())) {
    return value || "--";
  }

  const weekday = date.toLocaleString("en-US", {
    weekday: "short",
  });

  return `${weekday}, ${formatB2BDate(value)}`;
}

function formatB2BTime(value: string) {
  if (!value || value === "--") return "--";
  return value.replace(":", ".");
}

function isTripCompletedByDate(value: string) {
  const parts = String(value || "").split("-");

  if (parts.length !== 3) return false;

  const dd = Number(parts[0]);
  const mm = Number(parts[1]);
  const yyyy = Number(parts[2]);

  if (!dd || !mm || !yyyy) return false;

  const tripEnd = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);

  if (Number.isNaN(tripEnd.getTime())) return false;

  return tripEnd.getTime() < Date.now();
}

function isB2BCurrentDay(value: string) {
  const routeDate = String(value || "").trim();

  const parts = routeDate.split("-");

  if (parts.length !== 3) {
    return false;
  }

  const dd = Number(parts[0]);
  const mm = Number(parts[1]);
  const yyyy = Number(parts[2]);

  if (!dd || !mm || !yyyy) {
    return false;
  }

  // TEMPORARY LOCAL TEST ONLY.
  // Treat 30-08-2026 as today so we can verify
  // Visited / Not Visited / Trip Completed.
  // This NEVER runs in staging or production builds.
  if (
    import.meta.env.DEV &&
    dd === 30 &&
    mm === 8 &&
    yyyy === 2026
  ) {
    return true;
  }

  const today = new Date();

  return (
    today.getDate() === dd &&
    today.getMonth() + 1 === mm &&
    today.getFullYear() === yyyy
  );
}

function StatusBadge({ status }: { status: number }) {
  if (status === 1) return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0]">✓ Visited</span>
  );
  if (status === 2) return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]">✕ Not Visited</span>
  );
  return null;
}

/* ============================================================ HotspotCard */

const HotspotCard: React.FC<{
  spot: DayViewHotspot;
  pdfRendering: boolean;
  onStatusChange: (
    spot: DayViewHotspot,
    status: 1 | 2,
    reason?: string,
  ) => Promise<void>;
  onActivityStatusChange: (
    activity: DayViewActivity,
    status: 1 | 2,
    reason?: string,
  ) => Promise<void>;
}> = ({
  spot,
  pdfRendering,
  onStatusChange,
  onActivityStatusChange,
}) => {
  const [localStatus, setLocalStatus] = useState(spot.driver_hotspot_status);
  const [localDesc, setLocalDesc] = useState(spot.driver_not_visited_description ?? "");
  const [saving, setSaving] = useState(false);
  const [nvOpen, setNvOpen] = useState(false);
  useEffect(() => { setLocalStatus(spot.driver_hotspot_status); setLocalDesc(spot.driver_not_visited_description ?? ""); }, [spot]);

  const handleVisited = async () => {
    if (saving) return;
    try { setSaving(true); await onStatusChange(spot, 1); setLocalStatus(1); setLocalDesc(""); }
    catch {} finally { setSaving(false); }
  };
  const handleNotVisited = async (reason: string) => { await onStatusChange(spot, 2, reason); setLocalStatus(2); setLocalDesc(reason); };

  const cardBg = spot.item_type === 6 ? "bg-[#e0f2fe] border-[#bae6fd]" : spot.item_type === 7 ? "bg-[#ede9fe] border-[#ddd6fe]" : "bg-[#fff7ed] border-[#fed7aa]";

  return (
    <>
     <div
  className={`rounded-xl px-4 py-3 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${cardBg}`}
>
  <div className="flex items-center gap-3 min-w-0 flex-1">
    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-[#7c3aed] shadow-sm flex-shrink-0">
      {spot.serial_no}
    </div>

    <div className="text-xs text-[#4a4260] min-w-0">
      <p className="font-semibold text-sm break-words">
        {spot.hotspot_name}
      </p>

      {spot.hotspot_location && (
        <p className="text-[11px] text-[#7b6f9a] flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="break-words">
            {spot.hotspot_location}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[#7b6f9a]">
        {(spot.start_time !== "--" ||
          spot.end_time !== "--") && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {spot.start_time} – {spot.end_time}
          </span>
        )}

        {spot.duration_label &&
          spot.duration_label !== "0 Min" && (
            <span>⏱ {spot.duration_label}</span>
          )}
      </div>
    </div>
  </div>

  <div
    className={`flex items-center gap-2 self-end sm:self-auto ${
      pdfRendering
        ? "flex-wrap justify-end max-w-[48%]"
        : "flex-shrink-0"
    }`}
  >
    {pdfRendering ? (
      <>
        {localStatus === 0 ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb]">
            Pending
          </span>
        ) : (
          <StatusBadge status={localStatus} />
        )}

        {localStatus === 2 && localDesc && (
          <span className="text-[10px] leading-4 text-[#4a4260] max-w-[220px] whitespace-normal break-words">
            <span className="font-semibold">Reason:</span>{" "}
            {localDesc}
          </span>
        )}
      </>
    ) : localStatus === 0 ? (
      <>
        <button
          type="button"
          disabled={saving}
          onClick={handleVisited}
          className="h-8 px-4 rounded-full text-[11px] font-semibold border bg-white border-[#d1fadf] text-[#15803d] hover:bg-[#dcfce7] transition-colors disabled:opacity-50"
        >
          ✓ Visited
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => setNvOpen(true)}
          className="h-8 px-4 rounded-full text-[11px] font-semibold border bg-white border-[#fecaca] text-[#b91c1c] hover:bg-[#fee2e2] transition-colors"
        >
          ✕ Not Visited
        </button>
      </>
    ) : (
     <div className="flex flex-col items-end gap-2 max-w-[420px]">
  <div className="flex items-center gap-2">
    <StatusBadge status={localStatus} />

    <button
      type="button"
      onClick={() =>
        localStatus === 1
          ? setNvOpen(true)
          : handleVisited()
      }
      className="text-[10px] text-[#7c3aed] underline flex-shrink-0"
    >
      Edit
    </button>
  </div>

  {localStatus === 2 && localDesc && (
    <div className="w-full rounded-md bg-[#fff7f7] border border-[#fecaca] px-3 py-2 text-left">
      <p className="text-[10px] font-semibold text-[#b91c1c] mb-1">
        Reason
      </p>

      <p className="text-[11px] leading-5 text-[#6b5f7b] whitespace-pre-wrap break-words">
        {localDesc}
      </p>
    </div>
  )}
</div>
    )}
  </div>
</div>
      {(spot.activities?.length ?? 0) > 0 && (
        <div className="mt-2 pl-4 space-y-2">
          {spot.activities!.map((activity) => (
            <ActivityCard key={activity.confirmed_route_activity_ID} activity={activity} onStatusChange={onActivityStatusChange} />
          ))}
        </div>
      )}
      <NotVisitedModal open={nvOpen} onClose={() => setNvOpen(false)} onSubmit={handleNotVisited} title={`Not Visited – ${spot.hotspot_name}`} />
    </>
  );
};

const ActivityCard: React.FC<{
  activity: DayViewActivity;
  onStatusChange: (activity: DayViewActivity, status: 1 | 2, reason?: string) => Promise<void>;
}> = ({ activity, onStatusChange }) => {
  const [localStatus, setLocalStatus] = useState(activity.driver_activity_status);
  const [localDesc, setLocalDesc] = useState(activity.driver_not_visited_description ?? "");
  const [saving, setSaving] = useState(false);
  const [nvOpen, setNvOpen] = useState(false);

  useEffect(() => {
    setLocalStatus(activity.driver_activity_status);
    setLocalDesc(activity.driver_not_visited_description ?? "");
  }, [activity]);

  const handleVisited = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await onStatusChange(activity, 1);
      setLocalStatus(1);
      setLocalDesc("");
    } finally {
      setSaving(false);
    }
  };

  const handleNotVisited = async (reason: string) => {
    await onStatusChange(activity, 2, reason);
    setLocalStatus(2);
    setLocalDesc(reason);
  };

  return (
    <>
      <div className="rounded-lg px-3 py-2 border bg-[#f9fafb] border-[#e5e7eb] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-xs text-[#4a4260]">
          <p className="text-[11px] uppercase tracking-wide text-[#8b8ba3]">Activity</p>
          <p className="font-medium text-[12px]">{activity.activity_title || "Activity"}</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {localStatus === 0 ? (
            <>
              <button type="button" disabled={saving} onClick={handleVisited} className="h-7 px-3 rounded-full text-[10px] font-semibold border bg-white border-[#d1fadf] text-[#15803d] hover:bg-[#dcfce7]">✓ Visited</button>
              <button type="button" onClick={() => setNvOpen(true)} className="h-7 px-3 rounded-full text-[10px] font-semibold border bg-white border-[#fecaca] text-[#b91c1c] hover:bg-[#fee2e2]">✕ Not Visited</button>
            </>
          ) : (
            <>
              <StatusBadge status={localStatus} />
              {localStatus === 2 && localDesc && <span className="text-[10px] text-[#7b6f9a] max-w-[100px] truncate" title={localDesc}>"{localDesc}"</span>}
              <button type="button" onClick={() => localStatus === 1 ? setNvOpen(true) : handleVisited()} className="text-[10px] text-[#7c3aed] underline">Edit</button>
            </>
          )}
        </div>
      </div>
      <NotVisitedModal open={nvOpen} onClose={() => setNvOpen(false)} onSubmit={handleNotVisited} title={`Activity Not Visited – ${activity.activity_title || 'Activity'}`} />
    </>
  );
};

/* ============================================================ GuideCard */

const GuideCard: React.FC<{
  guide: DayViewGuide;
  onStatusChange: (guide: DayViewGuide, status: 1 | 2, reason?: string) => Promise<void>;
}> = ({ guide, onStatusChange }) => {
  const [localStatus, setLocalStatus] = useState(guide.driver_guide_status);
  const [saving, setSaving] = useState(false);
  const [nvOpen, setNvOpen] = useState(false);
  useEffect(() => { setLocalStatus(guide.driver_guide_status); }, [guide]);

  const handleVisited = async () => {
    if (saving) return;
    try { setSaving(true); await onStatusChange(guide, 1); setLocalStatus(1); }
    catch {} finally { setSaving(false); }
  };
  const handleNotVisited = async (reason: string) => { await onStatusChange(guide, 2, reason); setLocalStatus(2); };

  return (
    <>
      <div className="rounded-xl px-4 py-3 border bg-[#fef9c3] border-[#fde68a] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs text-[#4a4260]">
          <p className="text-[11px] uppercase tracking-wide text-[#a08ac5]">{guide.guide_type === 1 ? "Whole‑Day Guide" : "Per‑Route Guide"}</p>
          <p className="font-semibold text-sm mt-0.5">{guide.guide_name || "Guide"}</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          {localStatus === 0 ? (
            <>
              <button type="button" disabled={saving} onClick={handleVisited} className="h-8 px-4 rounded-full text-[11px] font-semibold border bg-white border-[#d1fadf] text-[#15803d] hover:bg-[#dcfce7] transition-colors disabled:opacity-50">✓ Visited</button>
              <button type="button" onClick={() => setNvOpen(true)} className="h-8 px-4 rounded-full text-[11px] font-semibold border bg-white border-[#fecaca] text-[#b91c1c] hover:bg-[#fee2e2] transition-colors">✕ Not Visited</button>
            </>
          ) : (
            <>
              <StatusBadge status={localStatus} />
              <button type="button" onClick={() => localStatus === 1 ? setNvOpen(true) : handleVisited()} className="text-[10px] text-[#7c3aed] underline">Edit</button>
            </>
          )}
        </div>
      </div>
      <NotVisitedModal open={nvOpen} onClose={() => setNvOpen(false)} onSubmit={handleNotVisited} title={`Not Visited – ${guide.guide_name || "Guide"}`} />
    </>
  );
};

/* ============================================================ DayAccordionItem */

const DayAccordionItem: React.FC<{
  day: DayViewDay; dayIndex: number; itineraryPlanId: number;
  pdfRendering: boolean;
  onHotspotStatusChange: (spot: DayViewHotspot, status: 1 | 2, reason: string | undefined, dayIdx: number, hIdx: number) => Promise<void>;
  onActivityStatusChange: (activity: DayViewActivity, status: 1 | 2, reason: string | undefined, dayIdx: number, hIdx: number, aIdx: number) => Promise<void>;
  onGuideStatusChange: (guide: DayViewGuide, status: 1 | 2, reason: string | undefined, dayIdx: number, isWholeday: boolean) => Promise<void>;
  onOpenKm: (day: DayViewDay) => void;
  onAddCharge: (day: DayViewDay) => void;
  onAddDriverReview: (day: DayViewDay) => void;
  onAddGuideReview: (day: DayViewDay) => void;
  onUploadImage: (day: DayViewDay, files: FileList) => void;
  onUploadOpeningSpeedometer: (day: DayViewDay, file: File) => void;
  onUploadClosingSpeedometer: (day: DayViewDay, file: File) => void;
}> = ({ day, dayIndex, pdfRendering, onHotspotStatusChange, onActivityStatusChange, onGuideStatusChange, onOpenKm, onAddCharge, onAddDriverReview, onAddGuideReview, onUploadImage, onUploadOpeningSpeedometer, onUploadClosingSpeedometer }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const openingImageRef = React.useRef<HTMLInputElement>(null);
  const closingImageRef = React.useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(true);
  const runningKm = day.km.completed ? `${day.km.running_km} KM` : "0 KM";

  return (
    <div className="border border-[#e3d4ff] rounded-xl overflow-hidden bg-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 md:px-6 py-3 bg-[#fdf4ff] cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#f763c6] to-[#a347ff] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{day.day_number}</div>
          <div className="text-xs text-[#4a4260]">
            <p className="font-semibold text-sm">Day {day.day_number} – {day.route_date}</p>
            <p className="text-[11px] mt-0.5 text-[#7b6f9a]">{day.from_location} <span className="mx-1">→</span> {day.to_location}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
          {!pdfRendering ? (
            <>
              <Button size="sm" variant="outline" className="h-8 px-3 rounded-full text-[11px] border-[#ffd4a8] text-[#f68c2b] bg-white" onClick={() => onOpenKm(day)}><CarIcon className="h-3 w-3 mr-1" /> KM</Button>
              <Button size="sm" variant="outline" className="h-8 px-3 rounded-full text-[11px] border-[#ffc4e3] text-[#d94a8c] bg-white" onClick={() => onAddDriverReview(day)}>★ Driver Review</Button>
              <Button size="sm" variant="outline" className="h-8 px-3 rounded-full text-[11px] border-[#ffe4b5] text-[#b45309] bg-white" onClick={() => onAddGuideReview(day)}>★ Guide Review</Button>
              <Button size="sm" variant="outline" className="h-8 px-3 rounded-full text-[11px] border-[#d9c3ff] text-[#7c3aed] bg-white" onClick={() => onAddCharge(day)}>+ Charge</Button>
              <Button size="sm" variant="outline" className="h-8 px-3 rounded-full text-[11px] border-[#b3e5fc] text-[#0277bd] bg-white" onClick={() => fileInputRef.current?.click()}><Camera className="h-3 w-3 mr-1" /> Upload Image</Button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) { onUploadImage(day, e.target.files); e.target.value = ''; } }} />
              <button className="h-7 w-7 rounded-full flex items-center justify-center text-[#7b6f9a] hover:bg-[#f3e8ff]" onClick={() => setExpanded(v => !v)}>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
            </>
          ) : (
            <span className="rounded-full border border-[#eadcf9] bg-white px-3 py-1 text-[11px] font-medium text-[#7b6f9a]">
              Daily operations snapshot
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 md:px-6 py-4 space-y-3">
          <div className="rounded-xl bg-[#e7f9e4] border border-[#d1f0c0] px-4 py-3 flex flex-wrap gap-6 text-xs text-[#325c37]">
            <span><span className="font-semibold">Opening KM:</span> {day.km.opening_km || "--"}</span>
            <span><span className="font-semibold">Closing KM:</span> {day.km.closing_km || "--"}</span>
            <span><span className="font-semibold">Running KM:</span> {runningKm}</span>
            {!pdfRendering && <button type="button" onClick={() => openingImageRef.current?.click()} className="text-[11px] underline text-[#0f766e]">Upload Opening KM Image</button>}
            {!pdfRendering && <button type="button" onClick={() => closingImageRef.current?.click()} className="text-[11px] underline text-[#0f766e]">Upload Closing KM Image</button>}
            <input ref={openingImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              if (e.target.files?.[0]) {
                onUploadOpeningSpeedometer(day, e.target.files[0]);
                e.target.value = "";
              }
            }} />
            <input ref={closingImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              if (e.target.files?.[0]) {
                onUploadClosingSpeedometer(day, e.target.files[0]);
                e.target.value = "";
              }
            }} />
            {day.km.opening_speedmeter_image && <span className="text-[10px]">Opening Image: {day.km.opening_speedmeter_image}</span>}
            {day.km.closing_speedmeter_image && <span className="text-[10px]">Closing Image: {day.km.closing_speedmeter_image}</span>}
          </div>

          <div className="rounded-xl bg-[#f8faff] border border-[#dbeafe] px-4 py-3 text-xs text-[#334155] grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <span><span className="font-semibold">Trip Type:</span> {day.trip_type || "--"}</span>
            <span><span className="font-semibold">Meal Plan:</span> {day.meal_plan || "--"}</span>
            <span><span className="font-semibold">Hotel:</span> {day.hotel_name || "--"}</span>
            <span><span className="font-semibold">Vendor:</span> {day.vendor_name || "--"}</span>
            <span><span className="font-semibold">Vehicle:</span> {day.vehicle_type_title || "--"}</span>
            <span><span className="font-semibold">Vehicle No:</span> {day.vehicle_no || "--"}</span>
            <span><span className="font-semibold">Driver:</span> {day.driver_name || "--"}</span>
            <span><span className="font-semibold">Driver Mobile:</span> {day.driver_mobile || "--"}</span>
            <span><span className="font-semibold">Arrival Flight:</span> {day.arrival_flight_details || "--"}</span>
            <span><span className="font-semibold">Departure Flight:</span> {day.departure_flight_details || "--"}</span>
            <span><span className="font-semibold">Agent:</span> {day.agent_name || "--"}</span>
            <span><span className="font-semibold">Remarks:</span> {day.special_remarks || "--"}</span>
          </div>

          {day.wholeday_guide && <GuideCard guide={day.wholeday_guide} onStatusChange={(g, s, r) => onGuideStatusChange(g, s, r, dayIndex, true)} />}
          {day.guides.map(g => <GuideCard key={g.confirmed_route_guide_ID} guide={g} onStatusChange={(g2, s, r) => onGuideStatusChange(g2, s, r, dayIndex, false)} />)}
          {day.hotspots.length === 0
            ? <div className="rounded-xl bg-[#fdf2ff] border border-[#f5d7ff] px-4 py-3 text-xs text-[#7b6f9a]">No hotspots/stops for this day.</div>
            : day.hotspots.map((spot, hIdx) => (
               <HotspotCard
  key={spot.confirmed_route_hotspot_ID}
  spot={spot}
  pdfRendering={pdfRendering}
  onStatusChange={(s, status, reason) =>
    onHotspotStatusChange(
      s,
      status,
      reason,
      dayIndex,
      hIdx,
    )
  }
  onActivityStatusChange={(a, status, reason) =>
    onActivityStatusChange(
      a,
      status,
      reason,
      dayIndex,
      hIdx,
      (spot.activities ?? []).findIndex(
        (x) =>
          x.confirmed_route_activity_ID ===
          a.confirmed_route_activity_ID,
      ),
    )
  }
/>
              ))
          }
        </div>
      )}
    </div>
  );
};

/* ============================================================ Main Component */

export const DailyMomentDayView: React.FC = () => {
  const navigate = useNavigate();
  const { planId: paramPlanId, routeId: paramRouteId, id } = useParams<{ planId?: string; routeId?: string; id?: string }>();
  const planId = Number(paramPlanId ?? id ?? 0);
  const routeIdFromUrl = Number(paramRouteId ?? 0);

const isPublicShareView = Boolean(id && !paramPlanId);
const [publicView, setPublicView] =
  useState<"summary" | "days" | "day">("summary");

const [selectedPublicDay, setSelectedPublicDay] =
  useState<DayViewDay | null>(null);
const [showCompletedNotice, setShowCompletedNotice] = useState(false);
const [showScrolledCompletedNotice, setShowScrolledCompletedNotice] = useState(false);

const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DayViewPlan | null>(null);
  const [charges, setCharges] = useState<DailyMomentCharge[]>([]);
  const [activeChargeRouteId, setActiveChargeRouteId] = useState<number>(routeIdFromUrl || 0);
  const [ratings, setRatings] = useState<any[]>([]);
  const [guideRatings, setGuideRatings] = useState<any[]>([]);
  const [chargeSearch, setChargeSearch] = useState("");
  const [ratingSearch, setRatingSearch] = useState("");
  const [guideRatingSearch, setGuideRatingSearch] = useState("");

// Charge modal
const [chargeModalOpen, setChargeModalOpen] = useState(false);
const [viewChargeModalOpen, setViewChargeModalOpen] = useState(false);
const [chargeDay, setChargeDay] = useState<DayViewDay | null>(null);

// B2B public kilometer popup
const [publicKmModalOpen, setPublicKmModalOpen] =
  useState(false);

// B2B public gallery popup
const [publicGalleryOpen, setPublicGalleryOpen] =
  useState(false);

const [publicGalleryIndex, setPublicGalleryIndex] =
  useState(0);

// B2B public upload-image popup
const [publicImageModalOpen, setPublicImageModalOpen] =
  useState(false);
const [publicImageFiles, setPublicImageFiles] = useState<File[]>([]);
const [publicImageSaving, setPublicImageSaving] = useState(false);
const [publicImageError, setPublicImageError] = useState<string | null>(null);

const [publicNotVisitedSpot, setPublicNotVisitedSpot] =
  useState<DayViewHotspot | null>(null);

const [publicTripCompleting, setPublicTripCompleting] =
  useState(false);

const publicImageInputRef = React.useRef<HTMLInputElement>(null);
  const [chargeType, setChargeType] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeSaving, setChargeSaving] = useState(false);
  const [chargeErr, setChargeErr] = useState<string | null>(null);

  // Rating modal
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingDay, setRatingDay] = useState<DayViewDay | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingErr, setRatingErr] = useState<string | null>(null);

  // Guide rating modal
  const [guideRatingModalOpen, setGuideRatingModalOpen] = useState(false);
  const [guideRatingDay, setGuideRatingDay] = useState<DayViewDay | null>(null);
  const [guideRatingValue, setGuideRatingValue] = useState(0);
  const [guideRatingFeedback, setGuideRatingFeedback] = useState("");
  const [guideRatingSaving, setGuideRatingSaving] = useState(false);
  const [guideRatingErr, setGuideRatingErr] = useState<string | null>(null);

  // KM modal
  const [kmModalOpen, setKmModalOpen] = useState(false);
  const [kmDay, setKmDay] = useState<DayViewDay | null>(null);

  // PDF download
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfRendering, setPdfRendering] = useState(false);

   const openPublicDay = async (day: DayViewDay) => {
    setSelectedPublicDay(day);
    setActiveChargeRouteId(day.itinerary_route_ID);
    setPublicView("day");

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });

    const routeCharges = await fetchDailyMomentCharges(
      planId,
      day.itinerary_route_ID
    ).catch(() => [] as DailyMomentCharge[]);

    setCharges(routeCharges);
  };

  /* ------ load ----- */
  useEffect(() => {
    if (!planId) { setError("Invalid plan ID."); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const planData = await fetchDayView(planId);
        const resolvedRouteId =
          routeIdFromUrl ||
          planData.days[0]?.itinerary_route_ID ||
          0;
        const [chargesData, ratingsData, guideRatingsData] = await Promise.all([
          resolvedRouteId
            ? fetchDailyMomentCharges(planId, resolvedRouteId).catch(
                () => [] as DailyMomentCharge[],
              )
            : Promise.resolve([] as DailyMomentCharge[]),
          fetchDriverRatingsApi(planId).catch(() => []),
          fetchGuideRatingsApi(planId).catch(() => []),
        ]);
        if (cancelled) return;
        setActiveChargeRouteId(resolvedRouteId);
        setPlan(planData); setCharges(chargesData); setRatings(ratingsData); setGuideRatings(guideRatingsData);
      } catch (ex: any) {
        if (!cancelled) setError(ex?.message || "Failed to load daily moment data.");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [planId, routeIdFromUrl]);

useEffect(() => {
  if (!isPublicShareView || publicView !== "summary") {
    setShowScrolledCompletedNotice(false);
    return;
  }

  const handleScroll = () => {
    setShowScrolledCompletedNotice(window.scrollY > 80);
  };

  handleScroll();

  window.addEventListener("scroll", handleScroll, {
    passive: true,
  });

  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}, [isPublicShareView, publicView]);

useEffect(() => {
  if (!showScrolledCompletedNotice) {
    setShowCompletedNotice(false);
    return;
  }

  // When user first scrolls down, show it immediately.
  setShowCompletedNotice(true);

  const interval = window.setInterval(() => {
    setShowCompletedNotice((visible) => !visible);
  }, 1000);

  return () => {
    window.clearInterval(interval);
  };
}, [showScrolledCompletedNotice]);

  const handleDownloadPDF = useCallback(async () => {
    if (pdfLoading || !plan) return;
    setPdfLoading(true);
    try {
      setPdfRendering(true);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });

      const container = document.getElementById("pdf-container");
      if (!container) throw new Error("PDF container not found");

      // Remove gradient highlight before capture
      const textEls = container.querySelectorAll<HTMLElement>(".text-primary");
      textEls.forEach(el => { el.style.background = "none"; });

      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });

      // Restore gradient
      textEls.forEach(el => { el.style.background = ""; });

      const pdf = new jsPDF("p", "mm", "a4");
      const filename = plan.quote_id && plan.quote_id.trim() !== "" ? `${plan.quote_id}.pdf` : "output.pdf";

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const outerMargin = 5;
      const innerBorderMargin = 5;
      const contentMargin = 5;
      const innerBorderLeft = outerMargin + innerBorderMargin;
      const innerBorderTop = outerMargin + innerBorderMargin;
      const innerBorderRight = pageWidth - outerMargin - innerBorderMargin;
      const innerBorderBottom = pageHeight - outerMargin - innerBorderMargin;
      const contentLeft = innerBorderLeft + contentMargin;
      const contentTop = innerBorderTop + contentMargin;
      const contentWidth = innerBorderRight - innerBorderLeft - 2 * contentMargin;
      const contentHeight = innerBorderBottom - innerBorderTop - 2 * contentMargin;

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeightPx = (contentHeight * canvas.height) / imgHeight;

      const pageSlices: number[] = [];
      for (let sliceStart = 0; sliceStart < canvas.height; sliceStart += pageHeightPx) {
        pageSlices.push(sliceStart);
      }

      for (let pageIndex = 0; pageIndex < pageSlices.length; pageIndex += 1) {
        const positionPx = pageSlices[pageIndex];
        const currentHeight = Math.min(pageHeightPx, canvas.height - positionPx);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = currentHeight;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) ctx.drawImage(canvas, 0, positionPx, canvas.width, currentHeight, 0, 0, pageCanvas.width, pageCanvas.height);
        const imgData = pageCanvas.toDataURL("image/png");
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", contentLeft, contentTop, imgWidth, (currentHeight * imgWidth) / canvas.width);
        pdf.setLineWidth(0.2);
        pdf.rect(innerBorderLeft, innerBorderTop, innerBorderRight - innerBorderLeft, innerBorderBottom - innerBorderTop);
        pdf.setFontSize(8);
        pdf.setTextColor("#7b6f9a");
        pdf.text(`Page ${pageIndex + 1} of ${pageSlices.length}`, innerBorderRight - 2, innerBorderBottom - 1.5, { align: "right" });
      }

      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setPdfRendering(false);
      setPdfLoading(false);
    }
  }, [plan, pdfLoading]);

  const refreshCharges = useCallback(async () => {
    if (!activeChargeRouteId) {
      setCharges([]);
      return;
    }
    const data = await fetchDailyMomentCharges(planId, activeChargeRouteId).catch(() => [] as DailyMomentCharge[]);
    setCharges(data);
  }, [planId, activeChargeRouteId]);

  /* ------ hotspot status ------ */
  const handleHotspotStatusChange = useCallback(async (
    spot: DayViewHotspot,
    status: 1 | 2,
    reason: string | undefined,
    dayIdx: number,
    hIdx: number
  ) => {
    await updateHotspotStatus({
      confirmedRouteHotspotId: spot.confirmed_route_hotspot_ID,
      status,
      description: reason,
      perspective: "driver",
    });

    setPlan(prev => {
      if (!prev) return prev;

      const days = [...prev.days];
      const day = { ...days[dayIdx] };
      const hotspots = [...day.hotspots];

      hotspots[hIdx] = {
        ...hotspots[hIdx],
        driver_hotspot_status: status,
        driver_not_visited_description:
          status === 2 ? (reason ?? "") : null,
      };

      day.hotspots = hotspots;
      days[dayIdx] = day;

      return { ...prev, days };
    });
  }, []);

  const handlePublicHotspotStatusChange = async (
    spot: DayViewHotspot,
    status: 1 | 2,
    reason?: string
  ) => {
    await updateHotspotStatus({
      confirmedRouteHotspotId:
        spot.confirmed_route_hotspot_ID,
      status,
      description: reason,
      perspective: "driver",
    });

    const updateDay = (currentDay: DayViewDay) => ({
      ...currentDay,
      hotspots: currentDay.hotspots.map((item) =>
        item.confirmed_route_hotspot_ID ===
        spot.confirmed_route_hotspot_ID
          ? {
              ...item,
              driver_hotspot_status: status,
              driver_not_visited_description:
                status === 2
                  ? reason ?? ""
                  : null,
            }
          : item
      ),
    });

    setSelectedPublicDay((current) =>
      current ? updateDay(current) : current
    );

    setPlan((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        days: current.days.map((item) =>
          item.itinerary_route_ID ===
          spot.itinerary_route_ID
            ? updateDay(item)
            : item
        ),
      };
    });
  };

  const handlePublicTripCompleted = async () => {
    if (!selectedPublicDay || publicTripCompleting) {
      return;
    }

    try {
      setPublicTripCompleting(true);

      await completeDailyMomentTrip({
        itineraryPlanId: planId,
        itineraryRouteId:
          selectedPublicDay.itinerary_route_ID,
      });

      const updatedPlan = await fetchDayView(planId);

      setPlan(updatedPlan);

      const updatedDay = updatedPlan.days.find(
        (item) =>
          item.itinerary_route_ID ===
          selectedPublicDay.itinerary_route_ID
      );

      if (updatedDay) {
        setSelectedPublicDay(updatedDay);
      }

      setPublicView("days");

      window.scrollTo({
        top: 0,
        behavior: "auto",
      });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to complete trip."
      );
    } finally {
      setPublicTripCompleting(false);
    }
  };

  const handleActivityStatusChange = useCallback(async (
    activity: DayViewActivity, status: 1 | 2, reason: string | undefined, dayIdx: number, hIdx: number, aIdx: number
  ) => {
    await updateActivityStatus({ confirmedRouteActivityId: activity.confirmed_route_activity_ID, status, description: reason, perspective: "driver" });
    setPlan(prev => {
      if (!prev) return prev;
      const days = [...prev.days];
      const day = { ...days[dayIdx] };
      const hotspots = [...day.hotspots];
      const hotspot = { ...hotspots[hIdx] };
      const activities = [...(hotspot.activities ?? [])];
      if (aIdx >= 0 && aIdx < activities.length) {
        activities[aIdx] = {
          ...activities[aIdx],
          driver_activity_status: status,
          driver_not_visited_description: status === 2 ? (reason ?? "") : null,
        };
      }
      hotspot.activities = activities;
      hotspots[hIdx] = hotspot;
      day.hotspots = hotspots;
      days[dayIdx] = day;
      return { ...prev, days };
    });
  }, []);

  /* ------ guide status ------ */
  const handleGuideStatusChange = useCallback(async (
    guide: DayViewGuide, status: 1 | 2, reason: string | undefined, dayIdx: number, isWholeday: boolean
  ) => {
    if (isWholeday) {
      const cRouteId = plan?.days[dayIdx]?.confirmed_itinerary_route_ID;
      if (cRouteId) await updateWholedayGuideStatus({ confirmedItineraryRouteId: cRouteId, status, description: reason });
    } else {
      await updateGuideStatus({ confirmedRouteGuideId: guide.confirmed_route_guide_ID, status, description: reason });
    }
    setPlan(prev => {
      if (!prev) return prev;
      const days = [...prev.days]; const day = { ...days[dayIdx] };
      if (isWholeday && day.wholeday_guide) {
        day.wholeday_guide = { ...day.wholeday_guide, driver_guide_status: status, driver_not_visited_description: status === 2 ? (reason ?? "") : null };
      } else {
        day.guides = day.guides.map(g => g.confirmed_route_guide_ID === guide.confirmed_route_guide_ID
          ? { ...g, driver_guide_status: status, driver_not_visited_description: status === 2 ? (reason ?? "") : null } : g);
      }
      days[dayIdx] = day; return { ...prev, days };
    });
  }, [plan]);

  /* ------ charge handlers ------ */
  const openAddCharge = (day: DayViewDay) => { setActiveChargeRouteId(day.itinerary_route_ID); setChargeDay(day); setChargeType(""); setChargeAmount(""); setChargeErr(null); setChargeModalOpen(true); };
  const handleSaveCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeType.trim()) { setChargeErr("Charge title is required."); return; }
    const amt = parseFloat(chargeAmount);
    if (Number.isNaN(amt) || amt < 0) { setChargeErr("Enter a valid charge amount."); return; }
    if (!chargeDay) return;
    try {
      setChargeSaving(true); setChargeErr(null);
      await upsertDailyMomentCharge({ itineraryPlanId: planId, itineraryRouteId: chargeDay.itinerary_route_ID, chargeType: chargeType.trim(), chargeAmount: amt });
      await refreshCharges(); setChargeModalOpen(false);
    } catch (ex: any) { setChargeErr(ex?.message || "Failed."); } finally { setChargeSaving(false); }
  };
  const handleDeleteCharge = async (id: number) => {
    if (!confirm("Delete this charge?")) return;
    await deleteDailyMomentCharge(id); await refreshCharges();
  };

  /* ------ rating handlers ------ */
  const openAddRating = (day: DayViewDay) => { setRatingDay(day); setRatingValue(0); setRatingFeedback(""); setRatingErr(null); setRatingModalOpen(true); };
  const handleSaveRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingValue || ratingValue < 1) { setRatingErr("Please select 1–5 stars."); return; }
    if (!ratingDay) return;
    try {
      setRatingSaving(true); setRatingErr(null);
      await upsertDriverRating({ itineraryPlanId: planId, itineraryRouteId: ratingDay.itinerary_route_ID, customerRating: ratingValue, feedbackDescription: ratingFeedback.trim() });
      const refreshed = await fetchDriverRatingsApi(planId).catch(() => []);
      setRatings(refreshed); setRatingModalOpen(false);
    } catch (ex: any) { setRatingErr(ex?.message || "Failed."); } finally { setRatingSaving(false); }
  };
  const handleDeleteRating = async (id: number) => {
    if (!confirm("Delete this rating?")) return;
    await deleteDriverRating(id);
    const refreshed = await fetchDriverRatingsApi(planId).catch(() => []);
    setRatings(refreshed);
  };

  const openAddGuideRating = (day: DayViewDay) => {
    setGuideRatingDay(day);
    setGuideRatingValue(0);
    setGuideRatingFeedback("");
    setGuideRatingErr(null);
    setGuideRatingModalOpen(true);
  };

  const handleSaveGuideRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideRatingValue || guideRatingValue < 1) { setGuideRatingErr("Please select 1–5 stars."); return; }
    if (!guideRatingDay) return;
    try {
      setGuideRatingSaving(true); setGuideRatingErr(null);
      const guideId = guideRatingDay.guides[0]?.guide_id || guideRatingDay.wholeday_guide?.guide_id;
      await upsertGuideRating({
        itineraryPlanId: planId,
        itineraryRouteId: guideRatingDay.itinerary_route_ID,
        guideId,
        guideRating: guideRatingValue,
        guideDescription: guideRatingFeedback.trim(),
      });
      const refreshed = await fetchGuideRatingsApi(planId).catch(() => []);
      setGuideRatings(refreshed);
      setGuideRatingModalOpen(false);
    } catch (ex: any) { setGuideRatingErr(ex?.message || "Failed."); }
    finally { setGuideRatingSaving(false); }
  };

  const handleDeleteGuideRating = async (id: number) => {
    if (!confirm("Delete this guide rating?")) return;
    await deleteGuideRating(id);
    const refreshed = await fetchGuideRatingsApi(planId).catch(() => []);
    setGuideRatings(refreshed);
  };

  /* ------ KM ------ */
  const openKmModal = (day: DayViewDay) => { setKmDay(day); setKmModalOpen(true); };
  const handleKmSaved = useCallback(async () => {
    const updated = await fetchDayView(planId).catch(() => null);
    if (updated) setPlan(updated);
  }, [planId]);

  const handleUploadOpeningSpeedometer = useCallback(async (day: DayViewDay, file: File) => {
    await uploadOpeningSpeedometerImage({ itineraryPlanId: planId, itineraryRouteId: day.itinerary_route_ID, file });
    await handleKmSaved();
  }, [planId, handleKmSaved]);

  const handleUploadClosingSpeedometer = useCallback(async (day: DayViewDay, file: File) => {
    await uploadClosingSpeedometerImage({ itineraryPlanId: planId, itineraryRouteId: day.itinerary_route_ID, file });
    await handleKmSaved();
  }, [planId, handleKmSaved]);
  const handlePublicImageSave = async () => {
  if (!selectedPublicDay || publicImageFiles.length === 0) {
    setPublicImageError("Please choose an image.");
    return;
  }

  try {
    setPublicImageSaving(true);
    setPublicImageError(null);

 await uploadDayImages({
  itineraryPlanId: planId,
  itineraryRouteId:
    selectedPublicDay.itinerary_route_ID,
  files: publicImageFiles,
});

// Reload from DB so Gallery immediately has
// exactly the persisted images for this route.
const updatedPlan =
  await fetchDayView(planId);

setPlan(updatedPlan);

const updatedDay =
  updatedPlan.days.find(
    (item) =>
      item.itinerary_route_ID ===
      selectedPublicDay.itinerary_route_ID
  );

if (updatedDay) {
  setSelectedPublicDay(updatedDay);
}

setPublicImageFiles([]);
setPublicImageModalOpen(false);

if (publicImageInputRef.current) {
  publicImageInputRef.current.value = "";
}
  } catch (err: any) {
    setPublicImageError(
      err?.message || "Image upload failed."
    );
  } finally {
    setPublicImageSaving(false);
  }
};

  /* ------ computed ------ */
  const totalRunningKm = useMemo(() => plan?.days.reduce((s, d) => s + (d.km.completed ? d.km.running_km : 0), 0) ?? 0, [plan]);
  const filteredCharges = useMemo(() => !chargeSearch.trim() ? charges : charges.filter(c => [c.charge_type, String(c.charge_amount)].join(" ").toLowerCase().includes(chargeSearch.toLowerCase())), [charges, chargeSearch]);
  const filteredRatings = useMemo(() => !ratingSearch.trim() ? ratings : ratings.filter((r: any) => [r.driver_description, String(r.driver_rating), r.route_date].join(" ").toLowerCase().includes(ratingSearch.toLowerCase())), [ratings, ratingSearch]);
  const filteredGuideRatings = useMemo(() => !guideRatingSearch.trim() ? guideRatings : guideRatings.filter((r: any) => [r.guide_description, String(r.guide_rating), r.route_date, r.guide_name].join(" ").toLowerCase().includes(guideRatingSearch.toLowerCase())), [guideRatings, guideRatingSearch]);

  if (loading) return <div className="w-full min-h-screen bg-[#ffe9f4] p-6 flex items-center justify-center"><p className="text-sm text-[#4a4260]">Loading Daily Moment…</p></div>;
  if (error) return (
    <div className="w-full min-h-screen bg-[#ffe9f4] p-6 flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-[#f4008f]">{error}</p>
      <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
    </div>
  );
  if (!plan) return null;

  const firstDay = plan.days[0];

if (isPublicShareView && publicView === "summary") {
  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
<div className="mx-auto w-[90%] max-w-[1540px]">
      {/* B2B DRIVER HEADER */}
<div className="relative h-[265px] overflow-hidden rounded-b-[26px] bg-[linear-gradient(110deg,#8d10ae_0%,#7040c7_48%,#328bdd_100%)] text-white">
  {/* B2B-style soft background waves */}
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.12]"
    style={{
      backgroundImage:
        "radial-gradient(ellipse at 25% 20%, transparent 0%, transparent 38%, #ffffff 39%, transparent 41%), radial-gradient(ellipse at 65% 40%, transparent 0%, transparent 42%, #ffffff 43%, transparent 45%)",
    }}
  />

  {/* LEFT CONTENT */}
  <div className="relative z-[3] px-[62px] py-[22px]">

    {/* REAL DVI LOGO */}
<div className="mb-[14px] flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full bg-white">
  <img
    src="/assets/img/DVi-Logo1-2048x1860.png"
    alt="DVI Holidays"
    className="h-[40px] w-[40px] object-contain"
  />
</div>

  <div className="space-y-[2px] text-[14px] leading-[1.35]">
  <div className="mb-[2px] text-[20px] font-bold">
    Hi, {firstDay?.driver_name || "--"}
  </div>
      <div>
        {plan.quote_id || `Plan #${plan.itinerary_plan_ID}`}
      </div>

      <div>
        {firstDay?.driver_mobile || "--"}
      </div>

      <div>
        {firstDay?.vehicle_type_title || "--"}
        {firstDay?.vehicle_no &&
        firstDay.vehicle_no !== "--"
          ? ` - ${firstDay.vehicle_no}`
          : ""}
      </div>
    </div>
  </div>

{/* RIGHT DRIVER + CAR IMAGE */}
<div className="pointer-events-none absolute bottom-0 right-[24px] z-[2] hidden h-[225px] w-[310px] overflow-hidden md:block">
  <img
    src="/daily-moment/driver-car.png"
    alt="Driver with vehicle"
    className="absolute bottom-[-5px] right-[-24px] h-[225px] w-auto max-w-none object-contain object-bottom"
    style={{
      clipPath: "inset(0 9% 3% 0)",
    }}
  />
</div>
</div>
{/* YOUR RIDE */}
<div className="px-[24px] pb-[18px] pt-[18px]">

  <h2 className="mb-[18px] text-[18px] font-bold leading-none text-[#333333]">
    Your Ride
  </h2>

          {/* DATE */}
        <div className="mb-[6px] flex items-center gap-[6px] text-[13px] text-[#716b76]">
  <CalendarDays
    className="h-[14px] w-[14px] shrink-0 text-[#777]"
    strokeWidth={1.8}
  />

            <span>
              {formatB2BDate(plan.trip_start_date)} to{" "}
              {formatB2BDate(plan.trip_end_date)} (
              {plan.no_of_nights}N/{plan.no_of_days}D)
            </span>
          </div>

          {/* ROUTE */}
<div className="mb-[10px] flex flex-wrap items-center gap-[9px] text-[16px] font-semibold leading-[1.25] text-[#061968]">
  <span>{plan.arrival_location || "--"}</span>

  <MoveRight
    className="h-[18px] w-[22px] shrink-0 text-[#777]"
    strokeWidth={1.8}
  />

            <span>{plan.departure_location || "--"}</span>
          </div>

          {/* ADULT */}
      <div className="mb-[22px] flex items-center gap-[6px] text-[13px] text-[#333]">
  <span>Adult</span>

  <span className="flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#8870d0] px-[5px] text-[10px] font-semibold text-white">
    {plan.total_adult}
  </span>
</div>

          {/* GUEST / TRAVEL EXPERT */}
         <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2">

            {/* GUEST */}
{/* GUEST */}
<div className="relative h-[158px] overflow-hidden rounded-[5px] border border-[#d6bedf] bg-[#f1e5fa] px-[18px] py-[18px]">

  <div className="relative z-[2] max-w-[72%]">
    <h3 className="mb-[16px] text-[18px] font-bold leading-none text-[#171717]">
      Guest Details
    </h3>

    <div className="space-y-[2px] text-[13px] leading-[1.35] text-[#171717]">
      <p>
        <span className="font-bold uppercase">
          {plan.guest_name || "--"}
        </span>

        {plan.guest_mobile
          ? ` , ${plan.guest_mobile}`
          : ""}
      </p>

      <p>
        {plan.arrival_location || "--"}{" "}
        {formatB2BDate(plan.trip_start_date)}
      </p>

      <p>
        {formatB2BTime(plan.trip_start_time)} ==&gt;{" "}
        {formatB2BDate(plan.trip_end_date)}{" "}
        {formatB2BTime(plan.trip_end_time)}
      </p>
    </div>
  </div>

 <img
  src="/daily-moment/b2b-guest-details.png"
  alt=""
  className="pointer-events-none absolute bottom-0 right-[18px] z-[1] h-[132px] w-auto object-contain object-bottom"
/>
</div>

       {/* TRAVEL EXPERT */}
<div className="relative h-[158px] overflow-hidden rounded-[5px] border border-[#e4c8b4] bg-[#fde8d8] px-[18px] py-[18px]">

  <div className="relative z-[2] max-w-[70%]">
    <h3 className="mb-[16px] text-[18px] font-bold leading-none text-[#171717]">
      Travel Expert Details
    </h3>

    <div className="space-y-[2px] text-[13px] leading-[1.35] text-[#171717]">
      <p className="font-bold">
        {plan.travel_expert_name || "--"}
      </p>

      <p>
        {plan.travel_expert_mobile || "--"}
      </p>

      <p>
        {plan.travel_expert_email || "--"}
      </p>
    </div>
  </div>

  <img
  src="/daily-moment/b2b-travel-expert.png"
  alt=""
  className="pointer-events-none absolute bottom-0 right-[20px] z-[1] h-[132px] w-auto object-contain object-bottom"
/>
</div>
          </div>
{/* B2B VIEW YOUR TRIP */}
<div className="sticky bottom-[8px] z-[100] mt-[6px] flex justify-center">
  <div className="flex flex-col items-center">

    {/* COMPLETED TRIP NOTICE
        - hidden at top
        - opens smoothly after scroll
        - visible 1 sec / hidden 1 sec
        - keeps its space while blinking so button never jumps */}
    <div
      className={`overflow-hidden transition-[max-height,margin] duration-300 ease-out ${
        showScrolledCompletedNotice
          ? "mb-[6px] max-h-[30px]"
          : "mb-0 max-h-0"
      }`}
    >
      <div
        className={`pointer-events-none flex h-[30px] items-center justify-center gap-[6px] whitespace-nowrap text-[15px] font-semibold transition-opacity duration-300 ${
          showCompletedNotice ? "opacity-100" : "opacity-0"
        }`}
      >
        <Timer
          className="h-[22px] w-[22px] shrink-0 text-[#ef4747]"
          strokeWidth={1.8}
        />

        <span className="text-[#ef4747]">
          Trip already Completed,
        </span>

        <span className="text-[#222222]">
          Click the below button view your trip details.
        </span>
      </div>
    </div>

    {/* VIEW TRIP */}
    <Button
      type="button"
      onClick={() => setPublicView("days")}
      className="h-[48px] rounded-[5px] bg-[#ef4b4b] px-[26px] text-[17px] font-bold text-white shadow-none hover:bg-[#e24343]"
    >
      View Your Trip

      <ChevronsRight
        className="ml-[8px] h-[21px] w-[21px]"
        strokeWidth={3}
      />
    </Button>

  </div>
</div>

{/* B2B small bottom gap */}
<div className="h-[24px]" />

        </div>
      </div>
    </div>
  );
}

  if (isPublicShareView && publicView === "days") {
    return (
    <div className="min-h-screen bg-white py-5">
  <div className="mx-auto w-[90%] max-w-[1540px]">

       {/* B2B DAYS HEADER */}
<div className="relative h-[265px] overflow-hidden rounded-b-[26px] bg-[linear-gradient(110deg,#8d10ae_0%,#7040c7_48%,#328bdd_100%)] text-white">

  {/* B2B soft wave background */}
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.12]"
    style={{
      backgroundImage:
        "radial-gradient(ellipse at 25% 20%, transparent 0%, transparent 38%, #ffffff 39%, transparent 41%), radial-gradient(ellipse at 65% 40%, transparent 0%, transparent 42%, #ffffff 43%, transparent 45%)",
    }}
  />

  {/* BACK */}
  <button
    type="button"
    onClick={() => setPublicView("summary")}
    className="absolute right-[38px] top-[18px] z-[4] flex h-[34px] w-[34px] items-center justify-center rounded-full text-white hover:bg-white/10"
    title="Back"
  >
    <ArrowLeft className="h-[28px] w-[28px]" />
  </button>

  {/* LEFT CONTENT */}
  <div className="relative z-[3] px-[62px] py-[22px]">

    {/* REAL DVI LOGO */}
    <div className="mb-[14px] flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full bg-white">
      <img
        src="/assets/img/DVi-Logo1-2048x1860.png"
        alt="DVI Holidays"
        className="h-[40px] w-[40px] object-contain"
      />
    </div>

    <div className="space-y-[4px] text-[14px] leading-[1.35]">
      <div>
        {plan.quote_id || `Plan #${plan.itinerary_plan_ID}`}
      </div>

      <div>
        {formatB2BDate(plan.trip_start_date)} to{" "}
        {formatB2BDate(plan.trip_end_date)} (
        {plan.no_of_nights}N/{plan.no_of_days}D)
      </div>

      <div className="flex flex-wrap items-center gap-[10px] text-[16px] font-bold leading-[1.25] text-white">
        <span>{plan.arrival_location || "--"}</span>

        <MoveRight
          className="h-[18px] w-[22px] shrink-0 text-white"
          strokeWidth={2.2}
        />

        <span>{plan.departure_location || "--"}</span>
      </div>

      <div className="flex items-center gap-[8px] text-[13px]">
        <span>Adult</span>

        <span className="flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-white px-[5px] text-[10px] font-semibold text-[#7040ca]">
          {plan.total_adult}
        </span>
      </div>
    </div>
  </div>

  {/* RIGHT DRIVER + CAR IMAGE */}
  <div className="pointer-events-none absolute bottom-0 right-[24px] z-[2] hidden h-[225px] w-[310px] overflow-hidden md:block">
    <img
      src="/daily-moment/driver-car.png"
      alt="Driver with vehicle"
      className="absolute bottom-[-5px] right-[-24px] h-[225px] w-auto max-w-none object-contain object-bottom"
      style={{
        clipPath: "inset(0 9% 3% 0)",
      }}
    />
  </div>
</div>
{/* LIST OF DAYS */}
<div className="px-2 py-5 md:px-6">
  <h2 className="mb-4 text-[27px] font-bold text-[#333333]">
    List of Days
  </h2>

 <div className="space-y-4">
  {plan.days.map((day) => {
    const dayCompleted = day.km.completed;
    const currentDay = isB2BCurrentDay(day.route_date);

    const dayCardClass = dayCompleted
      ? "border-[#a9ddbf] bg-[#e6f8ee]"
      : currentDay
        ? "border-[#efc49f] bg-[#fff0e5]"
        : "border-[#d8bde5] bg-[#f1e4fa]";

    const dayStripClass = dayCompleted
      ? "bg-[#4fbd79]"
      : currentDay
        ? "bg-[#ef941f]"
        : "bg-[#8846bd]";

    return (
      <button
        key={day.itinerary_route_ID}
        type="button"
        onClick={() => openPublicDay(day)}
        className={`flex min-h-[82px] w-full cursor-pointer overflow-hidden rounded-[5px] border text-left ${dayCardClass}`}
      >
        <div
          className={`flex w-[44px] shrink-0 items-center justify-center text-white ${dayStripClass}`}
        >
          <span className="-rotate-90 whitespace-nowrap text-[15px] font-medium">
            DAY-{day.day_number}
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center px-[18px] py-[10px]">
          <div className="mb-[4px] flex items-center gap-[8px] text-[15px] text-[#756d7e]">
            <CalendarDays
              className="h-[17px] w-[17px] shrink-0 text-[#777]"
              strokeWidth={1.8}
            />

            <span>
              {formatB2BDate(day.route_date)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-[10px] text-[18px] font-semibold text-[#071a64]">
            <span>{day.from_location || "--"}</span>

            <MoveRight
              className="h-[20px] w-[24px] shrink-0 text-[#777]"
              strokeWidth={1.8}
            />

            <span>{day.to_location || "--"}</span>
          </div>
        </div>
      </button>
    );
  })}
</div>
          </div>
        </div>
      </div>
    );
  }

 if (
  isPublicShareView &&
  publicView === "day" &&
  selectedPublicDay
) {
  const day = selectedPublicDay;

const isPublicDayCompleted =
  day.km.completed;

const isPublicCurrentDay =
  isB2BCurrentDay(day.route_date);

// Exact B2B:
// Only TODAY'S unfinished day can update visit status.
const canEditPublicVisitStatus =
  isPublicCurrentDay &&
  !isPublicDayCompleted;

const showAddImage =
  day.day_number === 1 ||
  day.day_number === plan.no_of_days;
const isLastDay =
  day.day_number === plan.days.length;

const totalChargeAmount = charges.reduce(
  (total, charge) =>
    total + Number(charge.charge_amount || 0),
  0
);

  const lastDayTravelRows =
    day.hotspots.filter(
      (spot) => spot.item_type === 7
    );

  const visibleHotspots =
    isLastDay && lastDayTravelRows.length > 0
      ? lastDayTravelRows
      : day.hotspots;

    return (
      <div
        className="min-h-screen bg-white py-5"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div className="mx-auto w-[90%] max-w-[1540px]">

          {/* B2B DAY HEADER */}
          <div className="relative h-[265px] overflow-hidden rounded-b-[26px] bg-[linear-gradient(110deg,#8d10ae_0%,#7040c7_48%,#328bdd_100%)] text-white">

            {/* SOFT BACKGROUND */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 25% 20%, transparent 0%, transparent 38%, #ffffff 39%, transparent 41%), radial-gradient(ellipse at 65% 40%, transparent 0%, transparent 42%, #ffffff 43%, transparent 45%)",
              }}
            />

            {/* BACK - EXACTLY BACK TO LIST OF DAYS */}
            <button
              type="button"
              onClick={() => {
                setSelectedPublicDay(null);
                setPublicView("days");

                window.scrollTo({
                  top: 0,
                  behavior: "auto",
                });
              }}
              className="absolute right-[38px] top-[18px] z-[4] flex h-[34px] w-[34px] items-center justify-center rounded-full text-white hover:bg-white/10"
              title="Back"
            >
              <ArrowLeft className="h-[28px] w-[28px]" />
            </button>

            {/* LEFT CONTENT */}
            <div className="relative z-[3] px-[62px] py-[22px]">

              {/* DVI LOGO */}
              <div className="mb-[14px] flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full bg-white">
                <img
                  src="/assets/img/DVi-Logo1-2048x1860.png"
                  alt="DVI Holidays"
                  className="h-[40px] w-[40px] object-contain"
                />
              </div>

              <div className="space-y-[4px] text-[14px] leading-[1.35]">

                <div>
                  {plan.quote_id ||
                    `Plan #${plan.itinerary_plan_ID}`}
                </div>

                <div>
                  Day {day.day_number} -{" "}
                  {formatB2BDayDate(day.route_date)}
                </div>

                <div className="flex flex-wrap items-center gap-[10px] text-[16px] font-bold leading-[1.25]">
                  <span>
                    {day.from_location || "--"}
                  </span>

                  <MoveRight
                    className="h-[18px] w-[22px] shrink-0 text-white"
                    strokeWidth={2.2}
                  />

                  <span>
                    {day.to_location || "--"}
                  </span>
                </div>

                <div className="flex items-center gap-[8px] text-[13px]">
                  <span>Adult</span>

                  <span className="flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-white px-[5px] text-[10px] font-semibold text-[#7040ca]">
                    {plan.total_adult}
                  </span>
                </div>
              </div>
            </div>

            {/* DRIVER + CAR */}
            <div className="pointer-events-none absolute bottom-0 right-[24px] z-[2] hidden h-[225px] w-[310px] overflow-hidden md:block">
              <img
                src="/daily-moment/driver-car.png"
                alt="Driver with vehicle"
                className="absolute bottom-[-5px] right-[-24px] h-[225px] w-auto max-w-none object-contain object-bottom"
                style={{
                  clipPath: "inset(0 9% 3% 0)",
                }}
              />
            </div>
          </div>

          {/* LIST OF VISITS */}
          <div className="px-2 py-5 md:px-6">

            <div className="mb-[28px] flex items-center justify-between gap-4">

             <div className="flex items-center gap-[12px]">
  <h2 className="text-[27px] font-bold text-[#333333]">
    List of Visits
  </h2>

{/* B2B gallery icon */}
{showAddImage && (
  <button
    type="button"
    onClick={() => {
      setPublicGalleryIndex(0);
      setPublicGalleryOpen(true);
    }}
    className="flex h-[28px] w-[28px] items-center justify-center bg-transparent p-0"
    title="Gallery"
  >
    <ImageIcon
      className="h-[22px] w-[22px] text-[#333333]"
      strokeWidth={1.8}
    />
  </button>
)}
  {/* B2B SHOW KILOMETER ICON */}
  <button
    type="button"
    onClick={() => setPublicKmModalOpen(true)}
    className="flex h-[28px] w-[28px] items-center justify-center bg-transparent p-0"
    title="Show Kilometer"
  >
    <Gauge
      className="h-[23px] w-[23px] text-[#d47b00]"
      strokeWidth={2}
    />
  </button>
</div>

              {/* B2B ACTIONS */}
              <div className="flex items-center gap-[8px]">

                <button
                  type="button"
                  onClick={() => setViewChargeModalOpen(true)}
                  className="h-[40px] rounded-[4px] border border-[#071a64] bg-white px-[16px] text-[14px] font-medium text-[#071a64]"
                >
                  👁 View Charge
                </button>

              {showAddImage && (
  <button
    type="button"
    onClick={() => {
      setPublicImageFiles([]);
      setPublicImageError(null);

      if (publicImageInputRef.current) {
        publicImageInputRef.current.value = "";
      }

      setPublicImageModalOpen(true);
    }}
    className="flex h-[40px] items-center rounded-[4px] border border-[#ef4747] bg-white px-[16px] text-[14px] font-medium text-[#ef4747]"
  >
    + Add Image
  </button>
)}

                <button
                  type="button"
                  onClick={() => openAddCharge(day)}
                  className="h-[40px] rounded-[4px] bg-[#071a64] px-[16px] text-[14px] font-medium text-white"
                >
                  + Add Charge
                </button>
              </div>
            </div>

            {/* VISIT CARDS */}
            <div className="space-y-[18px]">

       {visibleHotspots.length === 0 ? (
  <div className="rounded-[5px] border border-[#d6bedf] bg-[#f1e5fa] px-[20px] py-[22px] text-[16px] text-[#071a64]">
    No visits available.
  </div>
) : (
  visibleHotspots.map((spot) => {
    const isVisited =
      spot.driver_hotspot_status === 1;

    const isNotVisited =
      spot.driver_hotspot_status === 2;

 const publicStatusControls = (
  <div className="flex shrink-0 items-center gap-[6px]">
    {/* COMPLETED DAY - B2B READ ONLY */}
    {isPublicDayCompleted ? (
      <>
        {isVisited && (
          <span className="rounded-[3px] bg-white px-[9px] py-[4px] text-[13px] font-medium text-[#19b968]">
            ✓ Visited
          </span>
        )}

        {isNotVisited && (
          <span className="rounded-[3px] bg-white px-[9px] py-[4px] text-[13px] font-medium text-[#a3a3a3]">
            × Not Visited
          </span>
        )}
      </>
    ) : canEditPublicVisitStatus ? (
      /*
       * CURRENT ORANGE DAY
       */

      isVisited ? (
        <span className="rounded-[3px] bg-white px-[9px] py-[4px] text-[13px] font-medium text-[#19b968]">
          ✓ Visited
        </span>
      ) : isNotVisited ? (
        <span className="rounded-[3px] bg-white px-[9px] py-[4px] text-[13px] font-medium text-[#a3a3a3]">
          × Not Visited
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              handlePublicHotspotStatusChange(
                spot,
                1
              )
            }
            className="h-[34px] rounded-[3px] bg-[#19b968] px-[11px] text-[14px] font-medium text-white"
          >
            ✓ Visited
          </button>

          <button
            type="button"
            onClick={() =>
              setPublicNotVisitedSpot(spot)
            }
            className="h-[34px] rounded-[3px] bg-[#aaaaaa] px-[11px] text-[14px] font-medium text-white"
          >
            × Not Visited
          </button>
        </>
      )
    ) : null}
  </div>
);

    /* B2B TRAVEL / DESTINATION CARD */
    if (spot.item_type === 7) {
      const distanceText =
        spot.travel_distance_km == null
          ? "KM"
          : `${spot.travel_distance_km} KM`;

      return (
        <div
          key={spot.confirmed_route_hotspot_ID}
          className="flex flex-col gap-[16px] rounded-[5px] border border-[#b8d7e8] bg-[#e2f3fc] px-[20px] py-[18px] md:flex-row md:items-center md:justify-between"
        >
          <div>
            <div className="flex items-center gap-[8px] text-[17px] font-semibold text-[#071a64]">
              <Building2
                className="h-[18px] w-[18px] text-[#777]"
                strokeWidth={1.8}
              />

              <span>
                {day.to_location || "--"}
              </span>
            </div>

            <div className="mt-[8px] flex items-center gap-[8px] text-[14px] text-[#756d7e]">
              <Clock
                className="h-[17px] w-[17px]"
                strokeWidth={1.8}
              />

              <span>
                {spot.start_time || "--"} -{" "}
                {spot.end_time || "--"}
              </span>
            </div>

            <div className="mt-[8px] flex items-center gap-[8px] text-[14px] text-[#756d7e]">
              <MapPin
                className="h-[17px] w-[17px]"
                strokeWidth={1.8}
              />

              <span>
                {distanceText}
              </span>
            </div>

            <div className="mt-[8px] flex items-center gap-[8px] text-[14px] text-[#756d7e]">
              <Timer
                className="h-[17px] w-[17px]"
                strokeWidth={1.8}
              />

              <span>
                {spot.duration_label || "0 Min"}{" "}
                (This may vary due to traffic conditions)
              </span>
            </div>
          </div>

          {publicStatusControls}
        </div>
      );
    }

    /* B2B HOTEL CARD */
    if (spot.item_type === 6) {
      const displayLocation =
        day.hotel_name &&
        day.hotel_name !== "--"
          ? day.hotel_name
          : spot.hotspot_location &&
              spot.hotspot_location !== "N/A"
            ? spot.hotspot_location
            : day.to_location || "--";

      return (
        <div
          key={spot.confirmed_route_hotspot_ID}
          className="flex flex-col gap-[16px] rounded-[5px] border border-[#b8d7e8] bg-[#e2f3fc] px-[20px] py-[18px] md:flex-row md:items-center md:justify-between"
        >
          <div>
            <div className="flex items-center gap-[8px] text-[17px] font-semibold text-[#071a64]">
              <Building2
                className="h-[18px] w-[18px] text-[#777]"
                strokeWidth={1.8}
              />

              <span>
                {displayLocation}
              </span>
            </div>

            {spot.start_time &&
              spot.start_time !== "--" && (
                <div className="mt-[8px] flex items-center gap-[8px] text-[14px] text-[#756d7e]">
                  <Clock
                    className="h-[17px] w-[17px]"
                    strokeWidth={1.8}
                  />

                  <span>
                    {spot.start_time}
                  </span>
                </div>
              )}
          </div>

          {publicStatusControls}
        </div>
      );
    }

    /* B2B SIGHTSEEING CARD */
    return (
      <div
        key={spot.confirmed_route_hotspot_ID}
       className={`flex flex-col gap-[16px] rounded-[5px] border px-[20px] py-[18px] md:flex-row md:items-center md:justify-between ${
  isVisited
    ? "border-[#b9dfc9] bg-[#e5f8ed]"
    : "border-[#d6bedf] bg-[#f1e5fa]"
}`}
      >
        <div>
          <div className="text-[18px] font-semibold text-[#071a64]">
            #{spot.serial_no}{" "}
            {spot.hotspot_name || "--"}
          </div>

          <div className="mt-[8px] flex flex-wrap items-center gap-[18px] text-[14px] text-[#756d7e]">
            {(spot.start_time !== "--" ||
              spot.end_time !== "--") && (
              <div className="flex items-center gap-[6px]">
                <Clock
                  className="h-[17px] w-[17px]"
                />

                <span>
                  {spot.start_time} -{" "}
                  {spot.end_time}
                </span>
              </div>
            )}

            {spot.duration_label &&
              spot.duration_label !== "0 Min" && (
                <div className="flex items-center gap-[6px]">
                  <Timer
                    className="h-[17px] w-[17px]"
                  />

                  <span>
                    {spot.duration_label}
                  </span>
                </div>
              )}
          </div>
        </div>

        {publicStatusControls}
      </div>
    );
  })
)}
            </div>

            {canEditPublicVisitStatus && (
  <div className="mt-[20px] flex justify-center">
                  <button
                    type="button"
                    disabled={publicTripCompleting}
                    onClick={handlePublicTripCompleted}
                    className="flex h-[50px] items-center justify-center rounded-[5px] bg-[#f28b8b] px-[28px] text-[18px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {publicTripCompleting
                      ? "Completing..."
                      : "Trip Completed"}

                    {!publicTripCompleting && (
                      <ChevronsRight
                        className="ml-[7px] h-[22px] w-[22px]"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                </div>
              )}
          </div>

          <NotVisitedModal
            open={Boolean(publicNotVisitedSpot)}
            onClose={() =>
              setPublicNotVisitedSpot(null)
            }
            onSubmit={async (reason) => {
              if (!publicNotVisitedSpot) {
                return;
              }

              await handlePublicHotspotStatusChange(
                publicNotVisitedSpot,
                2,
                reason
              );
            }}
            title={
              publicNotVisitedSpot
                ? `Not Visited – ${
                    publicNotVisitedSpot.hotspot_name ||
                    "Visit"
                  }`
                : "Not Visited"
            }
          />

{/* ============================================================
    GALLERY - B2B STYLE
============================================================ */}
<Dialog
  open={publicGalleryOpen}
  onOpenChange={(open) => {
    setPublicGalleryOpen(open);

    if (!open) {
      setPublicGalleryIndex(0);
    }
  }}
>
  <DialogContent
    className="
      !w-[650px]
      !max-w-[calc(100vw-32px)]
      gap-0
      rounded-[7px]
      border-0
      bg-white
      p-0
      shadow-2xl
      sm:!max-w-[650px]

      [&>button]:right-[48px]
      [&>button]:top-[45px]
      [&>button]:h-[24px]
      [&>button]:w-[24px]
      [&>button]:p-0
      [&>button]:text-[#777777]
      [&>button]:opacity-100
      [&>button]:focus:ring-0
      [&>button]:focus:ring-offset-0
      [&>button]:focus-visible:ring-0
      [&>button]:focus-visible:ring-offset-0
      [&>button]:focus-visible:outline-none

      [&>button>svg]:h-[22px]
      [&>button>svg]:w-[22px]
    "
  >
    <div className="px-[48px] pb-[48px] pt-[45px]">
      <DialogHeader className="space-y-0 text-left">
        <DialogTitle className="text-[24px] font-normal text-[#404040]">
          Gallery
        </DialogTitle>

        <DialogDescription className="sr-only">
          Uploaded images for this itinerary day.
        </DialogDescription>
      </DialogHeader>

      {(day.day_images?.length ?? 0) === 0 ? (
        <div className="flex min-h-[180px] items-center justify-center text-[20px] font-semibold text-[#071a64]">
          No Image Found
        </div>
      ) : (
        <div className="mt-[28px]">
          <div className="relative flex min-h-[320px] w-full items-center justify-center overflow-hidden rounded-[4px] bg-[#f7f7f7]">
            <img
              src={getDailyMomentDayImageUrl(
                day.day_images?.[publicGalleryIndex] || ""
              )}
              alt={`Day ${day.day_number} uploaded image`}
              className="max-h-[420px] max-w-full object-contain"
            />

            {(day.day_images?.length ?? 0) > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const total =
                      day.day_images?.length ?? 0;

                    setPublicGalleryIndex((current) =>
                      current <= 0
                        ? total - 1
                        : current - 1
                    );
                  }}
                  className="absolute left-[12px] top-1/2 flex h-[36px] w-[36px] -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-[28px] leading-none text-white"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const total =
                      day.day_images?.length ?? 0;

                    setPublicGalleryIndex((current) =>
                      current >= total - 1
                        ? 0
                        : current + 1
                    );
                  }}
                  className="absolute right-[12px] top-1/2 flex h-[36px] w-[36px] -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-[28px] leading-none text-white"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {(day.day_images?.length ?? 0) > 1 && (
            <div className="mt-[10px] text-center text-[14px] text-[#777777]">
              {publicGalleryIndex + 1} /{" "}
              {day.day_images?.length ?? 0}
            </div>
          )}
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>


{/* ============================================================
    SHOW KILOMETER - B2B STYLE
============================================================ */}
<Dialog
  open={publicKmModalOpen}
  onOpenChange={setPublicKmModalOpen}
>
  <DialogContent
    className="
      !w-[1040px]
      !max-w-[calc(100vw-32px)]
      gap-0
      rounded-[7px]
      border-0
      bg-white
      p-0
      shadow-2xl
      sm:!max-w-[1040px]

      [&>button]:right-[58px]
      [&>button]:top-[56px]
      [&>button]:h-[26px]
      [&>button]:w-[26px]
      [&>button]:p-0
      [&>button]:text-[#777777]
      [&>button]:opacity-100
      [&>button]:focus:ring-0
      [&>button]:focus:ring-offset-0
      [&>button]:focus-visible:ring-0
      [&>button]:focus-visible:ring-offset-0
      [&>button]:focus-visible:outline-none

      [&>button>svg]:h-[24px]
      [&>button>svg]:w-[24px]
    "
  >
    <div className="px-[70px] pb-[65px] pt-[58px]">

      <DialogHeader className="space-y-0 text-left">
        <DialogTitle className="text-[25px] font-normal text-[#404040]">
          Show Kilometer
        </DialogTitle>

        <DialogDescription className="sr-only">
          Show opening and closing kilometer details.
        </DialogDescription>
      </DialogHeader>

      {/* B2B divider */}
      <div className="mt-[24px] border-t border-[#dddddd]" />

      <div className="mt-[28px] grid grid-cols-1 gap-[55px] md:grid-cols-2">

        {/* OPENING KM */}
        <div>
          <div className="flex flex-wrap items-center gap-[9px] text-[18px] text-[#444444]">
            <span>
              Opening Kilometer :
            </span>

            <span className="text-[21px] font-bold">
              {Number(day.km.opening_km || 0) > 0
                ? `${day.km.opening_km} KM`
                : "NAN"}
            </span>
          </div>

          <div className="mt-[28px]">
          {day.km.opening_speedmeter_image ? (
  <img
    src={getDailyMomentSpeedometerImageUrl(
      day.km.opening_speedmeter_image
    )}
    alt="Opening kilometer"
    className="max-h-[180px] max-w-full rounded-[4px] object-contain"
  />
) : (
  <div className="text-[20px] font-semibold text-[#071a64]">
    No Image Found
  </div>
)}
          </div>
        </div>

        {/* CLOSING KM */}
        <div>
          <div className="flex flex-wrap items-center gap-[9px] text-[18px] text-[#444444]">
            <span>
              Closing Kilometer :
            </span>

            <span className="text-[21px] font-bold">
              {Number(day.km.closing_km || 0) > 0
                ? `${day.km.closing_km} KM`
                : "NAN"}
            </span>
          </div>

          <div className="mt-[28px]">
          {day.km.closing_speedmeter_image ? (
  <img
    src={getDailyMomentSpeedometerImageUrl(
      day.km.closing_speedmeter_image
    )}
    alt="Closing kilometer"
    className="max-h-[180px] max-w-full rounded-[4px] object-contain"
  />
) : (
  <div className="text-[20px] font-semibold text-[#071a64]">
    No Image Found
  </div>
)}
          </div>
        </div>

      </div>
    </div>
  </DialogContent>
</Dialog>


{/* ============================================================
    UPLOAD IMAGE - B2B STYLE
============================================================ */}
<Dialog
  open={publicImageModalOpen}
  onOpenChange={(open) => {
    setPublicImageModalOpen(open);

    if (!open) {
      setPublicImageFiles([]);
      setPublicImageError(null);

      if (publicImageInputRef.current) {
        publicImageInputRef.current.value = "";
      }
    }
  }}
>
  <DialogContent
    className="
      !w-[650px]
      !max-w-[calc(100vw-32px)]
      gap-0
      rounded-[7px]
      border-0
      bg-white
      p-0
      shadow-2xl
      sm:!max-w-[650px]

      [&>button]:right-[48px]
      [&>button]:top-[48px]
      [&>button]:h-[25px]
      [&>button]:w-[25px]
      [&>button]:p-0
      [&>button]:text-[#777777]
      [&>button]:opacity-100
      [&>button]:focus:ring-0
      [&>button]:focus:ring-offset-0
      [&>button]:focus-visible:ring-0
      [&>button]:focus-visible:ring-offset-0
      [&>button]:focus-visible:outline-none

      [&>button>svg]:h-[23px]
      [&>button>svg]:w-[23px]
    "
  >
    <div className="px-[62px] pb-[58px] pt-[58px]">

      <DialogHeader className="space-y-0 text-left">
        <DialogTitle className="text-[28px] font-normal text-[#404040]">
          Upload Image
        </DialogTitle>

        <DialogDescription className="sr-only">
          Upload images for this itinerary day.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-[52px]">

        <label className="block text-[18px] font-normal text-[#555555]">
          Upload Image
        </label>

        {/* Native input:
            clicking Choose Files opens Windows file picker */}
        <input
          ref={publicImageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const files = Array.from(
              event.target.files || []
            );

            setPublicImageFiles(files);
            setPublicImageError(null);
          }}
          className="
            mt-[12px]
            block
            h-[48px]
            w-full
            cursor-pointer
            rounded-[4px]
            border
            border-[#d5d5d5]
            bg-white
            text-[16px]
            text-[#444444]

            file:mr-[14px]
            file:h-full
            file:cursor-pointer
            file:border-0
            file:border-r
            file:border-[#d5d5d5]
            file:bg-[#f8f8f8]
            file:px-[17px]
            file:text-[16px]
            file:text-[#333333]
          "
        />

        {publicImageError && (
          <div className="mt-[10px] text-[13px] text-red-600">
            {publicImageError}
          </div>
        )}

        <div className="mt-[70px] flex items-center justify-between">

          <button
            type="button"
            onClick={() =>
              setPublicImageModalOpen(false)
            }
            className="
              flex
              h-[44px]
              min-w-[132px]
              items-center
              justify-center
              rounded-[4px]
              bg-[#aaaaaa]
              px-[24px]
              text-[19px]
              font-normal
              text-white
              hover:bg-[#aaaaaa]
            "
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={publicImageSaving}
            onClick={handlePublicImageSave}
            className="
              flex
              h-[44px]
              min-w-[110px]
              items-center
              justify-center
              rounded-[4px]
              bg-[#ef4d4d]
              px-[24px]
              text-[19px]
              font-normal
              text-white
              hover:bg-[#ef4d4d]

              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {publicImageSaving
              ? "Saving..."
              : "Save"}
          </button>

        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>


{/* VIEW CHARGE - B2B STYLE */}
<Dialog
  open={viewChargeModalOpen}
  onOpenChange={setViewChargeModalOpen}
>
  <DialogContent
  className="
    !w-[500px]
    !max-w-[calc(100vw-32px)]
    gap-0
    rounded-[8px]
    border-0
    bg-white
    p-0
    shadow-2xl
    sm:!max-w-[500px]

    [&>button]:right-[48px]
    [&>button]:top-[50px]
    [&>button]:h-[24px]
    [&>button]:w-[24px]
    [&>button]:p-0
    [&>button]:text-[#777777]
    [&>button]:opacity-100
    [&>button]:hover:text-[#777777]
    [&>button]:focus:ring-0
    [&>button]:focus:ring-offset-0
    [&>button]:focus-visible:ring-0
    [&>button]:focus-visible:ring-offset-0
    [&>button]:focus-visible:outline-none
    [&>button]:shadow-none

    [&>button>svg]:h-[22px]
    [&>button>svg]:w-[22px]
  "
>
  <div className="px-[56px] pb-[55px] pt-[48px]">

      <DialogHeader className="space-y-0 text-left">
       <DialogTitle className="flex items-center gap-[10px] text-[22px] font-normal leading-none text-[#3d3d3d]">

          <span>
            List of Charges
          </span>

          {/* B2B money icon */}
          <span className="inline-flex h-[24px] w-[20px] rotate-[12deg] items-center justify-center rounded-[4px] border-2 border-[#ff4b55] text-[14px] font-semibold text-[#ff4b55]">
            ₹
          </span>
        </DialogTitle>

        <DialogDescription className="sr-only">
          List of charges for selected day.
        </DialogDescription>
      </DialogHeader>

     <div className="mt-[30px]">

        {charges.length === 0 ? (
          <div className="border-b border-[#cfcfcf] py-[16px] text-[18px] text-[#555555]">
            No charges.
          </div>
        ) : (
          charges.map((charge) => (
            <div
              key={charge.driver_charge_ID}
              className="flex items-center justify-between border-b border-[#bdbdbd] py-[11px] text-[16px] text-[#4a4a4a]"
            >
              <span>
                {charge.charge_type || "--"}
              </span>

              <span className="whitespace-nowrap">
                ₹ {formatAmount(charge.charge_amount)}
              </span>
            </div>
          ))
        )}

        {/* TOTAL CHARGE */}
        <div className="flex items-center justify-between pt-[16px] text-[16px] font-bold text-[#414141]">
          <span>
            Total Charge
          </span>

          <span className="whitespace-nowrap">
            ₹ {formatAmount(totalChargeAmount)}
          </span>
        </div>

      </div>
    </div>
  </DialogContent>
</Dialog>

        {/* ADD CHARGE - B2B STYLE */}
<Dialog
  open={chargeModalOpen}
  onOpenChange={setChargeModalOpen}
>
 <DialogContent
  className="
    !w-[500px]
    !max-w-[calc(100vw-32px)]
    gap-0
    rounded-[8px]
    border-0
    bg-white
    p-0
    shadow-2xl
    sm:!max-w-[500px]

    [&>button]:right-[48px]
    [&>button]:top-[48px]
    [&>button]:h-[24px]
    [&>button]:w-[24px]
    [&>button]:p-0
    [&>button]:text-[#777777]
    [&>button]:opacity-100
    [&>button]:hover:text-[#777777]
    [&>button]:focus:ring-0
    [&>button]:focus:ring-offset-0
    [&>button]:focus-visible:ring-0
    [&>button]:focus-visible:ring-offset-0
    [&>button]:focus-visible:outline-none
    [&>button]:shadow-none

    [&>button>svg]:h-[22px]
    [&>button>svg]:w-[22px]
  "
>
  <div className="px-[48px] pb-[48px] pt-[48px]">

      <DialogHeader className="space-y-0 text-left">

       <DialogTitle className="text-[24px] font-normal leading-none text-[#404040]">
  Add Charges
</DialogTitle>

        <DialogDescription className="sr-only">
          Add charges for selected day.
        </DialogDescription>

      </DialogHeader>

      {chargeErr && (
        <div className="mt-[25px] rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {chargeErr}
        </div>
      )}

      <form
  onSubmit={handleSaveCharge}
  className="mt-[40px]"
>

        {/* CHARGE TYPE */}
        <div>
         <label className="block text-[16px] font-normal text-[#4a4a4a]">
            Charge Type{" "}
            <span className="text-[#ed3f45]">
              *
            </span>
          </label>

          <Input
            value={chargeType}
            onChange={(e) =>
              setChargeType(e.target.value)
            }
            placeholder="Enter the Charge"
           className="
  mt-[10px]
  h-[38px]
  rounded-[4px]
  border
  border-[#d5d5d5]
  bg-white
  px-[14px]
  text-[15px]
  text-[#444444]
  shadow-none

  placeholder:text-[#d0d0d0]

  focus-visible:border-[#d5d5d5]
  focus-visible:ring-0
  focus-visible:ring-offset-0
"
          />
        </div>

    {/* CHARGE AMOUNT */}
<div className="mt-[20px]">
  <label className="block text-[16px] font-normal text-[#4a4a4a]">
    Charge Amount{" "}
    <span className="text-[#ed3f45]">
      *
    </span>
  </label>

  <Input
    type="number"
    min="0"
    step="0.01"
    value={chargeAmount}
    onChange={(e) =>
      setChargeAmount(e.target.value)
    }
    placeholder="Enter the Charge"
    className="
      mt-[10px]
      h-[38px]
      rounded-[4px]
      border
      border-[#d5d5d5]
      bg-white
      px-[14px]
      text-[15px]
      text-[#444444]
      shadow-none

      placeholder:text-[#d0d0d0]

      focus-visible:border-[#d5d5d5]
      focus-visible:ring-0
      focus-visible:ring-offset-0
    "
  />
</div>

        {/* B2B BUTTON POSITION */}
       <div className="mt-[40px] flex items-center justify-between">

          <button
            type="button"
            onClick={() =>
              setChargeModalOpen(false)
            }
           className="
  flex
  h-[36px]
  min-w-[102px]
  items-center
  justify-center
  rounded-[4px]
  bg-[#aaaaaa]
  px-[20px]
  text-[17px]
  font-normal
  text-white
  transition-none
  hover:bg-[#aaaaaa]
"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={chargeSaving}
            className="
  flex
  h-[36px]
  min-w-[86px]
  items-center
  justify-center
  rounded-[4px]
  bg-[#ef4d4d]
  px-[20px]
  text-[17px]
  font-normal
  text-white
  transition-none
  hover:bg-[#ef4d4d]
  disabled:cursor-not-allowed
  disabled:opacity-60
"
          >
            {chargeSaving
              ? "Saving..."
              : "Save"}
          </button>

        </div>
      </form>
    </div>
  </DialogContent>
</Dialog>
        </div>
      </div>
    );
  }

  const dayIdxOf = (day: DayViewDay) =>
    plan.days.findIndex(
      d =>
        d.itinerary_route_ID ===
        day.itinerary_route_ID
    ) + 1;

  return (
    <>
      <div id="pdf-container" className="w-full min-h-screen bg-[#ffe9f4] p-4 md:p-6 space-y-4">
      {/* Header strip */}
      <div className="bg-[#fdddf7] border border-[#f6c5f0] rounded-xl px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 z-10">
        <div className="text-xs md:text-sm text-[#4a4260]">
          <p className="font-semibold text-sm">{plan.quote_id || `Plan #${plan.itinerary_plan_ID}`}</p>
          <p className="text-[11px] mt-0.5 text-[#7b6f9a]">{plan.trip_start_date} – {plan.trip_end_date} ({plan.no_of_nights}N / {plan.no_of_days}D)</p>
          <p className="text-[11px] mt-0.5">{plan.arrival_location} <span className="mx-1">→</span> {plan.departure_location}</p>
        </div>
        {!pdfRendering && (
          <div className="flex gap-2 self-end md:self-auto">
            <Button size="sm" variant="outline" className="h-8 px-4 rounded-full border border-[#e3c8ff] bg-white text-xs" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3 w-3 mr-1" />Back
            </Button>
            <Button size="sm" className="h-8 px-4 rounded-full bg-[#198754] hover:bg-[#157347] text-white text-xs" onClick={handleDownloadPDF} disabled={pdfLoading}>
              <Download className="h-3 w-3 mr-1" />Download PDF
            </Button>
          </div>
        )}
      </div>

      {/* TE + Guest */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: "🌍", label: "Travel Expert", name: plan.travel_expert_name, mobile: plan.travel_expert_mobile, email: plan.travel_expert_email },
          { icon: "🎒", label: "Guest", name: plan.guest_name, mobile: plan.guest_mobile, email: plan.guest_email },
        ].map(({ icon, label, name, mobile, email }) => (
          <div key={label} className="bg-white rounded-xl border border-[#f6dfff] px-5 py-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#f8f0ff] flex items-center justify-center text-2xl">{icon}</div>
            <div className="text-xs text-[#4a4260]">
              <p className="text-[11px] uppercase tracking-wide text-[#a08ac5]">{label}</p>
              <p className="font-semibold text-sm">{name || "--"}</p>
              <p className="text-[11px] mt-0.5">{mobile || "--"} / {email || "--"}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-day accordion */}
      <div className="space-y-3">
        {plan.days.map((day, idx) => (
          <DayAccordionItem key={day.itinerary_route_ID} day={day} dayIndex={idx} itineraryPlanId={planId} pdfRendering={pdfRendering}
            onHotspotStatusChange={handleHotspotStatusChange}
            onActivityStatusChange={handleActivityStatusChange}
            onGuideStatusChange={handleGuideStatusChange}
            onOpenKm={openKmModal} onAddCharge={openAddCharge} onAddDriverReview={openAddRating} onAddGuideReview={openAddGuideRating}
            onUploadImage={async (_day, files) => {
              try {
                const result = await uploadDayImages({
                  itineraryPlanId: planId,
                  itineraryRouteId: _day.itinerary_route_ID,
                  files: Array.from(files),
                });
                alert(`${result.count} image(s) uploaded successfully.`);
              } catch (err: any) {
                alert(`Upload failed: ${err?.message ?? 'Unknown error'}`);
              }
            }}
            onUploadOpeningSpeedometer={handleUploadOpeningSpeedometer}
            onUploadClosingSpeedometer={handleUploadClosingSpeedometer}
          />
        ))}
      </div>

      {/* Overall KM */}
      <Card className="shadow-none border border-[#f6dfff] bg-white">
        <CardContent className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm font-semibold text-[#4a4260]">OVERALL KILOMETER SUMMARY</p>
          <p className="text-sm font-semibold text-[#4a4260]">Total Running KM – <span className="text-[#a448ff]">{totalRunningKm.toLocaleString()} KM</span></p>
        </CardContent>
      </Card>

      {/* Charge table */}
      <Card className="shadow-none border border-[#f6dfff] bg-white">
        <CardContent className="px-4 md:px-6 py-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm font-semibold text-[#4a4260]">List of Charge Details</p>
            {!pdfRendering && <div className="flex items-center gap-2"><span className="text-xs text-[#4a4260]">Search:</span><Input value={chargeSearch} onChange={e => setChargeSearch(e.target.value)} className="h-8 w-40 text-xs" placeholder="Search…" /></div>}
          </div>
          <div className="border border-[#f3e0ff] rounded-lg overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead className="bg-[#fbf2ff]"><tr>{["S.NO","ACTION","CHARGE TITLE","AMOUNT"].map(h => <th key={h} className="px-3 py-2 text-left text-[#4a4260] font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {filteredCharges.length === 0
                  ? <tr><td colSpan={4} className="px-3 py-4 text-center text-[#7b6f9a]">No charges.</td></tr>
                  : filteredCharges.map((c, i) => (
                    <tr key={c.driver_charge_ID} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf5ff]"}>
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">{!pdfRendering && <button onClick={() => handleDeleteCharge(c.driver_charge_ID)} className="text-red-500 hover:text-red-700 text-[10px] underline">✕ Del</button>}</td>
                      <td className="px-3 py-2">{c.charge_type || "--"}</td>
                      <td className="px-3 py-2">₹{formatAmount(c.charge_amount)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Guide Rating table */}
      <Card className="shadow-none border border-[#f6dfff] bg-white">
        <CardContent className="px-4 md:px-6 py-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm font-semibold text-[#4a4260]">List of Guide Rating Details</p>
            {!pdfRendering && <div className="flex items-center gap-2"><span className="text-xs text-[#4a4260]">Search:</span><Input value={guideRatingSearch} onChange={e => setGuideRatingSearch(e.target.value)} className="h-8 w-40 text-xs" placeholder="Search…" /></div>}
          </div>
          <div className="border border-[#f3e0ff] rounded-lg overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead className="bg-[#fbf2ff]"><tr>{["S.NO","ACTION","GUIDE","DAY","RATING","NOTES"].map(h => <th key={h} className="px-3 py-2 text-left text-[#4a4260] font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {filteredGuideRatings.length === 0
                  ? <tr><td colSpan={6} className="px-3 py-4 text-center text-[#7b6f9a]">No guide ratings.</td></tr>
                  : filteredGuideRatings.map((r: any, i: number) => (
                    <tr key={r.guide_review_id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf5ff]"}>
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">{!pdfRendering && r.guide_review_id && <button onClick={() => handleDeleteGuideRating(r.guide_review_id)} className="text-red-500 text-[10px] underline">✕ Del</button>}</td>
                      <td className="px-3 py-2">{r.guide_name || "--"}</td>
                      <td className="px-3 py-2">{r.route_date || "--"}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(n => <Star key={n} className="h-3 w-3" fill={n <= Number(r.guide_rating ?? 0) ? "#fbbf24" : "none"} stroke="#fbbf24" />)}
                          <span className="ml-1">({r.guide_rating ?? "--"})</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[180px] truncate">{r.guide_description || "--"}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rating table */}
      <Card className="shadow-none border border-[#f6dfff] bg-white">
        <CardContent className="px-4 md:px-6 py-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm font-semibold text-[#4a4260]">List of Rating Details</p>
            {!pdfRendering && <div className="flex items-center gap-2"><span className="text-xs text-[#4a4260]">Search:</span><Input value={ratingSearch} onChange={e => setRatingSearch(e.target.value)} className="h-8 w-40 text-xs" placeholder="Search…" /></div>}
          </div>
          <div className="border border-[#f3e0ff] rounded-lg overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead className="bg-[#fbf2ff]"><tr>{["S.NO","ACTION","DAY","RATING","NOTES"].map(h => <th key={h} className="px-3 py-2 text-left text-[#4a4260] font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {filteredRatings.length === 0
                  ? <tr><td colSpan={5} className="px-3 py-4 text-center text-[#7b6f9a]">No ratings.</td></tr>
                  : filteredRatings.map((r: any, i: number) => (
                    <tr key={r.driver_feedback_ID ?? i} className={i % 2 === 0 ? "bg-white" : "bg-[#fdf5ff]"}>
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">{!pdfRendering && r.driver_feedback_ID && <button onClick={() => handleDeleteRating(r.driver_feedback_ID)} className="text-red-500 text-[10px] underline">✕ Del</button>}</td>
                      <td className="px-3 py-2">{r.route_date || "--"}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(n => <Star key={n} className="h-3 w-3" fill={n <= Number(r.driver_rating ?? 0) ? "#fbbf24" : "none"} stroke="#fbbf24" />)}
                          <span className="ml-1">({r.driver_rating ?? "--"})</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[180px] truncate">{r.driver_description || "--"}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ══ MODALS ══ */}

      {/* Charge modal */}
      <Dialog open={chargeModalOpen} onOpenChange={setChargeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{chargeDay ? `Add Charge – Day ${dayIdxOf(chargeDay)}` : "Add Charge"}</DialogTitle>
            <DialogDescription className="sr-only">
              Add a charge title and amount for the selected day.
            </DialogDescription>
          </DialogHeader>
          {chargeErr && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{chargeErr}</div>}
          <form onSubmit={handleSaveCharge} className="space-y-3">
            <div className="space-y-1"><Label className="text-xs text-[#4a4260]">Charge Title <span className="text-red-500">*</span></Label><Input value={chargeType} onChange={e => setChargeType(e.target.value)} placeholder="e.g. Toll fee" className="h-10 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs text-[#4a4260]">Charge Amount <span className="text-red-500">*</span></Label><Input type="number" step="0.01" min="0" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} placeholder="e.g. 250" className="h-10 text-sm" /></div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setChargeModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={chargeSaving} className="bg-gradient-to-r from-[#f763c6] to-[#a347ff] text-white">{chargeSaving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rating modal */}
      <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{ratingDay ? `Review – Day ${dayIdxOf(ratingDay)}` : "Add Review"}</DialogTitle>
            <DialogDescription className="sr-only">
              Submit a star rating and optional notes for this day.
            </DialogDescription>
          </DialogHeader>
          {ratingErr && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{ratingErr}</div>}
          <form onSubmit={handleSaveRating} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#4a4260]">Rating <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(v => (
                  <button key={v} type="button" onClick={() => setRatingValue(v)} className={`h-9 w-9 rounded-full flex items-center justify-center border ${ratingValue >= v ? "bg-[#ffc107] border-[#e0a800]" : "bg-white border-[#e3d4ff]"}`}>
                    <Star className="h-4 w-4" fill={ratingValue >= v ? "#4a4260" : "none"} stroke="#4a4260" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs text-[#4a4260]">Notes</Label><Textarea value={ratingFeedback} onChange={e => setRatingFeedback(e.target.value)} rows={3} className="text-sm" placeholder="Optional notes…" /></div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setRatingModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={ratingSaving} className="bg-gradient-to-r from-[#f763c6] to-[#a347ff] text-white">{ratingSaving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Guide rating modal */}
      <Dialog open={guideRatingModalOpen} onOpenChange={setGuideRatingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{guideRatingDay ? `Guide Review – Day ${dayIdxOf(guideRatingDay)}` : "Add Guide Review"}</DialogTitle>
            <DialogDescription className="sr-only">
              Submit a guide rating and optional notes for this day.
            </DialogDescription>
          </DialogHeader>
          {guideRatingErr && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{guideRatingErr}</div>}
          <form onSubmit={handleSaveGuideRating} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#4a4260]">Rating <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(v => (
                  <button key={v} type="button" onClick={() => setGuideRatingValue(v)} className={`h-9 w-9 rounded-full flex items-center justify-center border ${guideRatingValue >= v ? "bg-[#ffc107] border-[#e0a800]" : "bg-white border-[#e3d4ff]"}`}>
                    <Star className="h-4 w-4" fill={guideRatingValue >= v ? "#4a4260" : "none"} stroke="#4a4260" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs text-[#4a4260]">Notes</Label><Textarea value={guideRatingFeedback} onChange={e => setGuideRatingFeedback(e.target.value)} rows={3} className="text-sm" placeholder="Optional notes…" /></div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setGuideRatingModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={guideRatingSaving} className="bg-gradient-to-r from-[#f763c6] to-[#a347ff] text-white">{guideRatingSaving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KM modal */}
        {kmDay && (
          <KmModal
            open={kmModalOpen}
            onClose={() => setKmModalOpen(false)}
            openingKm={kmDay.km.opening_km}
            onSaveOpening={async (value) => {
              await saveOpeningKm({ itineraryPlanId: planId, itineraryRouteId: kmDay.itinerary_route_ID, startingKilometer: value });
              handleKmSaved();
            }}
            onSaveClosing={async (value) => {
              await saveClosingKm({ itineraryPlanId: planId, itineraryRouteId: kmDay.itinerary_route_ID, closingKilometer: value });
              handleKmSaved();
            }}
          />
        )}
      </div>

      {pdfLoading && (
        <div
          data-html2canvas-ignore="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#2c1538]/28 backdrop-blur-sm"
        >
          <div className="w-[280px] rounded-2xl border border-white/70 bg-white/95 px-7 py-6 text-center shadow-[0_20px_60px_rgba(90,34,110,0.18)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffe3f3_0%,#f7efff_100%)]">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#f4008f] border-t-transparent" />
            </div>
            <p className="text-sm font-semibold text-[#4a4260]">Generating PDF</p>
          </div>
        </div>
      )}
    </>
  );
};

export default DailyMomentDayView;
