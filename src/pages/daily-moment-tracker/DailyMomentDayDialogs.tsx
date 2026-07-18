import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const NotVisitedModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  title?: string;
}> = ({ open, onClose, onSubmit, title }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setReason(""); setErr(null); } }, [open]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) { setErr("Reason is required."); return; }
    try { setSaving(true); await onSubmit(reason.trim()); onClose(); }
    catch (error) { setErr(error instanceof Error ? error.message : "Failed."); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-base font-semibold">{title ?? "Not Visited – Reason"}</DialogTitle><DialogDescription className="sr-only">Provide the reason for marking this stop as not visited.</DialogDescription></DialogHeader>
        {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label className="text-xs text-[#4a4260]">Reason <span className="text-red-500">*</span></Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="text-sm" placeholder="Enter reason…" /></div>
          <DialogFooter className="gap-2"><Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button><Button type="submit" size="sm" disabled={saving} className="bg-gradient-to-r from-[#f763c6] to-[#a347ff] text-white">{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const KmModal: React.FC<{
  open: boolean;
  onClose: () => void;
  openingKm: string;
  onSaveOpening: (value: string) => Promise<void>;
  onSaveClosing: (value: string) => Promise<void>;
}> = ({ open, onClose, openingKm, onSaveOpening, onSaveClosing }) => {
  const [startKm, setStartKm] = useState("");
  const [closeKm, setCloseKm] = useState("");
  const [savingOpen, setSavingOpen] = useState(false);
  const [savingClose, setSavingClose] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setStartKm(""); setCloseKm(""); setErr(null); } }, [open]);
  const handleOpen = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!startKm.trim() || Number(startKm) <= 0) { setErr("Enter a valid starting KM."); return; }
    try { setSavingOpen(true); setErr(null); await onSaveOpening(startKm); onClose(); }
    catch (error) { setErr(error instanceof Error ? error.message : "Failed."); }
    finally { setSavingOpen(false); }
  };
  const handleClose = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!closeKm.trim()) { setErr("Enter closing KM."); return; }
    try { setSavingClose(true); setErr(null); await onSaveClosing(closeKm); onClose(); }
    catch (error) { setErr(error instanceof Error ? error.message : "Failed."); }
    finally { setSavingClose(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="text-base font-semibold">Kilometer Entry</DialogTitle><DialogDescription className="sr-only">Save opening or closing kilometer values for this route.</DialogDescription></DialogHeader>
        {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form onSubmit={handleOpen} className="space-y-2 border border-[#e3d4ff] rounded-lg p-3"><p className="text-xs font-semibold text-[#4a4260]">Opening KM</p><Input type="number" min="1" step="1" value={startKm} onChange={(event) => setStartKm(event.target.value)} placeholder="e.g. 10500" className="h-9 text-sm" /><Button type="submit" size="sm" disabled={savingOpen} className="w-full h-9 bg-[#16a34a] text-white">{savingOpen ? "Saving…" : "Save Opening KM"}</Button></form>
          <form onSubmit={handleClose} className="space-y-2 border border-[#e3d4ff] rounded-lg p-3"><p className="text-xs font-semibold text-[#4a4260]">Closing KM <span className="text-[10px] text-[#7b6f9a]">(must &gt; {openingKm || "0"})</span></p><Input type="number" min="1" step="1" value={closeKm} onChange={(event) => setCloseKm(event.target.value)} placeholder="e.g. 10750" className="h-9 text-sm" /><Button type="submit" size="sm" disabled={savingClose} className="w-full h-9 bg-[#7c3aed] text-white">{savingClose ? "Saving…" : "Save Closing KM"}</Button></form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
