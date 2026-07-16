export function normalizeRouteFamilyBaseQuoteId(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(/^(.*)-R(\d+)$/i);
  return String(match?.[1] || raw).trim();
}
