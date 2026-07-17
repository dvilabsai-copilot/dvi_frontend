import type { MealPlanOption, SimpleOption } from "@/services/itineraryDropdownsMock";
import type { RoomRow } from "./useRoomsAndTravellers";

export function mapMultiValuesToStringIds(
  vals: unknown,
  options: SimpleOption[],
): string[] {
  const arr = Array.isArray(vals) ? vals : [];
  const byId = new Map(options.map((option) => [String(option.id), String(option.id)]));
  const byLabel = new Map(
    options.map((option) => [option.label.trim().toLowerCase(), String(option.id)]),
  );

  const out: string[] = [];
  for (const raw of arr) {
    const value = String(raw ?? "").trim();
    if (!value) continue;

    const direct = byId.get(value);
    if (direct) {
      out.push(direct);
      continue;
    }

    const fromLabel = byLabel.get(value.toLowerCase());
    if (fromLabel) out.push(fromLabel);
  }

  return Array.from(new Set(out));
}

export function parseDDMMYYYY(value: string): Date | undefined {
  if (!value) return undefined;
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return undefined;
  return new Date(year, month - 1, day);
}

export function formatDDMMYYYY(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

export function findIdByLabel(
  options: SimpleOption[],
  matcher: (labelLower: string) => boolean,
): string | undefined {
  const option = options.find((item) => matcher(item.label.toLowerCase()));
  return option ? String(option.id) : undefined;
}

export function getSafeTravellerCount(value: unknown, minimum = 0): number {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric)) return minimum;
  return Math.max(minimum, numeric);
}

export function buildVehicleOnlyTravellerRooms({
  adults,
  children,
  infants,
}: {
  adults: number;
  children: number;
  infants: number;
}): RoomRow[] {
  const safeChildren = getSafeTravellerCount(children, 0);

  return [{
    id: 1,
    roomCount: 1,
    adults: getSafeTravellerCount(adults, 1),
    children: safeChildren,
    infants: getSafeTravellerCount(infants, 0),
    childrenDetails: Array.from({ length: safeChildren }, () => ({
      age: "",
      bedType: "Without Bed" as const,
      hotelApprovalAccepted: false,
    })),
  }];
}

export function getMealPlanLabel(item: MealPlanOption): string {
  return item.description ? `${item.label} (${item.description})` : item.label;
}
