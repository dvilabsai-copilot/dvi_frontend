import { useRef, useState } from "react";
import { Eye, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  offlineBookingKey, offlineHotelBookingApi, offlineVoucherStay,
  type OfflineBookingDetails, type OfflineBookingStay, type OfflineVoucherTemplate,
} from "./offlineHotelBooking";
import styles from "./OfflineHotelBookingDialog.module.css";

type BookedStay = OfflineBookingStay & { version: number };

type EmailActionsProps = {
  planId: number;
  groupType: number;
  activeStay?: OfflineBookingStay;
  activeDetails?: OfflineBookingDetails;
  selected: BookedStay[];
  eligible: BookedStay[];
  saving: boolean;
  sending: boolean;
  onSendingChange: (sending: boolean) => void;
};

export function OfflineHotelEmailActions({
  planId, groupType, activeStay, activeDetails, selected, eligible, saving, sending, onSendingChange,
}: EmailActionsProps) {
  const [template, setTemplate] = useState<OfflineVoucherTemplate>("hotel-voucher");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [feedback, setFeedback] = useState<{ summary: string; issues: string[] }>();
  const previewRequest = useRef(0);

  const loadPreview = async () => {
    if (!activeStay || !activeDetails) return;
    const request = ++previewRequest.current;
    setPreview(null);
    setPreviewError("");
    try {
      const voucher = await offlineHotelBookingApi.previewVoucher(
        planId, groupType, template, offlineVoucherStay(activeStay), { ...activeDetails, emails: [] },
      );
      if (request === previewRequest.current) setPreview(voucher);
    } catch (error) {
      if (request === previewRequest.current) {
        setPreviewError(error instanceof Error ? error.message : "Unable to preview the voucher.");
      }
    }
  };

  const send = async (stays: BookedStay[]) => {
    if (saving || sending || !stays.length) return;
    setFeedback(undefined);
    onSendingChange(true);
    try {
      const { results } = await offlineHotelBookingApi.sendVouchers(
        planId, groupType, template, stays.map((stay) => ({ ...offlineVoucherStay(stay), version: stay.version })),
      );
      const stayByKey = new Map(stays.map((stay) => [offlineBookingKey(stay), stay]));
      const sent = results.filter((result) => result.status === "sent").length;
      const demo = results.filter((result) => result.status === "demo").length;
      const issues = results.flatMap((result) => {
        if (result.status === "sent" || result.status === "demo") return [];
        const stay = stayByKey.get(result.key);
        return [`${stay ? `${stay.hotelName} (${stay.checkIn})` : "Hotel stay"}: ${result.message || "Some recipients were rejected."}`];
      });
      setFeedback({
        summary: [
          sent ? `${sent} ${sent === 1 ? "voucher" : "vouchers"} sent.` : "",
          demo ? `${demo} sent to the demo inbox.` : "",
          issues.length ? `${issues.length} ${issues.length === 1 ? "stay needs" : "stays need"} attention.` : "",
        ].filter(Boolean).join(" "),
        issues,
      });
    } catch (error) {
      setFeedback({ summary: "", issues: [error instanceof Error ? error.message : "Unable to send vouchers."] });
    } finally {
      onSendingChange(false);
    }
  };

  return (
    <section className={styles.emailActions} aria-label="Email Actions">
      <div className={styles.emailToolbar}>
        <h3><Mail aria-hidden="true" /> Email Actions</h3>
        <label className={styles.templateField}>
          <span>Email Template</span>
          <select className={styles.select} aria-label="Email Template" value={template} disabled={sending}
            onChange={(event) => setTemplate(event.target.value as OfflineVoucherTemplate)}>
            <option value="hotel-voucher">Hotel Voucher (Default)</option>
          </select>
        </label>
        <Dialog onOpenChange={(open) => { if (!open) previewRequest.current++; }}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className={styles.emailOutline}
              disabled={saving || sending || !activeDetails} onClick={() => void loadPreview()}>
              <Eye aria-hidden="true" /> Preview Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className={styles.voucherPreview}>
            <DialogTitle>Preview Voucher</DialogTitle>
            <DialogDescription>{preview?.subject ?? activeStay?.hotelName}</DialogDescription>
            {previewError ? <p role="alert" className={styles.error}>{previewError}</p>
              : preview ? <iframe title="Hotel voucher email" srcDoc={preview.html} sandbox="" />
                : <p role="status">Loading voucher…</p>}
          </DialogContent>
        </Dialog>
        <div className={styles.sendActions}>
          <Button type="button" variant="outline" size="sm" className={styles.emailOutline}
            disabled={saving || sending || !selected.length} onClick={() => void send(selected)}>
            <Mail aria-hidden="true" /> Send to Selected ({selected.length})
          </Button>
          <Button type="button" size="sm" className={styles.save}
            disabled={saving || sending || !eligible.length} onClick={() => void send(eligible)}>
            {sending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            Send to All Hotels
          </Button>
        </div>
      </div>
      {feedback ? <div className={styles.emailFeedback} role={feedback.issues.length ? "alert" : "status"}>
        {feedback.summary && <p>{feedback.summary}</p>}
        {feedback.issues.length > 0 && <ul>{feedback.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
      </div> : eligible.length === 0 && <p className={styles.emailFeedback}>Save a stay with a hotel email address to send its voucher.</p>}
    </section>
  );
}
