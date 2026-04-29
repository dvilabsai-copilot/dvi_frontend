// FILE: src/pages/activity/ActivityForm.tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  Clock3,
  Check,
  ChevronsUpDown,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  Star,
  Copy,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivitiesAPI, HotspotOption, PreviewPayload } from "@/services/activities";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  TimePickerPopover,
  formatTime24As12,
  time12To24,
  time24To12,
} from "@/components/itinerary/TimePickerPopover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/* ----------------------------- local form types ----------------------------- */

type FormTimeSlot = { startTime: string; endTime: string };

type FormSpecialDay = {
  date: string;
  timeSlots: FormTimeSlot[];
};

type FormPricing = {
  startDate: string;
  endDate: string;
  adult: number;
  children: number;
  infant: number;
  foreignAdult: number;
  foreignChildren: number;
  foreignInfant: number;
};

type FormReview = {
  id: string;
  rating: number;
  description: string;
  createdOn: string;
};

type ActivityFormState = {
  title: string;
  hotspotId?: number | null;
  hotspot: string;
  hotspotPlace: string;
  maxAllowedPersonCount: number;
  duration: string; // HH:MM:SS
  description: string;
  images: string[]; // currently unused; we use imagePreviews
  defaultAvailableTimes: FormTimeSlot[];
  isSpecialDay: boolean;
  specialDays: FormSpecialDay[];
  pricing: FormPricing;
  reviews: FormReview[];
  status: boolean;
};

const TABS = [
  { id: 1, name: "Activity Basic Details" },
  { id: 2, name: "Price Book" },
  { id: 3, name: "FeedBack & Review" },
  { id: 4, name: "Preview" },
];

const durationHours = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);

const durationMinutes = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);

const durationSeconds = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);

function splitDuration(value?: string) {
  const [hh = "00", mm = "30", ss = "00"] = String(value || "00:30:00").split(":");

  return {
    hh: hh.padStart(2, "0").slice(0, 2),
    mm: mm.padStart(2, "0").slice(0, 2),
    ss: ss.padStart(2, "0").slice(0, 2),
  };
}

function buildDuration(hh: string, mm: string, ss: string) {
  return `${hh}:${mm}:${ss}`;
}

const getEmptyActivity = (): ActivityFormState => ({
  title: "",
  hotspotId: undefined,
  hotspot: "",
  hotspotPlace: "",
  maxAllowedPersonCount: 0,
  duration: "00:30:00",
  description: "",
  images: [],
  defaultAvailableTimes: [{ startTime: "", endTime: "" }],
  isSpecialDay: false,
  specialDays: [],
  pricing: {
    startDate: "",
    endDate: "",
    adult: 0,
    children: 0,
    infant: 0,
    foreignAdult: 0,
    foreignChildren: 0,
    foreignInfant: 0,
  },
  reviews: [],
  status: true,
});

function toReviewRowsCSV(rows: FormReview[]) {
  const headers = ["S.NO", "RATING", "DESCRIPTION", "CREATED ON"];
  const data = rows.map((r, idx) => [
    String(idx + 1),
    String(r.rating ?? ""),
    r.description ?? "",
    r.createdOn ?? "",
  ]);

  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.map(esc).join(","), ...data.map((row) => row.map(esc).join(","))].join("\n");
}

function toReviewRowsHTML(rows: FormReview[]) {
  const head = `<tr><th>S.NO</th><th>RATING</th><th>DESCRIPTION</th><th>CREATED ON</th></tr>`;
  const body = rows
    .map(
      (r, idx) =>
        `<tr><td>${idx + 1}</td><td>${r.rating ?? ""}</td><td>${r.description ?? ""}</td><td>${
          r.createdOn ?? ""
        }</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset=\"utf-8\" /><title>Activity Reviews</title></head><body><table border=\"1\">${head}${body}</table></body></html>`;
}

function downloadFile(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function normalizeTime24(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "09:00";

  if (/\b(AM|PM)\b/i.test(raw)) {
    const [timePart = "09:00", periodPart = "AM"] = raw.toUpperCase().split(" ");
    return time12To24(timePart, periodPart === "PM" ? "PM" : "AM");
  }

  const [h = "09", m = "00"] = raw.split(":");
  const hh = Math.max(0, Math.min(23, Number(h || 9)));
  const mm = Math.max(0, Math.min(59, Number(m || 0)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function parseYmdToDate(value?: string): Date | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const [y, m, d] = raw.split("-").map((n) => Number(n));
  if (!y || !m || !d) return undefined;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function formatYmdLabel(value?: string): string {
  const dt = parseYmdToDate(value);
  return dt ? format(dt, "dd/MM/yyyy") : "DD/MM/YYYY";
}

type ActivityDatePickerFieldProps = {
  value: string;
  onChange: (valueYmd: string) => void;
  disabled?: boolean;
};

function ActivityDatePickerField({ value, onChange, disabled = false }: ActivityDatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseYmdToDate(value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`h-9 w-full justify-start border-[#e5d7f6] bg-white font-normal text-left ${
            !selectedDate ? "text-muted-foreground" : ""
          }`}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatYmdLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(nextDate) => {
            if (!nextDate) return;
            onChange(format(nextDate, "yyyy-MM-dd"));
            setIsOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

type ActivityTimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value24: string) => void;
  disabled?: boolean;
};

function ActivityTimePickerField({ label, value, onChange, disabled = false }: ActivityTimePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalized = normalizeTime24(value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start border-[#e5d7f6] bg-white font-normal text-left"
          disabled={disabled}
        >
          <Clock3 className="mr-2 h-4 w-4 text-[#6b6680]" />
          {formatTime24As12(normalized)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none" align="start">
        <TimePickerPopover
          value={formatTime24As12(normalized)}
          label={label}
          onSave={(newValue12) => {
            const fallback = time24To12(normalized);
            const [nextTime = fallback.time, nextPeriod = fallback.period] = String(newValue12 || "").split(" ");
            onChange(time12To24(nextTime, (nextPeriod as "AM" | "PM") || fallback.period));
            setIsOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Build absolute URL to backend for non-JSON FormData upload.
 * If your app is proxied, relative path is fine. Change if needed. */


function buildApiUrl(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildActivityImageUrl(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) {
    return raw;
  }

  const base = ActivitiesAPI.imageBase().replace(/\/$/, "");
  const path = raw.replace(/^\/+/, "");

  if (path.startsWith("uploads/")) {
    const fileBase = base.replace(/\/uploads\/activity_gallery$/, "");
    return `${fileBase}/${path}`;
  }

  const fileName = path.split("/").pop() || path;
  return `${base}/${fileName}`;
}



const ActivityForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const isReadonly = searchParams.get("readonly") === "true";
  const initialTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab === "preview") return 4;
    if (initialTab === "feedback") return 3;
    if (initialTab === "pricebook") return 2;
    return 1;
  });

  const [formData, setFormData] = useState<ActivityFormState>(getEmptyActivity());
  const [loading, setLoading] = useState(false);

  // hotspot dropdown via API
  const [hotspotOptions, setHotspotOptions] = useState<HotspotOption[]>([]);
  const [isHotspotOpen, setIsHotspotOpen] = useState(false);

  // image state (only for client-side preview)
  // Image state: server-loaded images (with id for delete) + pending local files
  const [serverImages, setServerImages] = useState<{ id: number; url: string }[]>([]);
const [imageFiles, setImageFiles] = useState<File[]>([]);
const [imagePreviews, setImagePreviews] = useState<string[]>([]);
const [deleteImageIndex, setDeleteImageIndex] = useState<number | null>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewPageSize, setReviewPageSize] = useState(10);
  const [reviewPage, setReviewPage] = useState(1);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Price book dates (DD/MM/YYYY like Create Itinerary)
  const [priceStartDate, setPriceStartDate] = useState<string>("");
  const [priceEndDate, setPriceEndDate] = useState<string>("");
  const [isPriceStartOpen, setIsPriceStartOpen] = useState(false);
  const [isPriceEndOpen, setIsPriceEndOpen] = useState(false);
  const [isPriceDatesOpen, setIsPriceDatesOpen] = useState(false);
  const [priceHoveredTo, setPriceHoveredTo] = useState<Date | undefined>(undefined);
  const [priceSelectingEnd, setPriceSelectingEnd] = useState(false);

  /* ------------------------ load hotspots & activity ------------------------ */

  useEffect(() => {
    // hotspots for dropdown
    ActivitiesAPI.hotspots()
      .then((res) => setHotspotOptions(res || []))
      .catch(() => setHotspotOptions([]));
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      loadActivity(id);
    }
  }, [id, isEdit]);

  const loadActivity = async (activityId: string) => {
    setLoading(true);
    try {
      const numericId = Number(activityId);

      const [details, preview] = await Promise.all([
        ActivitiesAPI.details(numericId),
        ActivitiesAPI.preview(numericId).catch(() => null as PreviewPayload | null),
      ]);

      const base = getEmptyActivity();

      // basic
      base.title = details.activity_title ?? "";
      base.hotspotId = details.hotspot_id ?? undefined;
      base.hotspot = details.hotspot?.hotspot_name ?? "";
      base.hotspotPlace = details.hotspot?.hotspot_location ?? "";
      base.maxAllowedPersonCount = Number(details.max_allowed_person_count ?? 0);
      base.duration = details.activity_duration ?? "00:30:00";
      base.description = details.activity_description ?? "";
      base.status = details.status === 1;

      // preview extras (time slots, reviews)
      if (preview) {
        if (preview.defaultSlots && preview.defaultSlots.length > 0) {
          base.defaultAvailableTimes = preview.defaultSlots.map((s) => ({
            startTime: s.start_time,
            endTime: s.end_time,
          }));
        }

        if (preview.specialSlots && preview.specialSlots.length > 0) {
          base.isSpecialDay = true;
          base.specialDays = preview.specialSlots.map((s) => ({
            date: s.special_date,
            timeSlots: [
              {
                startTime: s.start_time,
                endTime: s.end_time,
              },
            ],
          }));
        }

        base.reviews =
          preview.reviews?.map((r) => ({
            id: String(r.activity_review_id),
            rating: Number(r.activity_rating),
            description: r.activity_description ?? "",
            createdOn: r.createdon,
          })) ?? [];
      }

     // Load server images
// Load server images
if (preview?.images?.length) {
  setServerImages(
    preview.images.map((img: any, index: number) => {
      const imageName =
        img.activity_image_gallery_name ||
        img.image ||
        img.image_url ||
        img.url ||
        "";

      const imageUrl = buildActivityImageUrl(imageName);

      console.log("Activity image row:", img);
      console.log("Activity image url:", imageUrl);

      return {
        id: Number(
          img.activity_image_gallery_details_id ||
            img.id ||
            Date.now() + index
        ),
        url: imageUrl,
      };
    })
  );
} else {
  setServerImages([]);
}

      // Load pricebook
      try {
        const pb = await ActivitiesAPI.getPriceBook(numericId);
        if (pb) {
          base.pricing = {
            startDate: pb.start_date ?? "",
            endDate: pb.end_date ?? "",
            adult: pb.indian?.adult_cost ?? 0,
            children: pb.indian?.child_cost ?? 0,
            infant: pb.indian?.infant_cost ?? 0,
            foreignAdult: pb.nonindian?.adult_cost ?? 0,
            foreignChildren: pb.nonindian?.child_cost ?? 0,
            foreignInfant: pb.nonindian?.infant_cost ?? 0,
          };
          // format into DD/MM/YYYY for the picker display
          const fmtDMY = (iso: string) => {
            if (!iso) return "";
            const [y, m, d] = iso.split("-");
            return `${d}/${m}/${y}`;
          };
          setPriceStartDate(fmtDMY(pb.start_date));
          setPriceEndDate(fmtDMY(pb.end_date));
        }
      } catch { /* non-blocking */ }

      setFormData(base);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------- helpers & change ---------------------------- */

  const handleInputChange = (field: keyof ActivityFormState, value: string | number | boolean | FormTimeSlot[] | FormSpecialDay[] | FormPricing | FormReview[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePricingChange = (field: keyof FormPricing, value: number) => {
    setFormData((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value },
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newFiles = Array.from(files);

    if (isEdit && id) {
      // Upload immediately and add to serverImages
      ActivitiesAPI.uploadImages(Number(id), newFiles)
        .then((res) => {
          const base64 = ActivitiesAPI.imageBase();
          const uploaded = (res?.files ?? []).map((name: string, i: number) => ({
            id: res?.ids?.[i] ?? Date.now() + i,
            url: `${base64}/${name}`,
          }));
          setServerImages((prev) => [...prev, ...uploaded]);
          toast.success("Images uploaded");
        })
        .catch(() => toast.error("Image upload failed"));
    } else {
      // Queue for upload on submit
      setImageFiles((prev) => [...prev, ...newFiles]);
      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImagePreviews((prev) => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeServerImage = async (index: number) => {
  const img = serverImages[index];

  if (!img || !id) {
    toast.error("Image delete failed");
    return;
  }

  try {
    await ActivitiesAPI.deleteImage(Number(id), img.id);

    setServerImages((prev) => prev.filter((item) => item.id !== img.id));
    setDeleteImageIndex(null);
    toast.success("Deleted Successfully");
  } catch (error) {
    console.error("Image delete failed:", error);
    toast.error("Failed to delete image");
  }
};
  const addDefaultTime = () => {
    setFormData((prev) => ({
      ...prev,
      defaultAvailableTimes: [
        ...prev.defaultAvailableTimes,
        { startTime: "", endTime: "" },
      ],
    }));
  };

  const updateDefaultTime = (
    index: number,
    field: keyof FormTimeSlot,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      defaultAvailableTimes: prev.defaultAvailableTimes.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  const removeDefaultTime = (index: number) => {
    setFormData((prev) => {
      const next = prev.defaultAvailableTimes.filter((_, i) => i !== index);
      return {
        ...prev,
        defaultAvailableTimes: next.length ? next : [{ startTime: "", endTime: "" }],
      };
    });
  };

  /* ----------------------------- reviews actions ---------------------------- */

  const refreshReviewsFromServer = async (activityId: number) => {
    try {
      const preview = await ActivitiesAPI.preview(activityId);
      const reviews =
        preview.reviews?.map((r) => ({
          id: String(r.activity_review_id),
          rating: Number(r.activity_rating),
          description: r.activity_description ?? "",
          createdOn: r.createdon,
        })) ?? [];
      setFormData((prev) => ({ ...prev, reviews }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh reviews");
    }
  };

  const addSpecialDay = () => {
    setFormData((prev) => ({
      ...prev,
      specialDays: [
        ...prev.specialDays,
        {
          date: "",
          // Keep defaults in state so preview/save matches what UI shows.
          timeSlots: [{ startTime: "09:00", endTime: "09:00" }],
        },
      ],
    }));
  };

  const removeSpecialDay = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specialDays: prev.specialDays.filter((_, i) => i !== index),
    }));
  };

  const updateSpecialDayDate = (index: number, date: string) => {
    setFormData((prev) => ({
      ...prev,
      specialDays: prev.specialDays.map((day, i) =>
        i === index
          ? {
              ...day,
              date,
            }
          : day,
      ),
    }));
  };

  const updateSpecialDayTime = (
    dayIndex: number,
    slotIndex: number,
    field: keyof FormTimeSlot,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      specialDays: prev.specialDays.map((day, i) => {
        if (i !== dayIndex) return day;
        return {
          ...day,
          timeSlots: day.timeSlots.map((slot, sIdx) =>
            sIdx === slotIndex
              ? {
                  ...slot,
                  [field]: value,
                }
              : slot,
          ),
        };
      }),
    }));
  };

  const handleSaveReview = async () => {
    if (!reviewRating || !reviewFeedback) {
      toast.error("Please fill in rating and feedback");
      return;
    }

    if (isEdit && id) {
      const activityId = Number(id);
      if (editingReviewId && !Number.isNaN(Number(editingReviewId))) {
        await ActivitiesAPI.updateReview(activityId, Number(editingReviewId), {
          activity_rating: String(reviewRating),
          activity_description: reviewFeedback,
        });
      } else {
        await ActivitiesAPI.addReview(activityId, {
          activity_rating: String(reviewRating),
          activity_description: reviewFeedback,
        });
      }
      await refreshReviewsFromServer(activityId);
      setReviewRating("");
      setReviewFeedback("");
      setEditingReviewId(null);
      toast.success(editingReviewId ? "Review updated successfully" : "Review added successfully");
    } else {
      if (editingReviewId) {
        setFormData((prev) => ({
          ...prev,
          reviews: prev.reviews.map((r) =>
            r.id === editingReviewId
              ? {
                  ...r,
                  rating: Number(reviewRating),
                  description: reviewFeedback,
                }
              : r,
          ),
        }));
      } else {
        const newReview: FormReview = {
          id: `local-${Date.now()}`,
          rating: Number(reviewRating),
          description: reviewFeedback,
          createdOn: new Date().toLocaleString(),
        };
        setFormData((prev) => ({
          ...prev,
          reviews: [...prev.reviews, newReview],
        }));
      }
      setReviewRating("");
      setReviewFeedback("");
      setEditingReviewId(null);
      toast.success(editingReviewId ? "Review updated" : "Review added");
    }
  };

  const startEditReview = (review: FormReview) => {
    setEditingReviewId(review.id);
    setReviewRating(String(review.rating));
    setReviewFeedback(review.description || "");
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setReviewRating("");
    setReviewFeedback("");
  };

  const handleReviewCopy = async () => {
    if (!filteredReviews.length) return;
    try {
      await navigator.clipboard.writeText(toReviewRowsCSV(filteredReviews));
      toast.success("Copied reviews as CSV");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleReviewCSV = () => {
    if (!filteredReviews.length) return;
    downloadFile("activity-reviews.csv", "text/csv;charset=utf-8;", toReviewRowsCSV(filteredReviews));
  };

  const handleReviewExcel = () => {
    if (!filteredReviews.length) return;
    downloadFile("activity-reviews.xls", "application/vnd.ms-excel", toReviewRowsHTML(filteredReviews));
  };

  const deleteReview = async (reviewId: string) => {
    if (isEdit && id) {
      const activityId = Number(id);
      await ActivitiesAPI.deleteReview(activityId, Number(reviewId));
      await refreshReviewsFromServer(activityId);
    } else {
      setFormData((prev) => ({
        ...prev,
        reviews: prev.reviews.filter((r) => r.id !== reviewId),
      }));
    }
    toast.success("Review deleted");
  };

  /* --------------------------- pricing + submit ---------------------------- */

  // parse DD/MM/YYYY to Date (matches Create Itinerary format)
  const parseDMY = (s: string): Date | null => {
    if (!s) return null;
    const [d, m, y] = s.split("/").map(Number);
    if (!d || !m || !y || y < 2000) return null;
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const formatDMY = (date: Date): string => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const handlePriceDayClick = (day: Date, disabled?: boolean) => {
    if (disabled) return;
    const clicked = formatDMY(day);
    const startObj = parseDMY(priceStartDate);
    if (!startObj || (startObj && parseDMY(priceEndDate))) {
      // fresh selection
      setPriceStartDate(clicked);
      setPriceEndDate("");
      setPriceSelectingEnd(true);
    } else if (priceSelectingEnd) {
      if (day < startObj) {
        setPriceStartDate(clicked);
        setPriceEndDate("");
      } else {
        setPriceEndDate(clicked);
        setPriceSelectingEnd(false);
        setIsPriceDatesOpen(false);
        setPriceHoveredTo(undefined);
      }
    }
  };

  const pricePreviewRange = useMemo(() => {
    const s = parseDMY(priceStartDate);
    const e = parseDMY(priceEndDate);
    if (!s) return undefined;
    if (s && e) return { from: s, to: e };
    if (priceHoveredTo && priceSelectingEnd) {
      return priceHoveredTo >= s ? { from: s, to: priceHoveredTo } : { from: s, to: s };
    }
    return { from: s, to: s };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceStartDate, priceEndDate, priceHoveredTo, priceSelectingEnd]);

  // When both dates selected in edit mode, fetch existing prices from DB
  useEffect(() => {
    if (!isEdit || !id) return;
    if (!parseDMY(priceStartDate) || !parseDMY(priceEndDate)) return;
    ActivitiesAPI.getPriceBook(Number(id))
      .then((pb) => {
        if (!pb) return;
        setFormData((prev) => ({
          ...prev,
          pricing: {
            ...prev.pricing,
            adult: pb.indian?.adult_cost ?? prev.pricing.adult,
            children: pb.indian?.child_cost ?? prev.pricing.children,
            infant: pb.indian?.infant_cost ?? prev.pricing.infant,
            foreignAdult: pb.nonindian?.adult_cost ?? prev.pricing.foreignAdult,
            foreignChildren: pb.nonindian?.child_cost ?? prev.pricing.foreignChildren,
            foreignInfant: pb.nonindian?.infant_cost ?? prev.pricing.foreignInfant,
          },
        }));
      })
      .catch(() => {/* non-blocking */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceStartDate, priceEndDate]);

  const handleUpdatePricing = async () => {
    const start = parseDMY(priceStartDate);
    const end = parseDMY(priceEndDate);
    if (!start || !end) { toast.error("Select both start and end dates"); return; }
    if (start > end) { toast.error("Start date must be before end date"); return; }

    const startDate = format(start, "yyyy-MM-dd");
    const endDate = format(end, "yyyy-MM-dd");

    // Capture current pricing values before state update
    const currentPricing = formData.pricing;

    // Update local state so the table rebuilds
    setFormData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        startDate,
        endDate,
      },
    }));

    // If editing an existing activity, persist to DB immediately
    if (isEdit && id) {
      try {
        await ActivitiesAPI.savePriceBook(Number(id), {
          hotspot_id: formData.hotspotId ?? 0,
          start_date: startDate,
          end_date: endDate,
          indian: {
            adult_cost: currentPricing.adult,
            child_cost: currentPricing.children,
            infant_cost: currentPricing.infant,
          },
          nonindian: {
            adult_cost: currentPricing.foreignAdult,
            child_cost: currentPricing.foreignChildren,
            infant_cost: currentPricing.foreignInfant,
          },
        });
        toast.success("Pricing saved");
      } catch {
        toast.error("Failed to save pricing");
      }
    } else {
      toast.success("Pricing dates updated");
    }
  };

  const safeDate = (s: string | undefined | null): Date | null => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  // Only build dates from the COMMITTED values (set via Update button), not live text inputs
  const getPriceBookDates = () => {
    const start = safeDate(formData.pricing.startDate);
    const end = safeDate(formData.pricing.endDate);

    if (!start || !end) return [];
    if (start > end) return [];

    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const priceBookDates = getPriceBookDates();

  const priceBookRows = [
    { nationality: "Indian", priceType: "Adults", amount: formData.pricing.adult },
    { nationality: "Indian", priceType: "Children", amount: formData.pricing.children },
    { nationality: "Indian", priceType: "Infants", amount: formData.pricing.infant },
    { nationality: "Non Indian", priceType: "Adults", amount: formData.pricing.foreignAdult },
    { nationality: "Non Indian", priceType: "Children", amount: formData.pricing.foreignChildren },
    { nationality: "Non Indian", priceType: "Infants", amount: formData.pricing.foreignInfant },
  ];
  const hotspotLabel = hotspotOptions.find((o) => o.id === formData.hotspotId)?.label?.split(" — ")[0] || formData.title || "Activity";

  useEffect(() => {
    const startObj = parseDMY(priceStartDate);
    const endObj = parseDMY(priceEndDate);
    if (!startObj || !endObj) return;

    setFormData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        startDate: format(startObj, "yyyy-MM-dd"),
        endDate: format(endObj, "yyyy-MM-dd"),
      },
    }));
  }, [priceStartDate, priceEndDate]);

  /** Upload selected files to Multer endpoint, then persist filenames into gallery table.
   * Expects backend route: POST /activities/:id/images/upload (Multer, files field = 'files')
   * Returns server JSON: { files: Array<{ filename: string }> }
   */
// put near other helpers in ActivityForm.tsx

async function uploadImagesAndSaveGallery(activityId: number, files: File[]) {
  if (!files || files.length === 0) return;

  const fd = new FormData();
  // NOTE: the backend interceptor expects field name "images"
  files.forEach((f) => fd.append("images", f));
  fd.append("createdby", "0");

  // IMPORTANT: go through api() so it prefixes API_BASE_URL + /api/v1
  // Resulting URL: http://localhost:4006/api/v1/activities/:id/images/upload
  console.log("[upload] to", `/activities/${activityId}/images/upload`);
  await api(`/activities/${activityId}/images/upload`, {
    method: "POST",
    body: fd, // do NOT set Content-Type manually
  });
}

/** Persist locally-added reviews (added during create flow) after the activity is created */
const persistPendingReviews = async (activityId: number) => {
  if (!formData.reviews?.length) return;
  // Only send those without a numeric server id (heuristic: non-numeric ids are local)
  const pending = formData.reviews.filter((r) => Number.isNaN(Number(r.id)));
  if (!pending.length) return;

  await Promise.all(
    pending.map((r) =>
      ActivitiesAPI.addReview(activityId, {
        activity_rating: String(r.rating ?? ""),
        activity_description: r.description ?? "",
        createdby: 1,
      })
    )
  );

  // Refresh from server to get canonical ids/timestamps
  await refreshReviewsFromServer(activityId);
};

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // ----------------- BASIC -----------------
      const basicPayload = {
        activity_title: formData.title,
        hotspot_id: formData.hotspotId ?? 0,
        max_allowed_person_count: formData.maxAllowedPersonCount,
        activity_duration: formData.duration,
        activity_description: formData.description,
      };

      let activityIdNum: number;

      if (isEdit && id) {
        activityIdNum = Number(id);
        await ActivitiesAPI.update(activityIdNum, basicPayload);
      } else {
        const created = await ActivitiesAPI.create(basicPayload);
        activityIdNum = created.activity_id;
      }

      // ----------------- IMAGES -----------------
      // Upload actual files to Multer, then save filenames to DB
      if (imageFiles.length > 0) {
        await uploadImagesAndSaveGallery(activityIdNum, imageFiles);
      }

      // ----------------- TIME SLOTS -----------------
      await ActivitiesAPI.saveTimeSlots(activityIdNum, {
        defaultSlots: formData.defaultAvailableTimes
          .filter((t) => t.startTime && t.endTime)
          .map((t) => ({
            start_time: t.startTime,
            end_time: t.endTime,
          })),
        specialEnabled: formData.isSpecialDay,
        specialSlots: formData.isSpecialDay
          ? formData.specialDays.flatMap((day) =>
              day.timeSlots
                .filter((t) => t.startTime && t.endTime)
                .map((t) => ({
                  date: day.date,
                  start_time: t.startTime,
                  end_time: t.endTime,
                }))
            )
          : [],
      });

      // ----------------- PRICEBOOK -----------------
      if (formData.pricing.startDate && formData.pricing.endDate) {
        await ActivitiesAPI.savePriceBook(activityIdNum, {
          hotspot_id: formData.hotspotId ?? 0,
          start_date: formData.pricing.startDate,
          end_date: formData.pricing.endDate,
          indian: {
            adult_cost: formData.pricing.adult,
            child_cost: formData.pricing.children,
            infant_cost: formData.pricing.infant,
          },
          nonindian: {
            adult_cost: formData.pricing.foreignAdult,
            child_cost: formData.pricing.foreignChildren,
            infant_cost: formData.pricing.foreignInfant,
          },
        });
      }

      // ----------------- REVIEWS (create-flow pending ones) -----------------
      if (!isEdit && formData.reviews.length) {
        try {
          await persistPendingReviews(activityIdNum);
        } catch (e) {
          console.warn("Reviews save failed (non-blocking):", e);
        }
      }

      toast.success(isEdit ? "Activity updated successfully" : "Activity saved successfully");
      navigate("/activities");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save activity";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------- misc helpers ------------------------------ */

  const goToNextTab = async () => {
    // When leaving Tab 1 in edit mode, persist time slots (incl. special days) immediately
    if (activeTab === 1 && isEdit && id) {
      try {
        await ActivitiesAPI.saveTimeSlots(Number(id), {
          defaultSlots: formData.defaultAvailableTimes
            .filter((t) => t.startTime && t.endTime)
            .map((t) => ({ start_time: t.startTime, end_time: t.endTime })),
          specialEnabled: formData.isSpecialDay,
          specialSlots: formData.isSpecialDay
            ? formData.specialDays.flatMap((day) =>
                day.timeSlots
                  .filter((t) => t.startTime && t.endTime)
                  .map((t) => ({ date: day.date, start_time: t.startTime, end_time: t.endTime }))
              )
            : [],
        });
      } catch {
        // non-blocking — proceed to next tab even if save fails
      }
    }
    if (activeTab < 4) setActiveTab(activeTab + 1);
  };

  const goToPrevTab = () => {
    if (activeTab > 1) setActiveTab(activeTab - 1);
  };

  const filteredReviews = formData.reviews.filter((r) =>
    r.description.toLowerCase().includes(reviewSearch.toLowerCase())
  );

  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / reviewPageSize));

  useEffect(() => {
    setReviewPage(1);
  }, [reviewSearch, reviewPageSize]);

  useEffect(() => {
    if (reviewPage > totalReviewPages) {
      setReviewPage(totalReviewPages);
    }
  }, [reviewPage, totalReviewPages]);

  const paginatedReviews = filteredReviews.slice(
    (reviewPage - 1) * reviewPageSize,
    reviewPage * reviewPageSize
  );

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < rating ? "fill-primary text-primary" : "text-gray-300"
        )}
      />
    ));
  };

  if (loading) {
    return (
      <div className="p-6 bg-pink-50/30 min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  /* ----------------------------------- UI ----------------------------------- */

  return (
    <div className="p-6 bg-pink-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEdit ? `Edit Activity » ${formData.title}` : "Add Activity"}
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="text-primary hover:underline">
            Dashboard
          </Link>
          <span>&gt;</span>
          <Link to="/activities" className="text-primary hover:underline">
            List of Activity
          </Link>
          <span>&gt;</span>
          <span className="text-primary">
            {isEdit ? "Edit Activity" : "Add Activity"}
          </span>
        </div>
      </div>

      {/* Card with Tabs */}
      <Card className="shadow-sm">
        {/* Tab Header */}
        <div className="border-b px-6 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map((tab, index) => (
              <div key={tab.id} className="flex items-center">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-t-lg transition",
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  disabled={isReadonly && tab.id !== 4}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium",
                      activeTab === tab.id
                        ? "bg-white text-primary"
                        : "bg-gray-300 text-gray-600"
                    )}
                  >
                    {tab.id}
                  </span>
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
                {index < TABS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        <CardContent className="p-6">
          {/* Tab 1: Basic Details */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>
                    Activity Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter activity title"
                    disabled={isReadonly}
                  />
                </div>
                <div>
                  <Label>
                    Hotspot Places <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={isHotspotOpen} onOpenChange={setIsHotspotOpen}>
                    <PopoverTrigger asChild>


                      <Button
  type="button"
  variant="outline"
  role="combobox"
  aria-expanded={isHotspotOpen}
  className="w-full justify-between overflow-hidden"
  disabled={isReadonly}
>
  <span className="truncate">
    {formData.hotspotId
      ? hotspotOptions.find((opt) => opt.id === formData.hotspotId)?.label || "Select hotspot"
      : "Select hotspot"}
  </span>
  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
</Button>


                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search hotspot..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No hotspot found.</CommandEmpty>
                          <CommandGroup>
                            {hotspotOptions.map((opt) => (
                              <CommandItem
                                key={opt.id}
                                value={`${opt.label} ${opt.id}`}
                                onSelect={() => {
                                  const idNum = opt.id;
                                  handleInputChange("hotspotId", idNum);
                                  const separator = opt.label.includes("—") ? "—" : ",";
                                  const [name, ...placeParts] = opt.label.split(separator);
                                  handleInputChange("hotspot", name?.trim() || "");
                                  handleInputChange("hotspotPlace", placeParts.join(separator).trim() || "");
                                  setIsHotspotOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.hotspotId === opt.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {opt.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>
                    Max Allowed Person Count{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxAllowedPersonCount}
                    onChange={(e) =>
                      handleInputChange(
                        "maxAllowedPersonCount",
                        Number(e.target.value)
                      )
                    }
                    disabled={isReadonly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>
                    Duration <span className="text-red-500">*</span>
                  </Label>

                  {(() => {
  const duration = splitDuration(formData.duration);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center rounded-md border border-[#e5d7f6] bg-white">
      <Select
        value={duration.hh}
        onValueChange={(hh) =>
          handleInputChange("duration", buildDuration(hh, duration.mm, duration.ss))
        }
        disabled={isReadonly}
      >
        <SelectTrigger className="border-0 shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {durationHours.map((hh) => (
            <SelectItem key={hh} value={hh}>
              {hh}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-center text-lg">:</span>

      <Select
        value={duration.mm}
        onValueChange={(mm) =>
          handleInputChange("duration", buildDuration(duration.hh, mm, duration.ss))
        }
        disabled={isReadonly}
      >
        <SelectTrigger className="border-0 shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {durationMinutes.map((mm) => (
            <SelectItem key={mm} value={mm}>
              {mm}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-center text-lg">:</span>

      <Select
        value={duration.ss}
        onValueChange={(ss) =>
          handleInputChange("duration", buildDuration(duration.hh, duration.mm, ss))
        }
        disabled={isReadonly}
      >
        <SelectTrigger className="border-0 shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {durationSeconds.map((ss) => (
            <SelectItem key={ss} value={ss}>
              {ss}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
})()}

                </div>
                <div>
                  <Label>
                    Upload Images <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isReadonly}
                  />
                </div>
              </div>

              {/* Image Previews */}
              {/* Server images (already uploaded) */}
              {serverImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {serverImages.map((img, index) => (
                    <div key={img.id} className="relative">
                      <img
                          src={img.url}
                          alt={`Image ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                          onError={() => {
                            console.log("Broken activity image URL:", img.url);
                          }}
                        />
                      {!isReadonly && (
                        <button
                          onClick={() => setDeleteImageIndex(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Pending local previews (create-mode only) */}
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                      {!isReadonly && (
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={4}
                  disabled={isReadonly}
                />
              </div>

              {/* Default Available Time */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-primary mb-4">
                  Default Available Time
                </h3>
                {formData.defaultAvailableTimes.map((time, index) => (
                  <div key={index} className="flex items-end gap-4 mb-4 flex-wrap">
                    <div>
                      <Label>
                        Start Time<span className="text-red-500">*</span>
                      </Label>
                      <ActivityTimePickerField
                        label="Start Time"
                        value={time.startTime}
                        onChange={(value24) => updateDefaultTime(index, "startTime", value24)}
                        disabled={isReadonly}
                      />
                    </div>
                    <div>
                      <Label>
                        End Time<span className="text-red-500">*</span>
                      </Label>
                      <ActivityTimePickerField
                        label="End Time"
                        value={time.endTime}
                        onChange={(value24) => updateDefaultTime(index, "endTime", value24)}
                        disabled={isReadonly}
                      />
                    </div>
                    {!isReadonly && (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-600 border-red-300"
                        onClick={() => removeDefaultTime(index)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                ))}
                {!isReadonly && (
                  <Button
                    variant="outline"
                    onClick={addDefaultTime}
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    +Add Default Time
                  </Button>
                )}
              </div>

              {/* Special Available Time */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-primary mb-4">
                  Special Available Time
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.isSpecialDay}
                      onCheckedChange={(checked) =>
                        handleInputChange("isSpecialDay", !!checked)
                      }
                      disabled={isReadonly}
                    />
                    <Label>Special Day </Label>
                  </div>
                  {formData.isSpecialDay && !isReadonly && (
                    <Button
                      variant="outline"
                      className="text-primary border-primary hover:bg-primary/10"
                      onClick={addSpecialDay}
                    >
                      + Add Days
                    </Button>
                  )}
                </div>

                {formData.isSpecialDay && (
                  <div className="mt-4 space-y-3">
                    {formData.specialDays.length === 0 ? (
                      <p className="text-sm text-gray-500">No special days added</p>
                    ) : (
                      formData.specialDays.map((day, dayIndex) => (
                        <div key={`${day.date}-${dayIndex}`} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border rounded-md p-3">
                          <div>
                            <Label>Date</Label>
                            <ActivityDatePickerField
                              value={day.date}
                              onChange={(valueYmd) => updateSpecialDayDate(dayIndex, valueYmd)}
                              disabled={isReadonly}
                            />
                          </div>
                          <div>
                            <Label>Start Time</Label>
                            <ActivityTimePickerField
                              label="Special Start"
                              value={day.timeSlots[0]?.startTime || ""}
                              onChange={(value24) => updateSpecialDayTime(dayIndex, 0, "startTime", value24)}
                              disabled={isReadonly}
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <ActivityTimePickerField
                              label="Special End"
                              value={day.timeSlots[0]?.endTime || ""}
                              onChange={(value24) => updateSpecialDayTime(dayIndex, 0, "endTime", value24)}
                              disabled={isReadonly}
                            />
                          </div>
                          {!isReadonly && (
                            <div>
                              <Button variant="outline" className="text-red-600 border-red-300" onClick={() => removeSpecialDay(dayIndex)}>
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/activities")}
                >
                  Back
                </Button>
                {!isReadonly && (
                  <Button onClick={goToNextTab}>Update & Continue</Button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Price Book */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium">Activity Cost Details</h3>
                <div className="flex items-center gap-2">
                  {/* Start Date Picker */}
                  <Popover open={isPriceStartOpen} onOpenChange={setIsPriceStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-[160px] justify-start text-left font-normal ${
                          !priceStartDate ? "text-muted-foreground" : ""
                        }`}
                        disabled={isReadonly}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {priceStartDate || "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="z-50 w-auto p-0 bg-white border border-[#e5d7f6] rounded-xl shadow-xl">
                      <div className="px-4 py-2 border-b border-[#efe7fb] text-sm font-medium text-[#4a4260]">Start Date</div>
                      <Calendar
                        mode="single"
                        selected={parseDMY(priceStartDate) || undefined}
                        onSelect={(day) => {
                          if (!day) return;
                          setPriceStartDate(formatDMY(day));
                          setIsPriceStartOpen(false);
                        }}
                        initialFocus
                        classNames={{ day_today: "" }}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">—</span>
                  {/* End Date Picker */}
                  <Popover open={isPriceEndOpen} onOpenChange={setIsPriceEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-[160px] justify-start text-left font-normal ${
                          !priceEndDate ? "text-muted-foreground" : ""
                        }`}
                        disabled={isReadonly}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {priceEndDate || "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="z-50 w-auto p-0 bg-white border border-[#e5d7f6] rounded-xl shadow-xl">
                      <div className="px-4 py-2 border-b border-[#efe7fb] text-sm font-medium text-[#4a4260]">End Date</div>
                      <Calendar
                        mode="single"
                        selected={parseDMY(priceEndDate) || undefined}
                        onSelect={(day) => {
                          if (!day) return;
                          setPriceEndDate(formatDMY(day));
                          setIsPriceEndOpen(false);
                        }}
                        defaultMonth={parseDMY(priceStartDate) || undefined}
                        disabled={parseDMY(priceStartDate) ? { before: parseDMY(priceStartDate)! } : undefined}
                        initialFocus
                        classNames={{ day_today: "" }}
                      />
                    </PopoverContent>
                  </Popover>
                  {!isReadonly && (
                    <Button onClick={handleUpdatePricing} className="bg-[#8b2fc9] hover:bg-[#7a27b3] text-white">Update</Button>
                  )}
                </div>
              </div>

              {/* Indian Pricing */}
              <div className="grid grid-cols-4 gap-6 items-end">
                <div>
                  <Label className="text-gray-500">Nationality</Label>
                  <p className="text-primary font-medium">Indian</p>
                </div>
                <div>
                  <Label className="text-primary">Adult</Label>
                  <Input
                    type="number"
                    placeholder="Enter Price"
                    value={formData.pricing.adult || ""}
                    onChange={(e) =>
                      handlePricingChange("adult", Number(e.target.value))
                    }
                    disabled={isReadonly}
                  />
                </div>
                <div>
                  <Label className="text-primary">Children</Label>
                  <Input
                    type="number"
                    placeholder="Enter Price"
                    value={formData.pricing.children || ""}
                    onChange={(e) =>
                      handlePricingChange("children", Number(e.target.value))
                    }
                    disabled={isReadonly}
                  />
                </div>
                <div>
                  <Label className="text-primary">Infant</Label>
                  <Input
                    type="number"
                    placeholder="Enter Price"
                    value={formData.pricing.infant || ""}
                    onChange={(e) =>
                      handlePricingChange("infant", Number(e.target.value))
                    }
                    disabled={isReadonly}
                  />
                </div>
              </div>

              {/* Non-Indian Pricing */}
              <div className="grid grid-cols-4 gap-6 items-end">
                <div>
                  <Label className="text-gray-500">Nationality</Label>
                  <p className="text-primary font-medium">Non-Indian</p>
                </div>
                <div>
                  <Label className="text-primary">Foreign Adult</Label>
                  <Input
                    type="number"
                    placeholder="Enter Price"
                    value={formData.pricing.foreignAdult || ""}
                    onChange={(e) =>
                      handlePricingChange(
                        "foreignAdult",
                        Number(e.target.value)
                      )
                    }
                    disabled={isReadonly}
                  />
                </div>
                <div>
                  <Label className="text-primary">Foreign Children</Label>
                  <Input
                    type="number"
                    placeholder="Enter Price"
                    value={formData.pricing.foreignChildren || ""}
                    onChange={(e) =>
                      handlePricingChange(
                        "foreignChildren",
                        Number(e.target.value)
                      )
                    }
                    disabled={isReadonly}
                  />
                </div>
                <div>
                  <Label className="text-primary">Foreign Infant</Label>
                  <Input
                    type="number"
                    placeholder="Enter Price"
                    value={formData.pricing.foreignInfant || ""}
                    onChange={(e) =>
                      handlePricingChange(
                        "foreignInfant",
                        Number(e.target.value)
                      )
                    }
                    disabled={isReadonly}
                  />
                </div>
              </div>

              {priceBookDates.length > 0 && (
                <div className="pt-6 border-t">
                  <div className="overflow-x-auto rounded-xl border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold text-white uppercase bg-[#8b2fc9] whitespace-nowrap">
                            Hotspot
                          </TableHead>
                          <TableHead className="font-bold text-white uppercase bg-[#8b2fc9] whitespace-nowrap">
                            Nationality
                          </TableHead>
                          <TableHead className="font-bold text-white uppercase bg-[#8b2fc9] whitespace-nowrap">
                            Price Type
                          </TableHead>

                          {priceBookDates.map((date) => (
                            <TableHead
                              key={date.toISOString()}
                              className="text-center font-bold text-white uppercase bg-[#8b2fc9] whitespace-nowrap"
                            >
                              {format(date, "EEE").toUpperCase()} - {format(date, "dd MMM, yyyy").toUpperCase()}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {priceBookRows.map((row) => (
                          <TableRow key={`${row.nationality}-${row.priceType}`}>
                            <TableCell>{hotspotLabel}</TableCell>
                            <TableCell>{row.nationality}</TableCell>
                            <TableCell>{row.priceType}</TableCell>

                            {priceBookDates.map((date) => (
                              <TableCell
                                key={`${row.nationality}-${row.priceType}-${date.toISOString()}`}
                                className="text-center"
                              >
                                ₹ {Number(row.amount || 0).toFixed(2)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button variant="secondary" onClick={goToPrevTab}>
                  Back
                </Button>
                {!isReadonly && (
                  <Button onClick={goToNextTab}>Update & Continue</Button>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Feedback & Review */}
          {activeTab === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Add Review Form */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-primary mb-4">
                    Rating
                  </h3>
                  <Select
                    value={reviewRating}
                    onValueChange={setReviewRating}
                    disabled={isReadonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Star</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-2 mb-4">
                    All reviews are from genuine customers
                  </p>
                  <Label>
                    Feedback <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={4}
                    className="mt-2"
                    disabled={isReadonly}
                  />
                  {!isReadonly && (
                    <Button onClick={handleSaveReview} className="mt-4">
                      {editingReviewId ? "Update" : "Save"}
                    </Button>
                  )}
                  {editingReviewId && !isReadonly && (
                    <Button variant="outline" onClick={cancelEditReview} className="mt-4 ml-2">
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Right: Reviews List */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-4">List of Reviews</h3>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Show</span>
                      <Select
                        value={String(reviewPageSize)}
                        onValueChange={(v) => setReviewPageSize(Number(v))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm">entries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Search:</span>
                      <Input
                        value={reviewSearch}
                        onChange={(e) => setReviewSearch(e.target.value)}
                        className="w-32"
                      />
                      <Button variant="outline" size="sm" onClick={handleReviewCopy} disabled={!filteredReviews.length}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600"
                        onClick={handleReviewExcel}
                        disabled={!filteredReviews.length}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleReviewCSV} disabled={!filteredReviews.length}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70px]">S.NO</TableHead>
                        <TableHead className="w-[120px]">RATING</TableHead>
                        <TableHead>DESCRIPTION</TableHead>
                        <TableHead className="w-[220px]">CREATED ON</TableHead>
                        <TableHead className="w-[110px] text-center">ACTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReviews.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-4 text-gray-500"
                          >
                            No data available in table
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedReviews.map((review, index) => (
                          <TableRow key={review.id} className="align-middle">
                            <TableCell>
                              {(reviewPage - 1) * reviewPageSize + index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex">
                                {renderStars(review.rating)}
                              </div>
                            </TableCell>
                            <TableCell className="break-words">{review.description}</TableCell>
                            <TableCell className="whitespace-nowrap">{review.createdOn}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-yellow-600"
                                  onClick={() => startEditReview(review)}
                                  disabled={isReadonly}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600"
                                  onClick={() => deleteReview(review.id)}
                                  disabled={isReadonly}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-500">
                      Showing {filteredReviews.length > 0 ? (reviewPage - 1) * reviewPageSize + 1 : 0} to{" "}
                      {Math.min(reviewPage * reviewPageSize, filteredReviews.length)} of {filteredReviews.length}{" "}
                      entries
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reviewPage <= 1}
                        onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reviewPage >= totalReviewPages}
                        onClick={() => setReviewPage((p) => Math.min(totalReviewPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Buttons */}
              <div className="col-span-full flex items-center justify-between pt-6 border-t">
                <Button variant="secondary" onClick={goToPrevTab}>
                  Back
                </Button>
                {!isReadonly && (
                  <Button onClick={goToNextTab}>Update & Continue</Button>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Preview */}
          {activeTab === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-medium">Preview</h2>

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">
                  Basic Info
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-500">Activity Title</Label>
                    <p className="font-medium">{formData.title || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Hotspot Places</Label>
                    <p className="font-medium">{formData.hotspot || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">
                      Max Allowed Person Count
                    </Label>
                    <p className="font-medium">
                      {formData.maxAllowedPersonCount}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Duration</Label>
                    <p className="font-medium">{formData.duration}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-gray-500">Description</Label>
                  <p className="font-medium">{formData.description || "-"}</p>
                </div>
              </div>

              {/* Images */}
              {(serverImages.length > 0 || imagePreviews.length > 0) && (
                <div>
                  <h3 className="text-lg font-medium text-primary mb-4">
                    Images
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {serverImages.map((img, index) => (
                      <img
                        key={`sv-${img.id}`}
                        src={img.url}
                        alt={`Image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                    {imagePreviews.map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`Preview ${index}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Default Available Time */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">
                  Default Available Time
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-100">
                      <TableHead>S.NO</TableHead>
                      <TableHead>START TIME</TableHead>
                      <TableHead>END TIME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.defaultAvailableTimes.map((time, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{time.startTime ? formatTime24As12(time.startTime) : "-"}</TableCell>
                        <TableCell>{time.endTime ? formatTime24As12(time.endTime) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Special Day */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">
                  Special Day
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-100">
                      <TableHead>S.NO</TableHead>
                      <TableHead>DATE</TableHead>
                      <TableHead>START TIME</TableHead>
                      <TableHead>END TIME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.specialDays.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-gray-500"
                        >
                          No Special Time Found !!!
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.specialDays.map((day, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{formatYmdLabel(day.date)}</TableCell>
                          <TableCell>
                            {day.timeSlots[0]?.startTime ? formatTime24As12(day.timeSlots[0].startTime) : "-"}
                          </TableCell>
                          <TableCell>
                            {day.timeSlots[0]?.endTime ? formatTime24As12(day.timeSlots[0].endTime) : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Reviews */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">Review</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-100">
                      <TableHead>S.NO</TableHead>
                      <TableHead>RATING</TableHead>
                      <TableHead>DESCRIPTION</TableHead>
                      <TableHead>CREATED ON</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.reviews.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-gray-500"
                        >
                          No reviews yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.reviews.map((review, index) => (
                        <TableRow key={review.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{review.rating} STARS</TableCell>
                          <TableCell>{review.description}</TableCell>
                          <TableCell>{review.createdOn}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button variant="secondary" onClick={goToPrevTab}>
                  Back
                </Button>
                <Button onClick={handleSubmit}>
                  {isEdit ? "Submit" : "Submit"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
         </Card>

      {deleteImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
            <Trash2 className="mx-auto mb-4 h-12 w-12 text-gray-500" />

            <h2 className="mb-3 text-xl font-semibold">Are you sure?</h2>

            <p className="mb-6 text-gray-500">
              Do you really want to delete this Image?
              <br />
              This process cannot be undone.
            </p>

            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteImageIndex(null)}
              >
                Close
              </Button>

              <Button
                type="button"
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={async () => {
                  if (deleteImageIndex === null) return;
                  await removeServerImage(deleteImageIndex);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityForm;
