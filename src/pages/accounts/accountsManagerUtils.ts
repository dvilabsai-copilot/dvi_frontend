import type { AccountsRow } from "@/services/accountsManagerApi";

export const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? 0 : numberValue;
  }
  return 0;
}

export const SECTION_CONFIG = [
  { type: "guide", label: "Guide" },
  { type: "hotspot", label: "Hotspot" },
  { type: "activity", label: "Activity" },
  { type: "hotel", label: "Hotel" },
  { type: "vehicle", label: "Vehicle" },
  { type: "flight", label: "Flight" },
] as const;

export type SectionKey = (typeof SECTION_CONFIG)[number]["type"];

export type AccountsGroupedRows = Record<SectionKey, AccountsRow[]>;
