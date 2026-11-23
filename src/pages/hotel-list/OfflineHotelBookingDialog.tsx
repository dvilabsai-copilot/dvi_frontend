import { useEffect, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { ArrowLeft, BedDouble, CalendarDays, ChevronRight, Loader2, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ItineraryHotelRow } from "../itinerary-details/itinerary-details.types";
import { formatDisplayDate } from "./hotelList.utils";
import { OfflineHotelEmailActions } from "./OfflineHotelEmailActions";
import {
  getOfflineBookingStays, offlineBookingContactRequirements, offlineBookingKey, offlineBookingStatusLabels, offlineHotelBookingApi,
  type OfflineBookingDetails, type OfflineBookingRoom, type OfflineBookingStatus,
  type OfflineBookingStay, type OfflineHotelBookingDefaults, type SavedOfflineBooking,
} from "./offlineHotelBooking";
import styles from "./OfflineHotelBookingDialog.module.css";

type BookingDialogProps = {
  planId: number;
  groupType: number | null;
  groupLabel?: string;
  rows: ItineraryHotelRow[];
  roomCount: number;
  groupChanging: boolean;
};

type BookingDrafts = Record<string, { details: OfflineBookingDetails; version: number }>;
const emptyDrafts: BookingDrafts = {};

const statuses = Object.keys(offlineBookingStatusLabels) as OfflineBookingStatus[];
const roomFields = [
  { key: "category", label: "Room category" },
  { key: "quantity", label: "Room qty", step: 1, min: 1 },
  { key: "rate", label: "Rate / room / night", step: 0.01, currency: true },
  { key: "extraBeds", label: "Extra bed qty", step: 1 },
  { key: "extraBedRate", label: "Extra bed price", step: 0.01, currency: true },
  { key: "childrenWithoutBed", label: "Child no bed qty", step: 1 },
  { key: "childWithoutBedRate", label: "Child no bed price", step: 0.01, currency: true },
] as const;

const emptyRoom: OfflineBookingRoom = {
  category: "", quantity: 1, rate: 0, extraBeds: 0, extraBedRate: 0,
  childrenWithoutBed: 0, childWithoutBedRate: 0,
};

const formatRange = (stay: OfflineBookingStay) =>
  `${formatDisplayDate(stay.checkIn)} – ${formatDisplayDate(stay.checkOut)}`;

function BookingStatus({ status }: { status: OfflineBookingStatus }) {
  return <span className={styles.status} data-status={status}>{offlineBookingStatusLabels[status]}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className={styles.remove} aria-label={label} onClick={onClick}>
      <Trash2 aria-hidden="true" />
    </Button>
  );
}

function BookingEditor({
  stay, details, savedDetails, onChange, onSave, saving, saveError, onBack, headingRef,
}: {
  stay: OfflineBookingStay;
  details: OfflineBookingDetails;
  savedDetails?: OfflineBookingDetails;
  onChange: (next: OfflineBookingDetails) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  saveError: string;
  onBack: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const change = (patch: Partial<OfflineBookingDetails>) => onChange({ ...details, ...patch });
  const emails = details.emails.length ? details.emails : [""];
  const requiredContact = offlineBookingContactRequirements(details.status, savedDetails);

  return (
    <form className={styles.editor} onSubmit={onSave} aria-label={`Booking details for ${stay.hotelName}`}>
      <div className={styles.editorHeading}>
        <Button type="button" variant="ghost" size="sm" className={styles.back} onClick={onBack} disabled={saving}>
          <ArrowLeft aria-hidden="true" /> Hotel stays
        </Button>
        <div className={styles.stayHeading}>
          <span className={styles.hotelIcon}><BedDouble aria-hidden="true" /></span>
          <div className="min-w-0">
            <h3 tabIndex={-1} ref={headingRef}>{stay.hotelName}</h3>
            <div className={styles.meta}>
              {stay.destination && <span><MapPin aria-hidden="true" />{stay.destination}</span>}
              <span><CalendarDays aria-hidden="true" />{formatRange(stay)}</span>
            </div>
          </div>
          <BookingStatus status={details.status} />
        </div>
      </div>

      <div className={styles.editorScroll}>
        {details.hotelResponse && <section className="px-4 pt-3 text-sm text-slate-700" aria-label="Hotel voucher response">
          <h4 className="font-semibold">Hotel voucher response</h4>
          <p>{offlineBookingStatusLabels[details.hotelResponse.status]} · {details.hotelResponse.verifiedBy}</p>
          {details.hotelResponse.reservationNumber && <p>Reservation {details.hotelResponse.reservationNumber}</p>}
          <p>{details.hotelResponse.email} · {details.hotelResponse.phone}</p>
          {details.hotelResponse.remarks && <p className="whitespace-pre-wrap break-words">{details.hotelResponse.remarks}</p>}
        </section>}
        <fieldset disabled={saving} className={styles.fields}>
          <div className={styles.contacts}>
            <Field label="Confirmed by">
              <Input value={details.confirmedBy} required={requiredContact.name} maxLength={250}
                onChange={(event) => change({ confirmedBy: event.target.value })} />
            </Field>
            <div className={styles.emailList}>
              {emails.map((email, index) => (
                <div className={styles.inputAction} key={index}>
                  <Field label={index === 0 ? "Email ID" : `Email ID ${index + 1}`}>
                    <Input type="email" value={email} required={requiredContact.email && index === 0} maxLength={254}
                      onChange={(event) => change({ emails: emails.map((item, i) => i === index ? event.target.value : item) })} />
                  </Field>
                  {emails.length > 1 && <RemoveButton label={`Remove email ${index + 1}`}
                    onClick={() => change({ emails: emails.filter((_, i) => i !== index) })} />}
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" className={styles.add}
                disabled={emails.length >= 20} onClick={() => change({ emails: [...emails, ""] })}>
                <Plus aria-hidden="true" /> Add Email ID
              </Button>
            </div>
            <Field label="Mobile number">
              <Input type="tel" value={details.phone} required={requiredContact.phone} maxLength={32}
                onChange={(event) => change({ phone: event.target.value })} />
            </Field>
            <Field label="Status">
              <select className={styles.select} aria-label="Status" value={details.status}
                onChange={(event) => change({ status: event.target.value as OfflineBookingStatus })}>
                {statuses.map((status) => <option key={status} value={status}>{offlineBookingStatusLabels[status]}</option>)}
              </select>
            </Field>
          </div>

          <section aria-label="Room category details" className={styles.section}>
            <h4>Room Category Details</h4>
            {details.rooms.length > 0 ? (
              <div className={styles.gridTable}>
                <div className={`${styles.roomRow} ${styles.tableHeading}`} aria-hidden="true">
                  {roomFields.map(({ key, label }) => <span key={key}>{label}</span>)}
                </div>
                {details.rooms.map((room, index) => (
                  <div className={styles.roomRow} key={index} role="group" aria-label={`Room category ${index + 1}`}>
                    {roomFields.map((field) => (
                      <Field key={field.key} label={field.label}>
                        <span className={`${styles.roomInput} ${"currency" in field ? styles.moneyInput : ""}`}>
                          {"currency" in field && <span aria-hidden="true">₹</span>}
                          <Input
                            aria-label={field.label}
                            type={"step" in field ? "number" : "text"}
                            min={"min" in field ? field.min : 0}
                            step={"step" in field ? field.step : undefined}
                            required
                            maxLength={field.key === "category" ? 250 : undefined}
                            value={Number.isNaN(room[field.key]) ? "" : room[field.key]}
                            onChange={(event) => {
                              const value = "step" in field ? event.target.valueAsNumber : event.target.value;
                              change({ rooms: details.rooms.map((item, i) => i === index ? { ...item, [field.key]: value } : item) });
                            }}
                          />
                        </span>
                      </Field>
                    ))}
                    <RemoveButton label={`Remove room category ${index + 1}`}
                      onClick={() => change({ rooms: details.rooms.filter((_, i) => i !== index) })} />
                  </div>
                ))}
              </div>
            ) : <p className={styles.empty}>No room categories entered.</p>}
            <Button type="button" variant="secondary" size="sm" className={styles.add}
              disabled={details.rooms.length >= 100} onClick={() => change({ rooms: [...details.rooms, { ...emptyRoom }] })}>
              <Plus aria-hidden="true" /> Add Room Category
            </Button>
          </section>

          <section aria-label="Cancellation policy" className={styles.section}>
            <h4>Cancellation Policy</h4>
            {details.cancellationPolicies.length > 0 ? (
              <div className={styles.gridTable}>
                <div className={`${styles.policyRow} ${styles.tableHeading}`} aria-hidden="true">
                  <span>Before date</span><span>Cancellation %</span>
                </div>
                {details.cancellationPolicies.map((policy, index) => (
                  <div className={styles.policyRow} key={index} role="group" aria-label={`Cancellation policy ${index + 1}`}>
                    <Field label="Before date">
                      <Input type="date" value={policy.beforeDate} required onChange={(event) => change({
                        cancellationPolicies: details.cancellationPolicies.map((item, i) =>
                          i === index ? { ...item, beforeDate: event.target.value } : item),
                      })} />
                    </Field>
                    <Field label="Cancellation %">
                      <Input type="number" min={0} max={100} step={0.01} required
                        value={Number.isNaN(policy.percentage) ? "" : policy.percentage}
                        onChange={(event) => change({
                          cancellationPolicies: details.cancellationPolicies.map((item, i) =>
                            i === index ? { ...item, percentage: event.target.valueAsNumber } : item),
                        })} />
                    </Field>
                    <RemoveButton label={`Remove cancellation policy ${index + 1}`}
                      onClick={() => change({ cancellationPolicies: details.cancellationPolicies.filter((_, i) => i !== index) })} />
                  </div>
                ))}
              </div>
            ) : <p className={styles.empty}>No cancellation policy entered.</p>}
            <Button type="button" variant="secondary" size="sm" className={styles.add}
              disabled={details.cancellationPolicies.length >= 100}
              onClick={() => change({ cancellationPolicies: [...details.cancellationPolicies, { beforeDate: "", percentage: 0 }] })}>
              <Plus aria-hidden="true" /> Add Policy Row
            </Button>
          </section>
        </fieldset>
      </div>

      <div className={styles.footer}>
        {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
        <Button type="submit" disabled={saving} className={`${styles.save} ml-auto`}>
          {saving ? <><Loader2 aria-hidden="true" className="motion-safe:animate-spin" /> Saving…</> : "Save Booking"}
        </Button>
      </div>
    </form>
  );
}

export function OfflineHotelBookingDialog(props: BookingDialogProps) {
  const [draftsByGroup, setDraftsByGroup] = useState<Record<number, BookingDrafts>>({});
  const groupKey = props.groupType ?? 0;
  return <GroupBookingDialog {...props} key={groupKey} drafts={draftsByGroup[groupKey] ?? emptyDrafts}
    setDrafts={(update) => setDraftsByGroup((previous) => ({
      ...previous,
      [groupKey]: update(previous[groupKey] ?? emptyDrafts),
    }))}
  />;
}

function GroupBookingDialog({
  planId, groupType, groupLabel, rows, roomCount, groupChanging, drafts, setDrafts,
}: BookingDialogProps & { drafts: BookingDrafts; setDrafts: (update: (previous: BookingDrafts) => BookingDrafts) => void }) {
  const [stays, setStays] = useState<OfflineBookingStay[] | null>(null);
  const [bookings, setBookings] = useState<Record<string, SavedOfflineBooking> | null>(null);
  const [defaults, setDefaults] = useState<OfflineHotelBookingDefaults>({ contacts: {}, confirmedBy: "" });
  const [activeKey, setActiveKey] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [checkedStayKeys, setCheckedStayKeys] = useState<Set<string>>(() => new Set());
  const [saveError, setSaveError] = useState("");
  const dialogTitle = useRef<HTMLHeadingElement>(null);
  const activeStayButton = useRef<HTMLButtonElement>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!groupType || !stays?.length) return;
    const controller = new AbortController();
    Promise.all([
      offlineHotelBookingApi.list(planId, groupType, controller.signal),
      offlineHotelBookingApi.defaults(planId, groupType, [...new Set(stays.map((stay) => stay.hotelKey))], controller.signal),
    ])
      .then(([saved, bookingDefaults]) => {
        if (!controller.signal.aborted) {
          setDefaults(bookingDefaults);
          setBookings(Object.fromEntries(saved.map((entry) => [offlineBookingKey(entry), entry])));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Unable to load saved bookings.");
      });
    return () => controller.abort();
  }, [planId, groupType, stays, loadAttempt]);

  const savedDetailsFor = (stay: OfflineBookingStay, key: string) => bookings?.[key]?.details ?? {
    ...stay.defaults,
    confirmedBy: defaults.confirmedBy,
    ...defaults.contacts[stay.hotelKey],
  };
  const activeStay = stays?.find((stay) => offlineBookingKey(stay) === activeKey);
  const activeSavedDetails = activeStay && savedDetailsFor(activeStay, activeKey);
  const activeDetails = drafts[activeKey]?.details ?? activeSavedDetails;
  const statusFor = (stay: OfflineBookingStay) => bookings?.[offlineBookingKey(stay)]?.details.status ?? stay.defaults.status;
  const emailTargets = stays?.map((stay) => {
    const key = offlineBookingKey(stay);
    const details = drafts[key]?.details ?? savedDetailsFor(stay, key);
    return {
      stay,
      details,
      requiresPhone: offlineBookingContactRequirements(details.status, bookings?.[key]?.details).phone,
      savedVersion: bookings?.[key]?.version,
      hasDraft: Boolean(drafts[key]),
    };
  }) ?? [];
  const emailSelected = emailTargets.filter(({ stay }) => checkedStayKeys.has(offlineBookingKey(stay)));

  const changeOpen = (open: boolean) => {
    if (saving || sending) return;
    if (!open) {
      if (Object.keys(drafts).length) {
        if (!window.confirm("Discard unsaved booking changes?")) return;
        setDrafts(() => emptyDrafts);
      }
      setStays(null);
      return;
    }

    const next = getOfflineBookingStays(rows, roomCount);
    setStays(next);
    setBookings(null);
    setDefaults({ contacts: {}, confirmedBy: "" });
    setCheckedStayKeys(new Set());
    setActiveKey(next.length ? offlineBookingKey(next[0]) : "");
    setSearch("");
    setStatusFilter("all");
    setMobileDetail(false);
    setLoadError("");
    setSaveError("");
  };

  const openStay = (stay: OfflineBookingStay, focusEditor = false) => {
    setActiveKey(offlineBookingKey(stay));
    setMobileDetail(true);
    setSaveError("");
    if (focusEditor || window.matchMedia?.("(max-width: 767px)").matches) {
      requestAnimationFrame(() => editorHeading.current?.focus());
    }
  };

  const editBooking = (stay: OfflineBookingStay, details: OfflineBookingDetails) => {
    const key = offlineBookingKey(stay);
    setDrafts((previous) => ({
      ...previous,
      [key]: { details, version: previous[key]?.version ?? bookings?.[key]?.version ?? 0 },
    }));
    setSaveError("");
  };

  const persistBooking = (group: number, stay: OfflineBookingStay, details: OfflineBookingDetails, version: number) => {
    const { routeId, hotelKey, checkIn, checkOut } = stay;
    return offlineHotelBookingApi.save(planId, group, {
      routeId, hotelKey, checkIn, checkOut, version,
      details: { ...details, emails: details.emails.map((email) => email.trim()).filter(Boolean) },
    });
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!groupType || !activeStay || !activeDetails || !bookings || saving || sending) return;
    setSaving(true);
    setSaveError("");
    try {
      await persistBooking(groupType, activeStay, activeDetails, drafts[activeKey]?.version ?? bookings[activeKey]?.version ?? 0);
      setDrafts((previous) => {
        const updated = { ...previous };
        delete updated[activeKey];
        return updated;
      });
      setStays(null);
      toast.success("Booking details saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save this booking.");
    } finally {
      setSaving(false);
    }
  };

  const searchTerm = search.trim().toLowerCase();
  const visibleStays = stays?.filter((stay) =>
    (statusFilter === "all" || statusFor(stay) === statusFilter) &&
    [stay.hotelName, stay.destination, stay.providerLabel, formatRange(stay)]
      .some((value) => String(value || "").toLowerCase().includes(searchTerm)),
  ) ?? [];

  return (
    <Dialog open={stays !== null} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="border-violet-200 text-xs font-semibold text-violet-800 hover:bg-violet-50 hover:text-violet-900"
          disabled={!planId || !groupType || groupChanging}>
          Offline Booking
        </Button>
      </DialogTrigger>
      {stays && (
        <DialogContent
          className={styles.dialog}
          overlayClassName="bg-slate-950/45"
          hideClose={saving || sending}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            dialogTitle.current?.focus();
          }}
        >
          <header className={styles.header}>
            <div className={styles.title}>
              <span className={styles.hotelIcon}><BedDouble aria-hidden="true" /></span>
              <div>
                <DialogTitle tabIndex={-1} ref={dialogTitle}>Hotel Stays</DialogTitle>
                <DialogDescription>{groupLabel || `Recommended #${groupType}`} · {stays.length} {stays.length === 1 ? "stay" : "stays"}</DialogDescription>
              </div>
            </div>
            {stays.length > 0 && <div className={styles.filters}>
              <div className={styles.search}>
                <Search aria-hidden="true" />
                <Input type="search" aria-label="Search hotel" placeholder="Search Hotel" value={search}
                  onChange={(event) => setSearch(event.target.value)} />
              </div>
              <select className={styles.select} aria-label="Filter by status" value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All Statuses</option>
                {statuses.map((status) => <option key={status} value={status}>{offlineBookingStatusLabels[status]}</option>)}
              </select>
            </div>}
          </header>

          {groupType && bookings && stays.length > 0 && (
            <OfflineHotelEmailActions
              planId={planId} groupType={groupType} activeStay={activeStay} activeDetails={activeSavedDetails}
              selected={emailSelected} all={emailTargets} saving={saving} sending={sending}
              onSendingChange={setSending}
              onSaveVoucherBooking={async (stay, details, version) => {
                const saved = await persistBooking(groupType, stay, details, version);
                setBookings((previous) => ({ ...previous, [offlineBookingKey(saved)]: saved }));
                return saved;
              }}
              onReviewBooking={(stay) => {
                setSearch("");
                setStatusFilter("all");
                openStay(stay, true);
              }}
            />
          )}

          {stays.length === 0 ? (
            <p className={styles.notice}>There are no hotel stays in this recommendation.</p>
          ) : loadError ? (
            <div className={styles.notice}>
              <p role="alert" className={styles.error}>{loadError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => {
                setLoadError("");
                setLoadAttempt((attempt) => attempt + 1);
              }}>Retry</Button>
            </div>
          ) : !bookings ? (
            <p className={styles.notice} role="status"><Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" /> Loading hotel stays…</p>
          ) : (
            <div className={styles.workspace} data-detail={mobileDetail}>
              <nav className={styles.sidebar} aria-label="Hotel stays in this recommendation">
                <div className={styles.sidebarHeader}>
                  <h3>Hotel Stays <span>{visibleStays.length}</span></h3>
                  <Button variant="ghost" size="sm" type="button"
                    disabled={sending}
                    onClick={() => setCheckedStayKeys(emailSelected.length === stays.length
                      ? new Set() : new Set(stays.map(offlineBookingKey)))}>
                    {emailSelected.length === stays.length ? "Clear selection" : "Select all"}
                  </Button>
                </div>
                <ul>
                  {visibleStays.map((stay) => {
                    const key = offlineBookingKey(stay);
                    return <li key={key} className={styles.selectableStay}>
                      <input type="checkbox" className={styles.stayCheckbox}
                        aria-label={`Select ${stay.hotelName} for email, ${formatRange(stay)}`}
                        checked={checkedStayKeys.has(key)}
                        disabled={sending}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setCheckedStayKeys((previous) => {
                            const next = new Set(previous);
                            if (checked) next.add(key);
                            else next.delete(key);
                            return next;
                          });
                        }}
                      />
                      <button type="button" className={styles.stayButton} aria-current={key === activeKey ? "true" : undefined}
                        ref={key === activeKey ? activeStayButton : undefined}
                        disabled={saving} onClick={() => openStay(stay)}>
                        <span className={styles.stayText}>
                          <strong>{stay.hotelName}</strong>
                          <span>{formatRange(stay)}</span>
                          {(stay.destination || stay.providerLabel) && <span>{[stay.destination, stay.providerLabel].filter(Boolean).join(" · ")}</span>}
                        </span>
                        <span className={styles.stayAction}>
                          <BookingStatus status={statusFor(stay)} />
                          <span>{drafts[key] ? "Unsaved" : key === activeKey ? "Open" : "Edit"} <ChevronRight aria-hidden="true" /></span>
                        </span>
                      </button>
                    </li>;
                  })}
                </ul>
                {!visibleStays.length && <p className={styles.empty}>No stays match your filters.</p>}
              </nav>
              {activeStay && activeDetails && (
                <BookingEditor
                  key={activeKey} stay={activeStay} details={activeDetails} savedDetails={bookings[activeKey]?.details} headingRef={editorHeading}
                  onChange={(details) => editBooking(activeStay, details)}
                  onSave={save} saving={saving || sending} saveError={saveError}
                  onBack={() => {
                    setMobileDetail(false);
                    requestAnimationFrame(() => activeStayButton.current?.focus());
                  }}
                />
              )}
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
