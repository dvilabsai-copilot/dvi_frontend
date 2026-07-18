import { format } from "date-fns";
import { ActivitiesAPI } from "@/services/activities";
import { time12To24 } from "@/components/itinerary/TimePickerPopover";

export type FormTimeSlot = { startTime: string; endTime: string };

export type FormSpecialDay = {
  date: string;
  timeSlots: FormTimeSlot[];
};

export type ActivityPricingUnitType = "PER_ADULT" | "UNIT";

export type FormPricing = {
  startDate: string;
  endDate: string;
  pricingUnitType: ActivityPricingUnitType;
  adult: number;
  children: number;
  infant: number;
  unitCost: number;
  foreignAdult: number;
  foreignChildren: number;
  foreignInfant: number;
  foreignUnitCost: number;
};

export type FormReview = {
  id: string;
  rating: number;
  description: string;
  createdOn: string;
};

export type ActivityFormState = {
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

export const TABS = [
  { id: 1, name: "Activity Basic Details" },
  { id: 2, name: "Price Book" },
  { id: 3, name: "FeedBack & Review" },
  { id: 4, name: "Preview" },
];

export const durationHours = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);

export const durationMinutes = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);

export const durationSeconds = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);

export function splitDuration(value?: string) {
  const [hh = "00", mm = "30", ss = "00"] = String(value || "00:30:00").split(":");

  return {
    hh: hh.padStart(2, "0").slice(0, 2),
    mm: mm.padStart(2, "0").slice(0, 2),
    ss: ss.padStart(2, "0").slice(0, 2),
  };
}

export function buildDuration(hh: string, mm: string, ss: string) {
  return `${hh}:${mm}:${ss}`;
}

export const getEmptyActivity = (): ActivityFormState => ({
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
    pricingUnitType: "PER_ADULT",
    adult: 0,
    children: 0,
    infant: 0,
    unitCost: 0,
    foreignAdult: 0,
    foreignChildren: 0,
    foreignInfant: 0,
    foreignUnitCost: 0,
  },
  reviews: [],
  status: true,
});

export function toReviewRowsCSV(rows: FormReview[]) {
  const headers = ["S.NO", "RATING", "DESCRIPTION", "CREATED ON"];
  const data = rows.map((r, idx) => [
    String(idx + 1),
    String(r.rating ?? ""),
    r.description ?? "",
    // r.createdOn ?? "",
      formatReviewDateTime(r.createdOn),
  ]);

  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.map(esc).join(","), ...data.map((row) => row.map(esc).join(","))].join("\n");
}

export function toReviewRowsHTML(rows: FormReview[]) {
  const head = `<tr><th>S.NO</th><th>RATING</th><th>DESCRIPTION</th><th>CREATED ON</th></tr>`;
  const body = rows
    .map(
      (r, idx) =>
        `<tr><td>${idx + 1}</td><td>${r.rating ?? ""}</td><td>${r.description ?? ""}</td><td>${
          r.createdOn ?? ""
        }</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8" /><title>Activity Reviews</title></head><body><table border="1">${head}${body}</table></body></html>`;
}


export function downloadFile(name: string, mime: string, content: string) {
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

export function formatReviewDateTime(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "-";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${dd}-${mm}-${yyyy} ${String(hours).padStart(2, "0")}:${minutes} ${period}`;
}


export function normalizeTime24(value?: string): string {
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

export function parseYmdToDate(value?: string): Date | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const [y, m, d] = raw.split("-").map((n) => Number(n));
  if (!y || !m || !d) return undefined;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

export function formatYmdLabel(value?: string): string {
  const dt = parseYmdToDate(value);
  return dt ? format(dt, "dd/MM/yyyy") : "DD/MM/YYYY";
}

export function buildApiUrl(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildActivityImageUrl(value?: string) {
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


