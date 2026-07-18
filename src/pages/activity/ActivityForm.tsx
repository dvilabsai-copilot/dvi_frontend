/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { ActivityFormView } from "./ActivityFormView";
import { ActivityDatePickerField, ActivityTimePickerField } from "./ActivityFormFields";
import { TABS, durationHours, durationMinutes, durationSeconds, splitDuration, buildDuration, getEmptyActivity, toReviewRowsCSV, toReviewRowsHTML, downloadFile, formatReviewDateTime, normalizeTime24, parseYmdToDate, formatYmdLabel, buildApiUrl, buildActivityImageUrl } from "./activityForm.utils";
import type { ActivityFormState, FormTimeSlot, FormSpecialDay, FormPricing, FormReview } from "./activityForm.utils";
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
            pricingUnitType: pb.pricing_unit_type ?? "PER_ADULT",
            adult: pb.indian?.adult_cost ?? 0,
            children: pb.indian?.child_cost ?? 0,
            infant: pb.indian?.infant_cost ?? 0,
            unitCost: pb.indian?.unit_cost ?? 0,
            foreignAdult: pb.nonindian?.adult_cost ?? 0,
            foreignChildren: pb.nonindian?.child_cost ?? 0,
            foreignInfant: pb.nonindian?.infant_cost ?? 0,
            foreignUnitCost: pb.nonindian?.unit_cost ?? 0,
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
    const handlePricingChange = <K extends keyof FormPricing>(
    field: K,
    value: FormPricing[K]
  ) => {
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
  try {
    await navigator.clipboard.writeText(toReviewRowsCSV(filteredReviews));
    toast.success("Copied reviews as CSV");
  } catch {
    toast.error("Copy failed");
  }
};
const handleReviewCSV = () => {
  downloadFile("activity-reviews.csv", "text/csv;charset=utf-8;", toReviewRowsCSV(filteredReviews));
};
const handleReviewExcel = () => {
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
            pricingUnitType: pb.pricing_unit_type ?? prev.pricing.pricingUnitType,
            adult: pb.indian?.adult_cost ?? prev.pricing.adult,
            children: pb.indian?.child_cost ?? prev.pricing.children,
            infant: pb.indian?.infant_cost ?? prev.pricing.infant,
            unitCost: pb.indian?.unit_cost ?? prev.pricing.unitCost,
            foreignAdult: pb.nonindian?.adult_cost ?? prev.pricing.foreignAdult,
            foreignChildren: pb.nonindian?.child_cost ?? prev.pricing.foreignChildren,
            foreignInfant: pb.nonindian?.infant_cost ?? prev.pricing.foreignInfant,
            foreignUnitCost: pb.nonindian?.unit_cost ?? prev.pricing.foreignUnitCost,
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
          pricing_unit_type: currentPricing.pricingUnitType,
          indian: {
            adult_cost: currentPricing.adult,
            child_cost: currentPricing.children,
            infant_cost: currentPricing.infant,
            unit_cost: currentPricing.unitCost,
          },
          nonindian: {
            adult_cost: currentPricing.foreignAdult,
            child_cost: currentPricing.foreignChildren,
            infant_cost: currentPricing.foreignInfant,
            unit_cost: currentPricing.foreignUnitCost,
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
    const priceBookRows =
    formData.pricing.pricingUnitType === "UNIT"
      ? [
          {
            nationality: "Indian",
            priceType: "Unit Cost",
            amount: formData.pricing.unitCost,
          },
          {
            nationality: "Non Indian",
            priceType: "Unit Cost",
            amount: formData.pricing.foreignUnitCost,
          },
        ]
      : [
          {
            nationality: "Indian",
            priceType: "Adults",
            amount: formData.pricing.adult,
          },
          {
            nationality: "Indian",
            priceType: "Children",
            amount: formData.pricing.children,
          },
          {
            nationality: "Indian",
            priceType: "Infants",
            amount: formData.pricing.infant,
          },
          {
            nationality: "Non Indian",
            priceType: "Adults",
            amount: formData.pricing.foreignAdult,
          },
          {
            nationality: "Non Indian",
            priceType: "Children",
            amount: formData.pricing.foreignChildren,
          },
          {
            nationality: "Non Indian",
            priceType: "Infants",
            amount: formData.pricing.foreignInfant,
          },
        ];
    const hotspotLabel = hotspotOptions.find((o) => o.id === formData.hotspotId)?.label?.split(" \u2014 ")[0] || formData.title || "Activity";
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
          pricing_unit_type: formData.pricing.pricingUnitType,
          indian: {
            adult_cost: formData.pricing.adult,
            child_cost: formData.pricing.children,
            infant_cost: formData.pricing.infant,
            unit_cost: formData.pricing.unitCost,
          },
          nonindian: {
            adult_cost: formData.pricing.foreignAdult,
            child_cost: formData.pricing.foreignChildren,
            infant_cost: formData.pricing.foreignInfant,
            unit_cost: formData.pricing.foreignUnitCost,
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
        // non-blocking â€” proceed to next tab even if save fails
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
  const activityViewContext = {
    activeTab,
    addDefaultTime,
    addSpecialDay,
    cancelEditReview,
    deleteImageIndex,
    deleteReview,
    editingReviewId,
    filteredReviews,
    formData,
    formatDMY,
    goToNextTab,
    goToPrevTab,
    handleImageUpload,
    handleInputChange,
    handlePricingChange,
    handleReviewCSV,
    handleReviewCopy,
    handleReviewExcel,
    handleSaveReview,
    handleSubmit,
    handleUpdatePricing,
    hotspotLabel,
    hotspotOptions,
    id,
    imagePreviews,
    isEdit,
    isHotspotOpen,
    isPriceEndOpen,
    isPriceStartOpen,
    isReadonly,
    loading,
    navigate,
    paginatedReviews,
    parseDMY,
    priceBookDates,
    priceBookRows,
    priceEndDate,
    priceStartDate,
    removeDefaultTime,
    removeImage,
    removeServerImage,
    removeSpecialDay,
    renderStars,
    reviewFeedback,
    reviewPage,
    reviewPageSize,
    reviewRating,
    reviewSearch,
    serverImages,
    setActiveTab,
    setDeleteImageIndex,
    setIsHotspotOpen,
    setIsPriceEndOpen,
    setIsPriceStartOpen,
    setPriceEndDate,
    setPriceStartDate,
    setReviewFeedback,
    setReviewPage,
    setReviewPageSize,
    setReviewRating,
    setReviewSearch,
    startEditReview,
    totalReviewPages,
    updateDefaultTime,
    updateSpecialDayDate,
    updateSpecialDayTime,
  };
  return <ActivityFormView context={activityViewContext} />;
};
export default ActivityForm;
