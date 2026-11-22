import { useRef, useState, type FormEvent } from "react";
import { Eye, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "./hotelList.utils";
import {
  offlineBookingKey, offlineHotelBookingApi, offlineVoucherStay,
  type OfflineBookingDetails, type OfflineBookingStay, type OfflineVoucherStay, type OfflineVoucherTemplate,
} from "./offlineHotelBooking";
import styles from "./OfflineHotelBookingDialog.module.css";

type EmailTarget = {
  stay: OfflineBookingStay;
  details: OfflineBookingDetails;
  requiresPhone: boolean;
  savedVersion: number | undefined;
};

type VoucherToSend = OfflineVoucherStay & { version: number };

function savedVoucherFor({ stay, details, savedVersion }: EmailTarget): VoucherToSend | undefined {
  if (savedVersion === undefined || !details.emails.some((email) => email.trim())) return;
  return { ...offlineVoucherStay(stay), version: savedVersion };
}

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
  onChangeBooking: (stay: OfflineBookingStay, details: OfflineBookingDetails) => void;
  onReviewBooking: (stay: OfflineBookingStay) => void;
};

export function OfflineHotelEmailActions({
  planId, groupType, activeStay, activeDetails, selected, all, saving, sending, onSendingChange, onChangeBooking, onReviewBooking,
}: EmailActionsProps) {
  const [template, setTemplate] = useState<OfflineVoucherTemplate>("hotel-voucher");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [feedback, setFeedback] = useState<{ summary: string; issues: string[] }>();
  const [contactKeys, setContactKeys] = useState<Set<string>>();
  const previewRequest = useRef(0);
  const sendButton = useRef<HTMLButtonElement | null>(null);
  const contactTargets = all.filter(({ stay }) => contactKeys?.has(offlineBookingKey(stay)));
  const contactsToSave = contactTargets.filter((target) => !savedVoucherFor(target));

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

  const deliver = async (stays: VoucherToSend[]) => {
    try {
      const { results } = await offlineHotelBookingApi.sendVouchers(planId, groupType, template, stays);
      const stayByKey = new Map(stays.map((stay) => [offlineBookingKey(stay), stay]));
      const sent = results.filter((result) => result.status === "sent").length;
      const demo = results.filter((result) => result.status === "demo").length;
      const issues = results.flatMap((result) => {
        if (!result.message && (result.status === "sent" || result.status === "demo")) return [];
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
    }
  };

  const send = async (targets: EmailTarget[], button: HTMLButtonElement) => {
    if (saving || sending || !targets.length) return;
    setFeedback(undefined);
    const vouchers = targets.flatMap((target) => {
      const saved = savedVoucherFor(target);
      return saved ? [saved] : [];
    });
    if (vouchers.length !== targets.length) {
      sendButton.current = button;
      setContactKeys(new Set(targets.map(({ stay }) => offlineBookingKey(stay))));
      return;
    }
    onSendingChange(true);
    try {
      await deliver(vouchers);
    } finally {
      onSendingChange(false);
    }
  };

  const reviewBookings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (contactsToSave[0]) onReviewBooking(contactsToSave[0].stay);
    setContactKeys(undefined);
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
      <Dialog open={contactKeys !== undefined} onOpenChange={(open) => { if (!open && !sending) setContactKeys(undefined); }}>
        <DialogContent className={styles.voucherValidation} overlayClassName="bg-slate-950/45" hideClose
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            sendButton.current?.focus();
          }}>
          <form className={styles.contactForm} onSubmit={reviewBookings}>
            <DialogTitle>Hotel contacts for vouchers</DialogTitle>
            <DialogDescription>Use Save Booking for each stay below before sending its voucher.</DialogDescription>
            <ul className={styles.validationStays} aria-label="Stays to save">
              {contactsToSave.map((target) => {
                const { stay, details, requiresPhone } = target;
                const key = offlineBookingKey(stay);
                const dates = `${formatDisplayDate(stay.checkIn)} – ${formatDisplayDate(stay.checkOut)}`;
                return <li key={key}>
                  <fieldset disabled={sending}>
                    <legend>{stay.hotelName}</legend>
                    <p className={styles.contactDates}>{dates}</p>
                    <div className={styles.contactFields}>
                      <label className={styles.field}>
                        <span>Hotel email</span>
                        <Input type="email" maxLength={254} value={details.emails[0] ?? ""}
                          onChange={(event) => onChangeBooking(stay, {
                            ...details, emails: [event.target.value, ...details.emails.slice(1)],
                          })} />
                      </label>
                      <label className={styles.field}>
                        <span>Mobile number{requiresPhone ? "" : " (optional)"}</span>
                        <Input type="tel" maxLength={32} value={details.phone}
                          onChange={(event) => onChangeBooking(stay, { ...details, phone: event.target.value })} />
                      </label>
                    </div>
                  </fieldset>
                </li>;
              })}
            </ul>
            <div className={styles.contactFooter}>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={sending}>Back to hotel stays</Button>
              </DialogClose>
              <Button type="submit" className={styles.save}>Review bookings</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
