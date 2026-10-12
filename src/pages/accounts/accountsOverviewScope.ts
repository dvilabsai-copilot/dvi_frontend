
import type { AccountsRow } from "@/services/accountsManagerApi";
import {
  fetchLedgerFromApi,
  type ComponentType,
  type LedgerRow,
} from "@/services/accountsLedgerApi";

export type AccountsNavigationScope = {
  records: Array<{
    quoteId: string;
    componentType: string;
    componentDetailId: number;
  }>;
};

const normalizeQuote = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

const recordKey = (
  quoteId: unknown,
  componentType: unknown,
  id: unknown,
) =>
  `${normalizeQuote(quoteId)}:${String(componentType)}:${Number(id)}`;

export function createAccountsNavigationScope(
  rows: AccountsRow[],
): AccountsNavigationScope {
  return {
    records: rows
      .filter(
        (row) =>
          Boolean(row.quoteId?.trim()) &&
          Number(row.id) > 0,
      )
      .map((row) => ({
        quoteId: row.quoteId.trim(),
        componentType: row.componentType,
        componentDetailId: Number(row.id),
      })),
  };
}

export function filterAccountsByNavigationScope(
  rows: AccountsRow[],
  scope?: AccountsNavigationScope | null,
): AccountsRow[] {
  if (!scope || !Array.isArray(scope.records)) {
    return rows;
  }

  const allowed = new Set(
    scope.records.map((record) =>
      recordKey(
        record.quoteId,
        record.componentType,
        record.componentDetailId,
      ),
    ),
  );

  return rows.filter((row) =>
    allowed.has(
      recordKey(row.quoteId, row.componentType, row.id),
    ),
  );
}

type LedgerFilters =
  Parameters<typeof fetchLedgerFromApi>[0];

export async function fetchLedgerForAccountsRows(
  accountsRows: AccountsRow[],
  componentType: ComponentType,
  filters: Partial<LedgerFilters> = {},
): Promise<LedgerRow[]> {
  const quoteMap = new Map<string, string>();

  for (const row of accountsRows) {
    const quoteId = String(row.quoteId || "").trim();

    if (quoteId) {
      quoteMap.set(normalizeQuote(quoteId), quoteId);
    }
  }

  const quoteIds = Array.from(quoteMap.values());

  if (!quoteIds.length) {
    return [];
  }

  const allowedComponents = new Set(
    accountsRows.map((row) =>
      recordKey(row.quoteId, row.componentType, row.id),
    ),
  );

  const allowedBookings = new Set(
    quoteIds.map(normalizeQuote),
  );

  const baseFilters: LedgerFilters = {
    quoteId: "",
    componentType,
    fromDate: "",
    toDate: "",
    guideName: "0",
    hotspotName: "0",
    activityName: "0",
    hotelName: "0",
    branch: "0",
    vehicle: "0",
    vehicleVendor: "0",
    agentName: "0",
    ...filters,
  };

  const result: LedgerRow[] = [];

  // Avoid sending unlimited concurrent ledger requests.
  const batchSize = 8;

  for (
    let index = 0;
    index < quoteIds.length;
    index += batchSize
  ) {
    const batch = quoteIds.slice(
      index,
      index + batchSize,
    );

    const groups = await Promise.all(
      batch.map((quoteId) =>
        fetchLedgerFromApi({
          ...baseFilters,
          quoteId,
          componentType,
        }),
      ),
    );

    result.push(...groups.flat());
  }

  const dateToYmd = (value: string) => {
    const match =
      /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

    return match
      ? `${match[3]}-${match[2]}-${match[1]}`
      : "";
  };

  const from = dateToYmd(baseFilters.fromDate);
  const to = dateToYmd(baseFilters.toDate);

  return result.filter((row) => {
    const bookingId = normalizeQuote(row.bookingId);

    if (!allowedBookings.has(bookingId)) {
      return false;
    }

    // Agent ledger rows are booking/header-level.
    // Supplier rows must match their exact component ID.
    const matchesScope =
      row.componentType === "agent"
        ? true
        : allowedComponents.has(
            recordKey(
              row.bookingId,
              row.componentType,
              row.componentDetailId,
            ),
          );

    if (!matchesScope) {
      return false;
    }

    // Quote-based backend ledger queries override dates.
    // Apply the selected date window to scoped results.
    if (from && to) {
      const startDate = String(row.startDate || "")
        .slice(0, 10);

      if (startDate < from || startDate > to) {
        return false;
      }
    }

    return true;
  });
}
