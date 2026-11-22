import { useRef, useState, type FormEvent } from "react";
import { Eye, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "./hotelList.utils";
import {
  offlineBookingKey, offlineHotelBookingApi, offlineVoucherStay,
  type OfflineBookingDetails, type OfflineBookingStay, type OfflineVoucherStay, type OfflineVoucherTemplate,
  type SavedOfflineBooking,
} from "./offlineHotelBooking";
import styles from "./OfflineHotelBookingDialog.module.css";

type EmailTarget = {
  stay: OfflineBookingStay;
  details: OfflineBookingDetails;
  savedVersion: number | undefined;
};

type ContactFields = { email: string; phone: string };
type VoucherToSend = OfflineVoucherStay & { version: number };

const hasSavedRecipient = (target: EmailTarget): target is EmailTarget & { savedVersion: number } =>
  target.savedVersion !== undefined && target.details.emails.some((email) => email.trim());

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
  onSaveBooking: (stay: OfflineBookingStay, details: OfflineBookingDetails) => Promise<SavedOfflineBooking>;
};

export function OfflineHotelEmailActions({
  planId, groupType, activeStay, activeDetails, selected, all, saving, sending, onSendingChange, onSaveBooking,
}: EmailActionsProps) {
  const [template, setTemplate] = useState<OfflineVoucherTemplate>("hotel-voucher");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [feedback, setFeedback] = useState<{ summary: string; issues: string[] }>();
  const [contactKeys, setContactKeys] = useState<Set<string>>();
  const [contactEdits, setContactEdits] = useState<Record<string, ContactFields>>({});
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const previewRequest = useRef(0);
  const sendButton = useRef<HTMLButtonElement | null>(null);
  const contactTargets = all.filter(({ stay }) => contactKeys?.has(offlineBookingKey(stay)));
  const contactsToSave = contactTargets.filter((target) => !hasSavedRecipient(target));

  const contactFor = ({ stay, details }: EmailTarget): ContactFields => contactEdits[offlineBookingKey(stay)] ?? {
    email: details.emails.find((email) => email.trim()) ?? "",
    phone: details.phone,
  };

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
    }
  };

  const send = async (targets: EmailTarget[], button: HTMLButtonElement) => {
    if (saving || sending || !targets.length) return;
    setFeedback(undefined);
    if (!targets.every(hasSavedRecipient)) {
      sendButton.current = button;
      setContactEdits({});
      setContactErrors({});
      setContactKeys(new Set(targets.map(({ stay }) => offlineBookingKey(stay))));
      return;
    }
    onSendingChange(true);
    try {
      await deliver(targets.map(({ stay, savedVersion }) => ({ ...offlineVoucherStay(stay), version: savedVersion })));
    } finally {
      onSendingChange(false);
    }
  };

  const saveAndSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || sending || !contactTargets.length) return;
    onSendingChange(true);
    setContactErrors({});
    const vouchers: VoucherToSend[] = [];
    const errors: Record<string, string> = {};
    try {
      for (const target of contactTargets) {
        const { stay, details } = target;
        const voucher = offlineVoucherStay(stay);
        if (hasSavedRecipient(target)) {
          vouchers.push({ ...voucher, version: target.savedVersion });
          continue;
        }
        const { email, phone } = contactFor(target);
        try {
          const saved = await onSaveBooking(stay, {
            ...details,
            emails: [email.trim(), ...details.emails.filter((address) => address.trim()).slice(1)],
            phone: phone.trim(),
          });
          vouchers.push({ ...voucher, version: saved.version });
        } catch (error) {
          errors[offlineBookingKey(stay)] = error instanceof Error ? error.message : "Unable to save the hotel contact.";
        }
      }
      if (Object.keys(errors).length) {
        setContactErrors(errors);
        return;
      }
      await deliver(vouchers);
      setContactKeys(undefined);
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
      <Dialog open={contactKeys !== undefined} onOpenChange={(open) => { if (!open && !sending) setContactKeys(undefined); }}>
        <DialogContent className={styles.voucherValidation} overlayClassName="bg-slate-950/45" hideClose
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            sendButton.current?.focus();
          }}>
          <form className={styles.contactForm} onSubmit={(event) => void saveAndSend(event)}>
            <DialogTitle>Hotel contacts for vouchers</DialogTitle>
            <DialogDescription>Complete the hotel contacts below to save these stays and send the vouchers.</DialogDescription>
            <ul className={styles.validationStays} aria-label="Stays to save">
              {contactsToSave.map((target) => {
                const { stay, details } = target;
                const key = offlineBookingKey(stay);
                const contact = contactFor(target);
                const phoneRequired = details.status === "confirmed";
                const change = (patch: Partial<ContactFields>) =>
                  setContactEdits((previous) => ({ ...previous, [key]: { ...(previous[key] ?? contact), ...patch } }));
                const dates = `${formatDisplayDate(stay.checkIn)} – ${formatDisplayDate(stay.checkOut)}`;
                return <li key={key}>
                  <fieldset disabled={sending}>
                    <legend>{stay.hotelName}</legend>
                    <p className={styles.contactDates}>{dates}</p>
                    <div className={styles.contactFields}>
                      <label className={styles.field}>
                        <span>Hotel email</span>
                        <Input type="email" maxLength={254} required value={contact.email}
                          onChange={(event) => change({ email: event.target.value })} />
                      </label>
                      <label className={styles.field}>
                        <span>Mobile number{phoneRequired ? "" : " (optional)"}</span>
                        <Input type="tel" maxLength={32} required={phoneRequired} value={contact.phone}
                          onChange={(event) => change({ phone: event.target.value })} />
                      </label>
                    </div>
                    {contactErrors[key] && <p role="alert" className={styles.error}>{contactErrors[key]}</p>}
                  </fieldset>
                </li>;
              })}
            </ul>
            <div className={styles.contactFooter}>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={sending}>Back to hotel stays</Button>
              </DialogClose>
              <Button type="submit" className={styles.save} disabled={sending}>
                {sending ? <><Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> Working…</>
                  : `Save & Send (${contactTargets.length})`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
