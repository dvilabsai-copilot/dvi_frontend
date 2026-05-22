// FILE: src/pages/daily-moment-tracker/DailyMomentDayView.tsx
// Full multi-day accordion view for Daily Moment (replicated from PHP day_list)

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CarIcon, Star, Clock, MapPin, ChevronDown, ChevronUp, Camera, Download } from "lucide-react";

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
  uploadDayImages,
  uploadOpeningSpeedometerImage,
  uploadClosingSpeedometerImage,
  DailyMomentCharge,
} from "@/services/dailyMomentTracker";
import { fetchDriverRatings as fetchDriverRatingsApi } from "@/services/dailyMomentTracker";
import { fetchGuideRatings as fetchGuideRatingsApi } from "@/services/dailyMomentTracker";

/* ============================================================ helpers */

function formatAmount(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "0.00";
  return Number(v).toFixed(2);
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

/* ============================================================ NotVisitedModal */

const NotVisitedModal: React.FC<{
  open: boolean; onClose: () => void; onSubmit: (r: string) => Promise<void>; title?: string;
}> = ({ open, onClose, onSubmit, title }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setReason(""); setErr(null); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setErr("Reason is required."); return; }
    try { setSaving(true); await onSubmit(reason.trim()); onClose(); }
    catch (ex: any) { setErr(ex?.message || "Failed."); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title ?? "Not Visited – Reason"}</DialogTitle>
          <DialogDescription className="sr-only">
            Provide the reason for marking this stop as not visited.
          </DialogDescription>
        </DialogHeader>
        {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-[#4a4260]">Reason <span className="text-red-500">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="text-sm" placeholder="Enter reason…" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-gradient-to-r from-[#f763c6] to-[#a347ff] text-white">{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ============================================================ KmModal */

const KmModal: React.FC<{
  open: boolean; onClose: () => void; itineraryPlanId: number; itineraryRouteId: number; openingKm: string; onSaved: () => void;
}> = ({ open, onClose, itineraryPlanId, itineraryRouteId, openingKm, onSaved }) => {
  const [startKm, setStartKm] = useState("");
  const [closeKm, setCloseKm] = useState("");
  const [savingOpen, setSavingOpen] = useState(false);
  const [savingClose, setSavingClose] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setStartKm(""); setCloseKm(""); setErr(null); } }, [open]);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startKm.trim() || Number(startKm) <= 0) { setErr("Enter a valid starting KM."); return; }
    try { setSavingOpen(true); setErr(null); await saveOpeningKm({ itineraryPlanId, itineraryRouteId, startingKilometer: startKm }); onSaved(); onClose(); }
    catch (ex: any) { setErr(ex?.message || "Failed."); } finally { setSavingOpen(false); }
  };
  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeKm.trim()) { setErr("Enter closing KM."); return; }
    try { setSavingClose(true); setErr(null); await saveClosingKm({ itineraryPlanId, itineraryRouteId, closingKilometer: closeKm }); onSaved(); onClose(); }
    catch (ex: any) { setErr(ex?.message || "Failed."); } finally { setSavingClose(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Kilometer Entry</DialogTitle>
          <DialogDescription className="sr-only">
            Save opening or closing kilometer values for this route.
          </DialogDescription>
        </DialogHeader>
        {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form onSubmit={handleOpen} className="space-y-2 border border-[#e3d4ff] rounded-lg p-3">
            <p className="text-xs font-semibold text-[#4a4260]">Opening KM</p>
            <Input type="number" min="1" step="1" value={startKm} onChange={(e) => setStartKm(e.target.value)} placeholder="e.g. 10500" className="h-9 text-sm" />
            <Button type="submit" size="sm" disabled={savingOpen} className="w-full h-9 bg-[#16a34a] text-white">{savingOpen ? "Saving…" : "Save Opening KM"}</Button>
          </form>
          <form onSubmit={handleClose} className="space-y-2 border border-[#e3d4ff] rounded-lg p-3">
            <p className="text-xs font-semibold text-[#4a4260]">Closing KM <span className="text-[10px] text-[#7b6f9a]">(must &gt; {openingKm || "0"})</span></p>
            <Input type="number" min="1" step="1" value={closeKm} onChange={(e) => setCloseKm(e.target.value)} placeholder="e.g. 10750" className="h-9 text-sm" />
            <Button type="submit" size="sm" disabled={savingClose} className="w-full h-9 bg-[#7c3aed] text-white">{savingClose ? "Saving…" : "Save Closing KM"}</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ============================================================ HotspotCard */

const HotspotCard: React.FC<{
  spot: DayViewHotspot;
  onStatusChange: (spot: DayViewHotspot, status: 1 | 2, reason?: string) => Promise<void>;
  onActivityStatusChange: (activity: DayViewActivity, status: 1 | 2, reason?: string) => Promise<void>;
}> = ({ spot, onStatusChange, onActivityStatusChange }) => {
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
      <div className={`rounded-xl px-4 py-3 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${cardBg}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-[#7c3aed] shadow-sm flex-shrink-0">{spot.serial_no}</div>
          <div className="text-xs text-[#4a4260]">
            <p className="font-semibold text-sm">{spot.hotspot_name}</p>
            {spot.hotspot_location && <p className="text-[11px] text-[#7b6f9a] flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{spot.hotspot_location}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[#7b6f9a]">
              {(spot.start_time !== "--" || spot.end_time !== "--") && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{spot.start_time} – {spot.end_time}</span>}
              {spot.duration_label && spot.duration_label !== "0 Min" && <span>⏱ {spot.duration_label}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          {localStatus === 0 ? (
            <>
              <button type="button" disabled={saving} onClick={handleVisited} className="h-8 px-4 rounded-full text-[11px] font-semibold border bg-white border-[#d1fadf] text-[#15803d] hover:bg-[#dcfce7] transition-colors disabled:opacity-50">✓ Visited</button>
              <button type="button" disabled={saving} onClick={() => setNvOpen(true)} className="h-8 px-4 rounded-full text-[11px] font-semibold border bg-white border-[#fecaca] text-[#b91c1c] hover:bg-[#fee2e2] transition-colors">✕ Not Visited</button>
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
                <HotspotCard key={spot.confirmed_route_hotspot_ID} spot={spot}
                  onStatusChange={(s, status, reason) => onHotspotStatusChange(s, status, reason, dayIndex, hIdx)}
                  onActivityStatusChange={(a, status, reason) => onActivityStatusChange(a, status, reason, dayIndex, hIdx, (spot.activities ?? []).findIndex(x => x.confirmed_route_activity_ID === a.confirmed_route_activity_ID))} />
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
  const [chargeDay, setChargeDay] = useState<DayViewDay | null>(null);
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
    spot: DayViewHotspot, status: 1 | 2, reason: string | undefined, dayIdx: number, hIdx: number
  ) => {
    await updateHotspotStatus({ confirmedRouteHotspotId: spot.confirmed_route_hotspot_ID, status, description: reason, perspective: "driver" });
    setPlan(prev => {
      if (!prev) return prev;
      const days = [...prev.days]; const day = { ...days[dayIdx] };
      const hotspots = [...day.hotspots];
      hotspots[hIdx] = { ...hotspots[hIdx], driver_hotspot_status: status, driver_not_visited_description: status === 2 ? (reason ?? "") : null };
      day.hotspots = hotspots; days[dayIdx] = day;
      return { ...prev, days };
    });
  }, []);

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

  const dayIdxOf = (day: DayViewDay) => plan.days.findIndex(d => d.itinerary_route_ID === day.itinerary_route_ID) + 1;

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
          <KmModal open={kmModalOpen} onClose={() => setKmModalOpen(false)}
            itineraryPlanId={planId} itineraryRouteId={kmDay.itinerary_route_ID}
            openingKm={kmDay.km.opening_km} onSaved={handleKmSaved} />
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