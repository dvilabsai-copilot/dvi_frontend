import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteModal } from "@/components/hotspot/DeleteModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calendarEventsAdminService,
  type CalendarEventAdminInput,
  type CalendarEventAdminRow,
} from "@/services/calendarEventsAdminService";

type HolidayFormValues = CalendarEventAdminInput;

const EMPTY_FORM: HolidayFormValues = {
  eventKey: "",
  title: "",
  shortTitle: "",
  eventType: "FESTIVAL",
  eventStartDate: "",
  eventEndDate: "",
  travelWindowStartDate: "",
  travelWindowEndDate: "",
  isPublicHoliday: true,
  travelImpact: "UNSPECIFIED",
  description: "",
  travelAdvisory: "",
  sourceName: "",
  sourceReference: "",
  sortPriority: 100,
  status: 1,
};

function toForm(row?: CalendarEventAdminRow | null): HolidayFormValues {
  if (!row) return { ...EMPTY_FORM };
  return {
    eventKey: row.eventKey,
    title: row.title,
    shortTitle: row.shortTitle || "",
    eventType: row.eventType,
    eventStartDate: row.eventStartDate,
    eventEndDate: row.eventEndDate,
    travelWindowStartDate: row.travelWindowStartDate,
    travelWindowEndDate: row.travelWindowEndDate,
    isPublicHoliday: row.isPublicHoliday,
    travelImpact: row.travelImpact,
    description: row.description || "",
    travelAdvisory: row.travelAdvisory || "",
    sourceName: row.sourceName || "",
    sourceReference: row.sourceReference || "",
    sortPriority: row.sortPriority,
    status: row.status ? 1 : 0,
  };
}

function formatDateRange(start: string, end: string) {
  return start === end ? start : `${start} – ${end}`;
}

function StatusToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      aria-label={value ? "Deactivate holiday" : "Activate holiday"}
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-violet-600" : "bg-slate-300"}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

function HolidayModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: CalendarEventAdminRow | null;
  onClose: () => void;
  onSubmit: (values: HolidayFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<HolidayFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues(toForm(initial));
  }, [open, initial]);

  const set = <K extends keyof HolidayFormValues>(key: K, value: HolidayFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!values.eventKey.trim() || !values.title.trim() || !values.eventStartDate || !values.eventEndDate || !values.travelWindowStartDate || !values.travelWindowEndDate) {
      toast.error("Please fill all required holiday fields");
      return;
    }
    if (values.eventEndDate < values.eventStartDate) {
      toast.error("Event end date must be on or after the event start date");
      return;
    }
    if (values.travelWindowEndDate < values.travelWindowStartDate) {
      toast.error("Travel window end date must be on or after the travel window start date");
      return;
    }
    try {
      setSaving(true);
      await onSubmit({
        ...values,
        eventKey: values.eventKey.trim(),
        title: values.title.trim(),
        shortTitle: values.shortTitle?.trim(),
        description: values.description?.trim(),
        travelAdvisory: values.travelAdvisory?.trim(),
        sourceName: values.sourceName?.trim(),
        sourceReference: values.sourceReference?.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Holiday / Festival" : "Edit Holiday / Festival"}</DialogTitle>
          <DialogDescription>
            New holidays are added to the India national calendar by default.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Event Key *</Label>
            <Input value={values.eventKey} onChange={(e) => set("eventKey", e.target.value)} placeholder="e.g. india-holi-2027" disabled={mode === "edit"} />
            {mode === "edit" && <p className="mt-1 text-xs text-muted-foreground">Event key is kept stable so the holiday is updated instead of duplicated.</p>}
          </div>
          <div className="md:col-span-2"><Label>Title *</Label><Input value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Holi" /></div>
          <div><Label>Short Title</Label><Input value={values.shortTitle} onChange={(e) => set("shortTitle", e.target.value)} placeholder="e.g. Holi" /></div>
          <div><Label>Event Type *</Label><Select value={values.eventType} onValueChange={(value) => set("eventType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PUBLIC_HOLIDAY">Public holiday</SelectItem><SelectItem value="FESTIVAL">Festival</SelectItem><SelectItem value="RELIGIOUS_OBSERVANCE">Religious observance</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select></div>
          <div><Label>Observed Start Date *</Label><Input type="date" value={values.eventStartDate} onChange={(e) => set("eventStartDate", e.target.value)} /></div>
          <div><Label>Observed End Date *</Label><Input type="date" value={values.eventEndDate} onChange={(e) => set("eventEndDate", e.target.value)} /></div>
          <div><Label>Travel Window Start *</Label><Input type="date" value={values.travelWindowStartDate} onChange={(e) => set("travelWindowStartDate", e.target.value)} /></div>
          <div><Label>Travel Window End *</Label><Input type="date" value={values.travelWindowEndDate} onChange={(e) => set("travelWindowEndDate", e.target.value)} /></div>
          <div><Label>Travel Impact</Label><Select value={values.travelImpact} onValueChange={(value) => set("travelImpact", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UNSPECIFIED">Unspecified</SelectItem><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem></SelectContent></Select></div>
          <div><Label>Sort Priority</Label><Input type="number" min={0} value={values.sortPriority} onChange={(e) => set("sortPriority", Math.max(0, Number(e.target.value) || 0))} /></div>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={values.isPublicHoliday} onChange={(e) => set("isPublicHoliday", e.target.checked)} /> Public holiday</label>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={values.status === 1} onChange={(e) => set("status", e.target.checked ? 1 : 0)} /> Active in itinerary calendar</label>
          <div className="md:col-span-2"><Label>Description</Label><textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={values.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Travel Advisory</Label><textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={values.travelAdvisory} onChange={(e) => set("travelAdvisory", e.target.value)} placeholder="Optional message shown when an itinerary overlaps this date" /></div>
          <div><Label>Source Name</Label><Input value={values.sourceName} onChange={(e) => set("sourceName", e.target.value)} placeholder="e.g. Government holiday calendar" /></div>
          <div><Label>Source Reference</Label><Input value={values.sourceReference} onChange={(e) => set("sourceReference", e.target.value)} placeholder="Optional URL or document reference" /></div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-[#ff68b4] to-[#9b5cff]">{saving ? "Saving…" : mode === "create" ? "Create" : "Update"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HolidaysPage() {
  const [rows, setRows] = useState<CalendarEventAdminRow[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<CalendarEventAdminRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      setRows(await calendarEventsAdminService.list());
    } catch (error: any) {
      toast.error(error?.message || "Failed to load holidays");
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((row) => [row.eventKey, row.title, row.shortTitle, row.eventType, row.eventStartDate, row.eventEndDate].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  const openCreate = () => { setModalMode("create"); setEditing(null); setModalOpen(true); };
  const openEdit = (row: CalendarEventAdminRow) => { setModalMode("edit"); setEditing(row); setModalOpen(true); };

  const submit = async (values: HolidayFormValues) => {
    try {
      if (modalMode === "create") {
        await calendarEventsAdminService.create(values);
        toast.success("Holiday created");
      } else if (editing) {
        await calendarEventsAdminService.update(editing.id, values);
        toast.success("Holiday updated");
      }
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save holiday");
      throw error;
    }
  };

  const toggleStatus = async (row: CalendarEventAdminRow, next: boolean) => {
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: next } : item));
    try {
      await calendarEventsAdminService.updateStatus(row.id, next);
      toast.success("Holiday status updated");
    } catch (error: any) {
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: row.status } : item));
      toast.error(error?.message || "Failed to update holiday status");
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await calendarEventsAdminService.remove(deleteId);
      toast.success("Holiday deleted");
      setDeleteId(null);
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete holiday");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-primary">Holidays & Festivals</h1><p className="text-sm text-muted-foreground">Manage dates shown in the Create Itinerary calendar.</p></div><Button onClick={openCreate} className="bg-gradient-to-r from-[#ff68b4] to-[#9b5cff]">+ Add Holiday</Button></div>
      <div className="space-y-4 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm"><span>Show</span><Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select><span>entries</span></div><div className="flex items-center gap-2 text-sm"><Label htmlFor="holiday-search">Search:</Label><Input id="holiday-search" className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>S.NO</TableHead><TableHead>ACTION</TableHead><TableHead>TITLE</TableHead><TableHead>OBSERVED DATES</TableHead><TableHead>TRAVEL WINDOW</TableHead><TableHead>TYPE</TableHead><TableHead>IMPACT</TableHead><TableHead>STATUS</TableHead></TableRow></TableHeader><TableBody>{paginated.map((row, index) => <TableRow key={row.id}><TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell><TableCell><div className="flex gap-1"><Button size="sm" variant="ghost" aria-label={`Edit ${row.title}`} onClick={() => openEdit(row)}><Pencil className="h-4 w-4 text-violet-600" /></Button><Button size="sm" variant="ghost" aria-label={`Delete ${row.title}`} onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></TableCell><TableCell><div className="font-medium text-slate-700">{row.title}</div><div className="text-xs text-muted-foreground">{row.eventKey}</div></TableCell><TableCell>{formatDateRange(row.eventStartDate, row.eventEndDate)}</TableCell><TableCell>{formatDateRange(row.travelWindowStartDate, row.travelWindowEndDate)}</TableCell><TableCell>{row.eventType}</TableCell><TableCell>{row.travelImpact}</TableCell><TableCell><StatusToggle value={row.status} onChange={(next) => void toggleStatus(row, next)} /></TableCell></TableRow>)}{paginated.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-slate-500">No holidays found</TableCell></TableRow>}</TableBody></Table></div>
        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries</span><div className="flex gap-1"><Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</Button><Button size="sm" variant="default">{currentPage}</Button><Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</Button></div></div>
      </div>
      <HolidayModal open={modalOpen} mode={modalMode} initial={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSubmit={submit} />
      <DeleteModal open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={() => void remove()} />
    </div>
  );
}
