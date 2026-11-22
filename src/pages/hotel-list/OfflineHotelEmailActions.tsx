import { useRef, useState } from "react";
import { Eye, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDisplayDate } from "./hotelList.utils";
import {
  offlineBookingKey, offlineHotelBookingApi, offlineVoucherStay,
  type OfflineBookingDetails, type OfflineBookingStay, type OfflineVoucherTemplate,
} from "./offlineHotelBooking";
import styles from "./OfflineHotelBookingDialog.module.css";

type EmailTarget = {
  stay: OfflineBookingStay;
  hasEmail: boolean;
  savedVersion: number | undefined;
};

type EmailActionsProps = {
  planId: number;
  groupType: number;
  activeStay?: OfflineBookingStay;
  activeDetails?: OfflineBookingDetails;
  selected: EmailTarget[];
  all: EmailTarget[];
  saving: boolean;
  sending: boolean;
  onSendingChange: (sending: boolean) => void;
};

export function OfflineHotelEmailActions({
  planId, groupType, activeStay, activeDetails, selected, all, saving, sending, onSendingChange,
}: EmailActionsProps) {
  const [template, setTemplate] = useState<OfflineVoucherTemplate>("hotel-voucher");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [feedback, setFeedback] = useState<{ summary: string; issues: string[] }>();
  const [validation, setValidation] = useState<{ missingEmail: OfflineBookingStay[]; needsSave: OfflineBookingStay[] }>();
  const previewRequest = useRef(0);
  const sendButton = useRef<HTMLButtonElement | null>(null);

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

  const send = async (targets: EmailTarget[], button: HTMLButtonElement) => {
    if (saving || sending || !targets.length) return;
    setFeedback(undefined);
    const missingEmail = targets.filter(({ hasEmail }) => !hasEmail).map(({ stay }) => stay);
    const needsSave = targets.filter(({ hasEmail, savedVersion }) => hasEmail && savedVersion === undefined).map(({ stay }) => stay);
    if (missingEmail.length || needsSave.length) {
      sendButton.current = button;
      setValidation({ missingEmail, needsSave });
      return;
    }
    const stays = targets.flatMap(({ stay, savedVersion }) => savedVersion === undefined
      ? [] : [{ ...offlineVoucherStay(stay), version: savedVersion }]);
    onSendingChange(true);
    try {
      const { results } = await offlineHotelBookingApi.sendVouchers(planId, groupType, template, stays);
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
            disabled={saving || sending || !selected.length} onClick={(event) => void send(selected, event.currentTarget)}>
            <Mail aria-hidden="true" /> Send to Selected ({selected.length})
          </Button>
          <Button type="button" size="sm" className={styles.save}
            disabled={saving || sending || !all.length} onClick={(event) => void send(all, event.currentTarget)}>
            {sending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            Send to All Hotels
          </Button>
        </div>
      </div>
      {feedback && <div className={styles.emailFeedback} role={feedback.issues.length ? "alert" : "status"}>
        {feedback.summary && <p>{feedback.summary}</p>}
        {feedback.issues.length > 0 && <ul>{feedback.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
      </div>}
      <Dialog open={validation !== undefined} onOpenChange={(open) => { if (!open) setValidation(undefined); }}>
        <DialogContent className={styles.voucherValidation} overlayClassName="bg-slate-950/45" hideClose
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            sendButton.current?.focus();
          }}>
          <DialogTitle>{validation?.missingEmail.length ? "Missing hotel email addresses" : "Save bookings before sending"}</DialogTitle>
          <DialogDescription>
            {validation?.missingEmail.length
              ? "Add the missing hotel email addresses and save the affected bookings before sending vouchers."
              : "Save the booking for each stay listed below, then try sending again."}
          </DialogDescription>
          {validation && <div className={styles.validationStays}>
            {([
              ["Missing email address", validation.missingEmail],
              ["Booking needs to be saved", validation.needsSave],
            ] as const).map(([label, stays]) => stays.length > 0 && (
              <div key={label}>
                {validation.missingEmail.length > 0 && validation.needsSave.length > 0 && <h3>{label}</h3>}
                <ul aria-label={label}>
                  {stays.map((stay) => <li key={offlineBookingKey(stay)}>
                    <strong>{stay.hotelName}</strong>
                    <span>{formatDisplayDate(stay.checkIn)} – {formatDisplayDate(stay.checkOut)}</span>
                  </li>)}
                </ul>
              </div>
            ))}
          </div>}
          <DialogClose asChild>
            <Button type="button" className={styles.save}>Back to hotel stays</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </section>
  );
}
