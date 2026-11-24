/** Pure finance query and booking-matching helpers; no JSX or API access. */
export type QuoteRow = { quoteId: string };
const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase();

/** Avoid one network request per booking when viewing all transporters. */
export function getFinanceLedgerTargets(
  lookup: string,
  aliases: readonly string[],
  financeRows: readonly QuoteRow[],
): string[] {
  if (!lookup.trim()) return [""];
  const uniq = new Map<string, string>();
  for (const value of [lookup, ...aliases, ...financeRows.map((r) => r.quoteId)]) {
    const key = normalized(value);
    if (key && !uniq.has(key)) uniq.set(key, String(value).trim());
  }
  return [...uniq.values()];
}

/** Match canonical IDs exactly, and support partial user-entered queries safely. */
export function matchesLedgerBooking(
  bookingId: string,
  lookup: string,
  aliases: readonly string[],
): boolean {
  const rowId = normalized(bookingId);
  const query = normalized(lookup);
  if (!rowId || !query) return false;
  const canonicalIds = new Set(aliases.map(normalized).filter(Boolean));
  return canonicalIds.has(rowId) || rowId.includes(query);
}

export function countFailedRequests(results: readonly { status: string }[]): number {
  return results.filter((item) => item.status === "rejected").length;
}

/** Never show "no records" if an authoritative finance request failed. */
export function shouldShowFinanceRequestError(failures: number, recordCount: number): boolean {
  return failures > 0 && recordCount === 0;
}
