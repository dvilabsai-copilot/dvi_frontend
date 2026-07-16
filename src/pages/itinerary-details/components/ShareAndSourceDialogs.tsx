import { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { MarkdownPreview } from "@/components/itinerary/MarkdownPreview";

export function SourcePreviewDialog({
  open,
  setOpen,
  heading,
  loading,
  error,
  markdown,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  heading: string;
  loading: boolean;
  error: string | null;
  markdown: string;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Source Preview</DialogTitle>
          <DialogDescription>Markdown output for the selected quote and day</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{heading || "Loading source details..."}</div>
        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" /></div> : error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : <MarkdownPreview markdown={markdown || "No markdown content returned."} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ShareEmailDialog({ open, setOpen, quoteId }: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; quoteId: string }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Share via Email</DialogTitle><DialogDescription>Send itinerary details via email</DialogDescription></DialogHeader>
        <div className="py-4 space-y-4">
          <div><label className="text-sm font-medium text-[#4a4260] mb-2 block">Recipient Email</label><input type="email" className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]" placeholder="email@example.com" id="share-email-input" /></div>
          <div><label className="text-sm font-medium text-[#4a4260] mb-2 block">Message (Optional)</label><textarea className="w-full px-3 py-2 border border-[#e5d9f2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d546ab]" rows={4} placeholder="Add a personal message..." id="share-email-message" /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-[#17a2b8] hover:bg-[#138496]" onClick={() => {
            const emailInput = document.getElementById('share-email-input') as HTMLInputElement;
            const messageInput = document.getElementById('share-email-message') as HTMLTextAreaElement;
            if (!emailInput?.value) { toast.error('Please enter recipient email'); return; }
            const subject = encodeURIComponent(`Itinerary Details - ${quoteId}`);
            const body = encodeURIComponent(`${messageInput?.value || 'Please find the itinerary details below:'}\n\nItinerary Link: ${window.location.href}`);
            window.open(`mailto:${emailInput.value}?subject=${subject}&body=${body}`, '_blank');
            toast.success('Email client opened!');
            setOpen(false);
          }}>Send Email</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
