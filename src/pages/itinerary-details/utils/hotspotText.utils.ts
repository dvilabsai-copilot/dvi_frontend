/** Extracts the destination label from a normalized "Travel to ..." string. */
export function extractTravelToFromText(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^travel\s+to\s+(.+)$/i);
  return String(match?.[1] || "").trim();
}

/** Extracts both endpoints from a timeline travel label when they are embedded in text. */
export function extractTravelFromToFromText(value: unknown): { from: string; to: string } {
  const raw = String(value || "").trim();
  if (!raw) return { from: "", to: "" };
  const match = raw.match(/^travell?ing\s+from\s+(.+?)\s+to\s+(.+)$/i);
  if (!match) return { from: "", to: "" };
  return { from: String(match[1] || "").trim(), to: String(match[2] || "").trim() };
}
