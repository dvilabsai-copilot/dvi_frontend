/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: src/pages/hotspots/HotspotForm.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { hotspotService, HotspotFormData } from "@/services/hotspotService";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*                             Time-picker helpers                             */
/* -------------------------------------------------------------------------- */


type OpeningSlot = { start: string; end: string }; // "hh:mm AM" (12-hr)
type OpeningDay = {
  is24Hours?: boolean;
  closed24Hours?: boolean;
  timeSlots: OpeningSlot[];
};

type SpecialOpeningDate = {
  id: number;
  date: string;
  isClosed: boolean;
  start: string;
  end: string;
  note: string;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function normalizeDurationHHmm(value: string): string {
  const trimmed = String(value || "").trim();
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed);
  if (!match) return "01:00";
  return `${String(Math.max(0, Math.min(23, Number(match[1])))).padStart(2, "0")}:${String(Math.max(0, Math.min(59, Number(match[2])))).padStart(2, "0")}`;
}



import { HotspotFormView } from "./HotspotFormView";
import { TimePickerField } from "./HotspotTimePickerField";
export default function HotspotForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState<Partial<HotspotFormData>>({
    name: "",
    type: null,
    priority: 0,
    description: "",
    landmark: "",
    address: "",
    adultCost: 0,
    childCost: 0,
    infantCost: 0,
    foreignAdultCost: 0,
    foreignChildCost: 0,
    foreignInfantCost: 0,
    rating: 0,
    duration: "01:00",
    latitude: "",
    longitude: "",
    videoUrl: "",
    locations: [],
    toLocations: [],
    galleryImages: [],
    parkingCharges: {},
    openingHours: DAYS.reduce(
      (acc, d) => ({ ...acc, [d]: { is24Hours: false, closed24Hours: false, timeSlots: [] } }),
      {} as Record<string, OpeningDay>
    ),
  });

  const [options, setOptions] = useState<{
    types: string[];
    locations: string[];
    vehicleTypes: Array<{ id: number; name: string }>;
  }>({ types: [], locations: [], vehicleTypes: [] });

  const [loading, setLoading] = useState(false);
  const [hotspotTypeInput, setHotspotTypeInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
const [locationOpen, setLocationOpen] = useState(false);

const [toLocationInput, setToLocationInput] = useState("");
const [toLocationOpen, setToLocationOpen] = useState(false);
const [pendingGalleryFiles, setPendingGalleryFiles] = useState<File[]>([]);
const galleryInputRef = useRef<HTMLInputElement | null>(null);

const [specialOpeningDates, setSpecialOpeningDates] = useState<SpecialOpeningDate[]>([]);
const [showSpecialDateForm, setShowSpecialDateForm] = useState(false);
const [specialDateForm, setSpecialDateForm] = useState({
  date: "",
  isClosed: false,
  start: "",
  end: "",
  note: "",
});

const specialOpeningDatesStorageKey = `hotspot_special_opening_dates_${id || "new"}`;

useEffect(() => {
  const savedSpecialDates = localStorage.getItem(specialOpeningDatesStorageKey);

  if (!savedSpecialDates) {
    return;
  }

  try {
    const parsedSpecialDates = JSON.parse(savedSpecialDates);

    if (Array.isArray(parsedSpecialDates)) {
      setSpecialOpeningDates(parsedSpecialDates);
    }
  } catch {
    setSpecialOpeningDates([]);
  }
}, [specialOpeningDatesStorageKey]);

useEffect(() => {
  localStorage.setItem(specialOpeningDatesStorageKey, JSON.stringify(specialOpeningDates));
}, [specialOpeningDates, specialOpeningDatesStorageKey]);

useEffect(() => {
  loadOptions();
}, []);


  useEffect(() => {
    if (isEdit && id) loadEdit(id);
  }, [id, isEdit]);

  async function loadOptions() {
    try {
      const j = await hotspotService.getFormOptions();
      setOptions({
        types: j.hotspotTypes || [],
        locations: j.locations || [],
        vehicleTypes: j.vehicleTypes || [],
      });
    } catch {
      toast.error("Failed to load options");
    }
  }

  async function loadEdit(hotspotId: string) {
    try {
      setLoading(true);
      const j = await hotspotService.getHotspotForm(hotspotId);
      const p = j.payload;
      setForm({
        id: p.id,
        name: p.hotspot_name,
        type: p.hotspot_type,
        priority: p.hotspot_priority ?? 0,
        description: p.hotspot_description ?? "",
        landmark: p.hotspot_landmark ?? "",
        address: p.hotspot_address ?? "",
        adultCost: Number(p.hotspot_adult_entry_cost ?? 0),
        childCost: Number(p.hotspot_child_entry_cost ?? 0),
        infantCost: Number(p.hotspot_infant_entry_cost ?? 0),
        foreignAdultCost: Number(p.hotspot_foreign_adult_entry_cost ?? 0),
        foreignChildCost: Number(p.hotspot_foreign_child_entry_cost ?? 0),
        foreignInfantCost: Number(p.hotspot_foreign_infant_entry_cost ?? 0),
        rating: Number(p.hotspot_rating ?? 0),
        duration: normalizeDurationHHmm(p.hotspot_duration ?? "01:00"),
        latitude: p.hotspot_latitude ?? "",
        longitude: p.hotspot_longitude ?? "",
        videoUrl: p.hotspot_video_url ?? "",
        locations: p.hotspot_location_list ?? [],
        toLocations: p.hotspot_to_location_list ?? [],
        galleryImages: (p.gallery || []).map(
          (g) => `${hotspotService.fileBase()}/uploads/hotspot_gallery/${g.name}`
        ),
        parkingCharges: Object.fromEntries(
          (p.parkingCharges || []).map((pc) => [String(pc.vehicleTypeId), Number(pc.charge)])
        ),
        openingHours: Object.fromEntries(
          Object.entries(p.operatingHours || {}).map(([k, v]: any) => [
            k,
            {
              is24Hours: !!v.open24hrs,
              closed24Hours: !!v.closed24hrs,
              timeSlots: (v.slots || []).map((s: any) => ({ start: s.start, end: s.end })),
            } as OpeningDay,
          ])
        ),
      });
      setHotspotTypeInput(p.hotspot_type ?? "");
      setPendingGalleryFiles([]);
    } catch {
      toast.error("Failed to load hotspot");
    } finally {
      setLoading(false);
    }
  }

  async function onUploadFiles(files: FileList | null) {
    if (!files || !files.length) return;
    if (!form.id) {
      const selected = Array.from(files);
      setPendingGalleryFiles((prev) => [...prev, ...selected]);
      setForm((prev) => ({
        ...prev,
        galleryImages: [
          ...(prev.galleryImages || []),
          ...selected.map((f) => URL.createObjectURL(f)),
        ],
      }));
      toast.message("Images queued. They will upload after hotspot is saved.");
      return;
    }
    try {
      const uploads = await Promise.all(
        Array.from(files).map((f) => hotspotService.uploadGallery(form.id!, f))
      );
      setForm((prev) => ({
        ...prev,
        galleryImages: [
          ...(prev.galleryImages || []),
          // support both { url } and { name } shapes
          ...uploads.map((u: any) =>
            u?.url
              ? u.url
              : `${hotspotService.fileBase()}/uploads/hotspot_gallery/${u.name}`
          ),
        ],
      }));
    } catch {
      toast.error("Failed to upload images");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.locations || form.locations.length === 0) {
      toast.error("Hotspot Location is required");
      return;
    }
    try {
      setLoading(true);

      const saved = await hotspotService.saveHotspot(form as any);

      const hotspotIdForUpload = Number(form.id ?? saved.id);
      if (pendingGalleryFiles.length > 0 && hotspotIdForUpload > 0) {
        await Promise.all(
          pendingGalleryFiles.map((f) => hotspotService.uploadGallery(hotspotIdForUpload, f))
        );
      }

      toast.success("Hotspot saved successfully");
      navigate("/hotspots", {
        state: {
          prefillSearch: String(form.name || "").trim(),
          createdId: hotspotIdForUpload,
        },
      });
    } catch {
      toast.error("Failed to save hotspot");
    } finally {
      setLoading(false);
    }
  }

  const vehNamesById = useMemo(
    () => Object.fromEntries(options.vehicleTypes.map((v) => [String(v.id), v.name])),
    [options]
  );

  const locationOptionsFiltered = useMemo(() => {
  const selected = new Set((form.locations || []).map((x) => x.toLowerCase()));
  const query = locationInput.trim().toLowerCase();
  return options.locations
    .filter((loc) => !selected.has(loc.toLowerCase()))
    .filter((loc) => (!query ? true : loc.toLowerCase().includes(query)))
    .slice(0, 12);
}, [options.locations, form.locations, locationInput]);

const toLocationOptionsFiltered = useMemo(() => {
  const selected = new Set((form.toLocations || []).map((x) => x.toLowerCase()));
  const query = toLocationInput.trim().toLowerCase();
  return options.locations
    .filter((loc) => !selected.has(loc.toLowerCase()))
    .filter((loc) => (!query ? true : loc.toLowerCase().includes(query)))
    .slice(0, 12);
}, [options.locations, form.toLocations, toLocationInput]);

function addLocation(raw: string) {
  const v = raw.trim();
  if (!v) return;
  setForm((prev) => {
    const next = prev.locations || [];
    if (next.some((x) => x.toLowerCase() === v.toLowerCase())) {
      return prev;
    }
    return { ...prev, locations: [...next, v] };
  });
  setLocationInput("");
  setLocationOpen(false);
}

function removeLocation(v: string) {
  setForm((prev) => ({
    ...prev,
    locations: (prev.locations || []).filter((x) => x !== v),
  }));
}

function addToLocation(raw: string) {
  const v = raw.trim();
  if (!v) return;
  setForm((prev) => {
    const next = prev.toLocations || [];
    if (next.some((x) => x.toLowerCase() === v.toLowerCase())) {
      return prev;
    }
    return { ...prev, toLocations: [...next, v] };
  });
  setToLocationInput("");
  setToLocationOpen(false);
}

function removeToLocation(v: string) {
  setForm((prev) => ({
    ...prev,
    toLocations: (prev.toLocations || []).filter((x) => x !== v),
  }));
}

function formatSpecialDateForDisplay(value: string) {
  if (!value) return "";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function handleSaveSpecialDate() {
  if (!specialDateForm.date.trim()) {
    toast.error("Please select special date");
    return;
  }

  if (!specialDateForm.isClosed && (!specialDateForm.start || !specialDateForm.end)) {
    toast.error("Please select start and end time");
    return;
  }

  const alreadyExists = specialOpeningDates.some(
    (item) => item.date === specialDateForm.date
  );

  if (alreadyExists) {
    toast.error("Special timing already added for this date");
    return;
  }

  setSpecialOpeningDates((prev) => [
    ...prev,
    {
      id: Date.now(),
      date: specialDateForm.date,
      isClosed: specialDateForm.isClosed,
      start: specialDateForm.isClosed ? "" : specialDateForm.start,
      end: specialDateForm.isClosed ? "" : specialDateForm.end,
      note: specialDateForm.note.trim(),
    },
  ]);

  setSpecialDateForm({
    date: "",
    isClosed: false,
    start: "",
    end: "",
    note: "",
  });

  setShowSpecialDateForm(false);
  toast.success("Special date timing added successfully");
}

function handleCancelSpecialDate() {
  setSpecialDateForm({
    date: "",
    isClosed: false,
    start: "",
    end: "",
    note: "",
  });

  setShowSpecialDateForm(false);
}

function handleDeleteSpecialDate(id: number) {
  setSpecialOpeningDates((prev) => prev.filter((item) => item.id !== id));
  toast.success("Special date timing removed successfully");
}



  const hotspotFormViewContext = {
    navigate, isEdit, form, setForm, options, loading, hotspotTypeInput, setHotspotTypeInput,
    locationInput, setLocationInput, locationOpen, setLocationOpen, toLocationInput,
    setToLocationInput, toLocationOpen, setToLocationOpen, pendingGalleryFiles, galleryInputRef,
    onUploadFiles, vehNamesById, locationOptionsFiltered, toLocationOptionsFiltered,
    addLocation, removeLocation, addToLocation, removeToLocation, normalizeDurationHHmm,
    DAYS, TimePickerField, specialOpeningDates, formatSpecialDateForDisplay,
    handleDeleteSpecialDate, showSpecialDateForm, setShowSpecialDateForm, specialDateForm,
    setSpecialDateForm, handleSaveSpecialDate, handleCancelSpecialDate, handleSubmit,
  };
  return <HotspotFormView context={hotspotFormViewContext} />;
}
