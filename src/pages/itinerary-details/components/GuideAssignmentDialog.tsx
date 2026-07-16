import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface GuideAssignmentDialogProps {
  guideModal: any;
  setGuideModal: React.Dispatch<React.SetStateAction<any>>;
  formatDate: (value: string) => string;
  onSave: () => void | Promise<void>;
}

export const GuideAssignmentDialog: React.FC<GuideAssignmentDialogProps> = ({ guideModal, setGuideModal, formatDate, onSave }) => (
  <Dialog
    open={guideModal.open}
    onOpenChange={(open) => {
      if (!open && !guideModal.saving) {
        setGuideModal((prev) => ({ ...prev, open: false, loading: false, saving: false }));
      }
    }}
  >
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {Number(guideModal.guideType || 0) === 1
            ? (guideModal.routeGuideId ? "Update Guide for Full Itinerary" : "Add Guide for Full Itinerary")
            : guideModal.routeGuideId
              ? `Update Guide for "${formatDate(String(guideModal.day?.date || ""))}"`
              : `Add Guide for "${formatDate(String(guideModal.day?.date || ""))}"`}
        </DialogTitle>
        <DialogDescription>
          {Number(guideModal.guideType || 0) === 1
            ? "Choose the guide language and slot for the full itinerary."
            : "Choose the guide language and slot for this itinerary day."}
        </DialogDescription>
      </DialogHeader>

      {guideModal.loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#d546ab]" /></div>
      ) : (
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#4a4260]">Language</label>
            <Select value={guideModal.guideLanguage} onValueChange={(value) => setGuideModal((prev) => ({ ...prev, guideLanguage: value }))}>
              <SelectTrigger className="border-[#e5d9f2] focus:ring-[#d546ab]"><SelectValue placeholder="Choose Language" /></SelectTrigger>
              <SelectContent>
                {guideModal.options.languages.map((language: any) => <SelectItem key={language.id} value={String(language.id)}>{language.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#4a4260]">Slot</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {guideModal.options.slots.map((slot: any) => {
                const selected = guideModal.guideSlots.includes(slot.id);
                return (
                  <button key={slot.id} type="button" className={`rounded-lg border px-3 py-2 text-left text-sm transition ${selected ? "border-[#d546ab] bg-[#fdf6ff] text-[#d546ab]" : "border-[#e5d9f2] bg-white text-[#4a4260] hover:bg-[#faf7fc]"}`} onClick={() => setGuideModal((prev) => ({ ...prev, guideSlots: prev.guideSlots.includes(slot.id) ? prev.guideSlots.filter((item: number) => item !== slot.id) : [...prev.guideSlots, slot.id].sort((a: number, b: number) => a - b) }))}>{slot.label}</button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => setGuideModal((prev) => ({ ...prev, open: false }))} disabled={guideModal.saving}>Cancel</Button>
        <Button onClick={() => void onSave()} disabled={guideModal.loading || guideModal.saving} className="bg-[#d546ab] hover:bg-[#bf3397]">
          {guideModal.saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

