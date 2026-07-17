// FILE: src/pages/CreateItinerary/itineraryUtils.ts

import type { LocationOption } from "@/services/itineraryDropdownsMock";

// ----------------- date helpers -----------------

export function toDDMMYYYY(date: Date) {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDDMMYYYYParts(dateStr: string) {
  const [d, m, y] = (dateStr || "").split("/").map(Number);
  if (!d || !m || !y) return null;
  return { d, m, y };
}

function parseTimeParts(timeStr: string) {
  const t = (timeStr || "").trim();

  // Accept both "HH:mm" and "hh:mm AM/PM"
  const hasMeridian = /\b(am|pm)\b/i.test(t);

  if (hasMeridian) {
    const [timePart, merRaw] = t.split(/\s+/);
    const [hhStr, mmStr] = (timePart || "").split(":");
    let hh = Number(hhStr || 0);
    const mm = Number(mmStr || 0);
    const mer = (merRaw || "").toUpperCase();

    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

    if (mer === "PM" && hh < 12) hh += 12;
    if (mer === "AM" && hh === 12) hh = 0;

    return { hh, mm };
  }

  // "HH:mm"
  const [hhStr, mmStr] = t.split(":");
  const hh = Number(hhStr || 0);
  const mm = Number(mmStr || 0);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return { hh, mm };
}

/**
 * ✅ DD/MM/YYYY -> "YYYY-MM-DDT00:00:00+05:30"
 * (keeps +05:30 timezone as required by PHP parity)
 */
export function toISOFromDDMMYYYY(dateStr: string) {
  const p = parseDDMMYYYYParts(dateStr);
  if (!p) return "";
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}T00:00:00+05:30`;
}

/**
 * ✅ "DD/MM/YYYY" + ("HH:mm" OR "hh:mm AM/PM") -> "YYYY-MM-DDTHH:mm:00+05:30"
 * (NO "Z", always +05:30)
 */
export function toISOFromDDMMYYYYAndTime(dateStr: string, timeStr: string) {
  const p = parseDDMMYYYYParts(dateStr);
  const t = parseTimeParts(timeStr);
  if (!p || !t) return "";
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}T${pad2(t.hh)}:${pad2(t.mm)}:00+05:30`;
}
/**
 * Calculate number of nights between arrival and departure dates (DD/MM/YYYY format).
 * nights = departure date - arrival date (in days)
 * Example: 01/01/2025 to 03/01/2025 = 2 nights
 * Same day: 01/01/2025 to 01/01/2025 = 0 nights
 */
export function calculateNights(arrivalDateStr: string, departureDateStr: string): number {
  const arrivalParts = parseDDMMYYYYParts(arrivalDateStr);
  const departureParts = parseDDMMYYYYParts(departureDateStr);
  
  if (!arrivalParts || !departureParts) return 0;
  
  // Create dates at midnight (start of day, local time)
  const arrivalDate = new Date(arrivalParts.y, arrivalParts.m - 1, arrivalParts.d, 0, 0, 0, 0);
  const departureDate = new Date(departureParts.y, departureParts.m - 1, departureParts.d, 0, 0, 0, 0);
  
  // Calculate difference in milliseconds and convert to days
  const diffMs = departureDate.getTime() - arrivalDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Return 0 if departure is before arrival or same day
  return diffDays > 0 ? diffDays : 0;
}
// ----------------- text / via helpers -----------------

export function splitViaString(via: string | undefined | null): string[] {
  if (!via) return [];
  return via
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Normalize text to match labels even if phpmyadmin shows line breaks etc.
export function normalizeText(v: string) {
  return (v || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Legacy PHP saves dvi_itinerary_plan_details.location_id as the selected "main destination" ID.
 * In your UI, that corresponds to the selected Departure Location.
 */
export function resolveLocationIdFromLabel(
  locations: LocationOption[],
  label: string
): number {
  const target = normalizeText(label);
  if (!target) return 0;

  const found = locations.find((l: any) => {
    const lbl = normalizeText(String(l?.label ?? ""));
    const name = normalizeText(String(l?.name ?? ""));
    return lbl === target || name === target;
  });

  const rawId = (found as any)?.id ?? (found as any)?.location_id;
  const n = Number(rawId);
  return Number.isFinite(n) ? n : 0;
}

// Session ID removed - via routes are now stored in frontend state only
// and saved to database when the entire itinerary is created
