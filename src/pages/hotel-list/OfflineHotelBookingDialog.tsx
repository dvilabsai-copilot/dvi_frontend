import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { ArrowLeft, BedDouble, CalendarDays, ChevronRight, Loader2, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ItineraryHotelRow, ItineraryHotelSelectionRouteState } from "../itinerary-details/itinerary-details.types";
import { formatDisplayDate } from "./hotelList.utils";
import { OfflineHotelEmailActions } from "./OfflineHotelEmailActions";
import {
  getOfflineBookingStays, offlineBookingContactRequirements, offlineBookingKey, offlineBookingStatusLabels, offlineHotelBookingApi,
  retainExistingBookingRanges,
  type OfflineBookingDetails, type OfflineBookingRoom, type OfflineBookingStatus,
  type OfflineBookingStay, type OfflineHotelBookingDefaults, type SavedOfflineBooking,
} from "./offlineHotelBooking";
import styles from "./OfflineHotelBookingDialog.module.css";

type BookingDialogProps = {
  planId: number;
  groupType: number | null;
  groupLabel?: string;
  rows: ItineraryHotelRow[];
  savedRoutes?: ItineraryHotelSelectionRouteState[];
  destinations?: Record<number, string>;
  roomCount: number;
  groupChanging: boolean;
};

type BookingDrafts = Record<string, { details: OfflineBookingDetails; version: number }>;
const emptyDrafts: BookingDrafts = {};

const statuses = Object.keys(offlineBookingStatusLabels) as OfflineBookingStatus[];
const formatRoomRate = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const roomFields = [
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

function roomCategoryRows(rooms: OfflineBookingRoom[]): number[][] {
  const rows: number[][] = [];
  const datedByCategory = new Map<string, number[][]>();
  rooms.forEach((room, index) => {
    if (!room.nightDate) {
      rows.push([index]);
      return;
    }
    const categoryRows = datedByCategory.get(room.category) ?? [];
    const matching = categoryRows.find(row => row.every(i => rooms[i].nightDate !== room.nightDate));
    if (matching) {
      matching.push(index);
      return;
    }
    const row = [index];
    rows.push(row);
    categoryRows.push(row);
    datedByCategory.set(room.category, categoryRows);
  });
  return rows;
}

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
  planId, groupType, stay, details, savedDetails, onChange, onSave, saving, saveError, onBack, headingRef,
}: {
  planId: number;
  groupType: number;
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
  const roomRateId = useId();
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    offlineHotelBookingApi.roomCategories(planId, groupType, stay, controller.signal)
      .then(categories => {
        if (!controller.signal.aborted) setAvailableCategories(categories);
      })
      .catch(() => {
        // The saved room categories remain selectable if inventory is unavailable.
      });
    return () => controller.abort();
  }, [planId, groupType, stay]);

  const change = (patch: Partial<OfflineBookingDetails>) => onChange({ ...details, ...patch });
  const changeRoom = (indices: number[], patch: Partial<OfflineBookingRoom>) =>
    change({ rooms: details.rooms.map((room, i) => indices.includes(i) ? { ...room, ...patch } : room) });
  const categoryOptions = Array.from(new Set([
    ...availableCategories,
    ...stay.defaults.rooms.map(room => room.category),
    ...details.rooms.map(room => room.category),
  ].filter(Boolean)));
  const categoryRows = roomCategoryRows(details.rooms);
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
                  <span>Room category</span>
                  {roomFields.map(({ key, label }) => <span key={key}>{label}</span>)}
                </div>
                {categoryRows.map((indices, index) => (
                  <div className={styles.roomRow} key={index} role="group" aria-label={`Room category ${index + 1}`}>
                    <Field label="Room category">
                      <select className={styles.select} aria-label="Room category" required
                        value={details.rooms[indices[0]].category}
                        onChange={event => changeRoom(indices, { category: event.target.value })}>
                        <option value="" disabled>Select room category</option>
                        {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </Field>
                    {roomFields.map(field => {
                      const key = field.key;
                      const value = details.rooms[indices[0]][key];
                      const amounts = indices.map(i => details.rooms[i][key]);
                      const varies = amounts.some(amount => !Object.is(amount, value));
                      let rateSummary: string | undefined;
                      if (key === "rate" && varies) {
                        const lowestPaise = Math.round(Math.min(...amounts) * 100);
                        const highestPaise = Math.round(Math.max(...amounts) * 100);
                        rateSummary = formatRoomRate.format(lowestPaise / 100);
                        if (highestPaise - lowestPaise > 1) {
                          rateSummary += ` – ${formatRoomRate.format(highestPaise / 100)}`;
                        }
                      }
                      const inputClass = rateSummary ? styles.rangedRate : "currency" in field ? styles.moneyInput : "";
                      const summaryId = rateSummary ? `${roomRateId}-${index}` : undefined;
                      return (
                        <Field key={key} label={field.label}>
                          <span className={`${styles.roomInput} ${inputClass}`}>
                            {"currency" in field && !rateSummary && <span aria-hidden="true">₹</span>}
                            <Input
                              aria-label={field.label}
                              aria-describedby={summaryId}
                              type="number"
                              min={"min" in field ? field.min : 0}
                              step={field.step}
                              required={!varies}
                              value={varies || Number.isNaN(value) ? "" : value}
                              placeholder={varies && !rateSummary ? "Varies" : undefined}
                              onChange={event => changeRoom(indices, { [key]: event.target.valueAsNumber })}
                            />
                            {rateSummary && <span id={summaryId} className={styles.roomRateRange}>{rateSummary}</span>}
                          </span>
                        </Field>
                      );
                    })}
                    <RemoveButton label={`Remove room category ${index + 1}`}
                      onClick={() => change({ rooms: details.rooms.filter((_, i) => !indices.includes(i)) })} />
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
  planId, groupType, groupLabel, rows, savedRoutes, destinations, roomCount, groupChanging, drafts, setDrafts,
}: BookingDialogProps & { drafts: BookingDrafts; setDrafts: (update: (previous: BookingDrafts) => BookingDrafts) => void }) {
  const [openedStays, setOpenedStays] = useState<OfflineBookingStay[] | null>(null);
  const [bookings, setBookings] = useState<Record<string, SavedOfflineBooking> | null>(null);
  const [defaults, setDefaults] = useState<OfflineHotelBookingDefaults>({ contacts: {}, confirmedBy: "" });
  const [requestedKey, setActiveKey] = useState("");
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
    if (!groupType || !openedStays?.length) return;
    const controller = new AbortController();
    Promise.all([
      offlineHotelBookingApi.list(planId, groupType, controller.signal),
      offlineHotelBookingApi.defaults(planId, groupType, [...new Set(openedStays.map((stay) => stay.hotelKey))], controller.signal),
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
  }, [planId, groupType, openedStays, loadAttempt]);

  const stays = useMemo(() => openedStays && bookings
    ? retainExistingBookingRanges(openedStays, Object.values(bookings))
    : openedStays, [openedStays, bookings]);
  const activeStay = stays?.find(stay => offlineBookingKey(stay) === requestedKey) ?? stays?.[0];
  const activeKey = activeStay ? offlineBookingKey(activeStay) : "";

  const savedDetailsFor = (stay: OfflineBookingStay, key: string) => bookings?.[key]?.details ?? {
    ...stay.defaults,
    confirmedBy: defaults.confirmedBy,
    ...defaults.contacts[stay.hotelKey],
  };
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
      setOpenedStays(null);
      return;
    }

    const next = getOfflineBookingStays(rows, roomCount, savedRoutes, destinations);
    setOpenedStays(next);
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
      setOpenedStays(null);
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
              {groupType && activeStay && activeDetails && (
                <BookingEditor
                  key={activeKey} planId={planId} groupType={groupType} stay={activeStay}
                  details={activeDetails} savedDetails={bookings[activeKey]?.details} headingRef={editorHeading}
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
