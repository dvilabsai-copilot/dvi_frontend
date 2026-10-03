import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Search,
  Plus,
  ChevronDown,
  CheckCircle2,
  Clock3,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  fetchAccountsInvoiceData,
  fetchAccountsList,
  fetchAccountsSummary,
  fetchPaymentModes,
  type AccountsRow,
  type AccountsSummary,
  type PaymentModeOption,
} from "@/services/accountsManagerApi";

import {
  fetchLedgerFromApi,
  type LedgerRow,
} from "@/services/accountsLedgerApi";

import {
  ItineraryService,
} from "@/services/itinerary";

import {
  PayNowModal,
} from "./PayNowModal";

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const toNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
};

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-700",
  due: "bg-amber-100 text-amber-700",
};

type BookingMeta = {
  quoteId: string;
  planId?: number;

  status:
    | "Confirmed"
    | "Latest"
    | "Accounts";

  agent: string;
  guest: string;
  startDate: string;
  endDate: string;
};

const componentPurchase = (
  row: AccountsRow,
) =>
  toNumber(row.payout) +
  toNumber(row.payable);

const componentSelling = (
  row: AccountsRow,
) =>
  toNumber(
    row.receivableFromAgentAmount ??
      row.amount,
  );

const componentName = (
  row: AccountsRow,
) =>
  String(
    row.hotelName ||
      row.componentType ||
      "Component",
  );

const componentDate = (
  row: AccountsRow,
) =>
  String(
    row.routeDate ||
      row.transactionDate ||
      row.date ||
      row.startDate ||
      "-",
  );

  const INVOICE_ELIGIBILITY_START_DATE =
  "2026-08-15";

const OVERVIEW_TABS = [
  "Financial Overview",
  "Itinerary",
  "Services & Components",
  "Invoices",
  "Vendor Bills",
  "Payments",
  "Ledgers",
  "GST",
  "Profitability",
  "Documents",
  "Activity Log",
] as const;

type OverviewTab =
  (typeof OVERVIEW_TABS)[number];

const normalizeDateOnly = (
  value: unknown,
) => {
  const raw =
    String(value || "").trim();

  if (!raw) return "";

  const isoMatch =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dmyMatch =
    raw.match(
      /^(\d{2})[\/-](\d{2})[\/-](\d{4})/,
    );

  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  return "";
};

const formatDisplayDate = (
  value: unknown,
) => {
  const ymd =
    normalizeDateOnly(value);

  if (!ymd) {
    return String(
      value || "-",
    );
  }

  const [year, month, day] =
    ymd
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

const todayYmd = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

const ledgerComponentName = (
  row: LedgerRow,
) =>
  String(
    row.hotelName ||
      row.vehicleVendor ||
      row.vehicle ||
      row.guideName ||
      row.hotspotName ||
      row.activityName ||
      row.componentType ||
      "Component",
  );

  const normalizeQuoteId = (
  value: unknown,
) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const usableText = (
  ...values: unknown[]
) => {
  for (const value of values) {
    const text =
      String(
        value ?? "",
      ).trim();

    if (
      text &&
      text !== "-" &&
      text.toLowerCase() !==
        "n/a"
    ) {
      return text;
    }
  }

  return "-";
};


/*
 * Accounts Overview:
 * Supplier / Vendor display name.
 *
 * Vehicle rows should show the actual vendor,
 * not the registration number.
 */
const componentSupplierName = (
  row: AccountsRow,
) => {
  if (
    row.componentType ===
    "vehicle"
  ) {
    return usableText(
      row.vendorName,
      row.hotelName,
      "Vehicle Vendor",
    );
  }

  return componentName(
    row,
  );
};


/*
 * Accounts Overview:
 * More meaningful component details.
 *
 * For vehicle rows:
 * Vehicle Type • Registration • Branch
 */
const componentDetails = (
  row: AccountsRow,
) => {
  if (
    row.componentType !==
    "vehicle"
  ) {
    return String(
      row.componentType ||
        "Component",
    );
  }

  const values = [
    row.vehicleTypeName,
    row.vehicleName,
    row.vendorBranchName,
  ]
    .map((value) =>
      String(
        value || "",
      ).trim(),
    )
    .filter(Boolean);

  return (
    values.join(" • ") ||
    "Vehicle"
  );
};


async function findItineraryMetadata(
  quoteId: string,
): Promise<BookingMeta | null> {
  const targetQuote =
    normalizeQuoteId(
      quoteId,
    );

  /*
   * Both are existing DVI flows.
   *
   * Confirmed is preferred because an itinerary
   * can also appear in general itinerary data after
   * it has been confirmed.
   */
  const [
    latestResponse,
    confirmedResponse,
  ] = await Promise.all([
    ItineraryService.getLatest({
      page: 1,
      pageSize: 10,
      search: quoteId,
    }).catch(
      (lookupError) => {
        console.error(
          "Latest itinerary lookup failed:",
          lookupError,
        );

        return null;
      },
    ),

    ItineraryService
      .getConfirmedItineraries({
        draw: 1,
        start: 0,
        length: 10,
        search: quoteId,
      })
      .catch(
        (lookupError) => {
          console.error(
            "Confirmed itinerary lookup failed:",
            lookupError,
          );

          return null;
        },
      ),
  ]);

  const confirmedRows =
    Array.isArray(
      (confirmedResponse as any)
        ?.data,
    )
      ? (
          confirmedResponse as any
        ).data
      : [];

  /*
   * Do an EXACT quote match.
   *
   * Do not blindly use data[0], because backend
   * search is a contains/global search.
   */
  const confirmedBooking =
    confirmedRows.find(
      (row: any) => {
        const rowQuote =
          normalizeQuoteId(
            row?.booking_quote_id ||
              row?.itinerary_quote_ID ||
              row?.quoteId,
          );

        return (
          rowQuote ===
          targetQuote
        );
      },
    );

  if (confirmedBooking) {
    return {
      quoteId:
        usableText(
          confirmedBooking
            ?.booking_quote_id,
          confirmedBooking
            ?.itinerary_quote_ID,
          quoteId,
        ),

      planId:
        Number(
          confirmedBooking
            ?.itinerary_plan_ID ||
            confirmedBooking
              ?.confirmed_itinerary_plan_ID ||
            0,
        ) || undefined,

      status:
        "Confirmed",

      agent:
        usableText(
          confirmedBooking
            ?.agent_name,
        ),

      guest:
        usableText(
          confirmedBooking
            ?.primary_customer_name,
        ),

      startDate:
        usableText(
          confirmedBooking
            ?.arrival_date,
        ),

      endDate:
        usableText(
          confirmedBooking
            ?.departure_date,
        ),
    };
  }

  const latestRows =
    Array.isArray(
      (latestResponse as any)
        ?.data,
    )
      ? (
          latestResponse as any
        ).data
      : [];

  const latestBooking =
    latestRows.find(
      (row: any) => {
        const rowQuote =
          normalizeQuoteId(
            row?.itinerary_quote_ID ||
              row?.itinerary_booking_ID ||
              row?.quoteId,
          );

        return (
          rowQuote ===
          targetQuote
        );
      },
    );

  if (latestBooking) {
  const latestPlanId =
    Number(
      latestBooking
        ?.modify ||
        latestBooking
          ?.itinerary_plan_ID ||
        0,
    ) || undefined;

  let rawPlan:
    any = null;

  let customerInfo:
    any = null;

  if (latestPlanId) {
    const [
      editResponse,
      customerResponse,
    ] = await Promise.all([
      ItineraryService
        .getOne(
          latestPlanId,
        )
        .catch(
          (error) => {
            console.error(
              "Latest itinerary raw plan lookup failed:",
              error,
            );

            return null;
          },
        ),

      ItineraryService
        .getCustomerInfoForm(
          latestPlanId,
        )
        .catch(
          (error) => {
            console.error(
              "Latest itinerary customer info lookup failed:",
              error,
            );

            return null;
          },
        ),
    ]);

    rawPlan =
      editResponse
        ?.plan ??
      null;

    customerInfo =
      customerResponse ??
      null;
  }

  return {
    quoteId:
      usableText(
        latestBooking
          ?.itinerary_quote_ID,

        latestBooking
          ?.itinerary_booking_ID,

        rawPlan
          ?.itinerary_quote_ID,

        quoteId,
      ),

    planId:
      latestPlanId,

    status:
      "Latest",

    agent:
      usableText(
        customerInfo
          ?.agent_name,

        customerInfo
          ?.agent_display_name,
      ),

    /*
     * Latest itineraries may not yet have
     * primary guest/customer confirmation data.
     *
     * Do not invent a guest name.
     */
    guest: "-",

    /*
     * IMPORTANT:
     *
     * Prefer the persisted PLAN dates.
     * Latest listing may contain only "12:00 PM".
     */
    startDate:
      usableText(
        rawPlan
          ?.trip_start_date_and_time,

        latestBooking
          ?.trip_start_date_and_time,
      ),

    endDate:
      usableText(
        rawPlan
          ?.trip_end_date_and_time,

        latestBooking
          ?.trip_end_date_and_time,
      ),
  };
}

  return null;
}

export function AccountsOverview() {
  const navigate = useNavigate();

const topHorizontalScrollRef =
  useRef<HTMLDivElement>(null);

const contentHorizontalScrollRef =
  useRef<HTMLDivElement>(null);

const bottomCardsTopScrollRef =
  useRef<HTMLDivElement>(null);

const bottomCardsContentRef =
  useRef<HTMLDivElement>(null);

const serviceComponentsTopScrollRef =
  useRef<HTMLDivElement>(null);

const serviceComponentsTableScrollRef =
  useRef<HTMLDivElement>(null);

  const handleTopHorizontalScroll = () => {
    const topScroller =
      topHorizontalScrollRef.current;

    const contentScroller =
      contentHorizontalScrollRef.current;

    if (
      !topScroller ||
      !contentScroller
    ) {
      return;
    }

    contentScroller.scrollLeft =
      topScroller.scrollLeft;
  };


  const handleBottomCardsTopScroll = () => {
  const topScroller =
    bottomCardsTopScrollRef.current;

  const contentScroller =
    bottomCardsContentRef.current;

  if (
    !topScroller ||
    !contentScroller
  ) {
    return;
  }

  contentScroller.scrollLeft =
    topScroller.scrollLeft;
};


const handleBottomCardsContentScroll = () => {
  const topScroller =
    bottomCardsTopScrollRef.current;

  const contentScroller =
    bottomCardsContentRef.current;

  if (
    !topScroller ||
    !contentScroller
  ) {
    return;
  }

  topScroller.scrollLeft =
    contentScroller.scrollLeft;
};

const handleServiceComponentsTopScroll = () => {
  const topScroller =
    serviceComponentsTopScrollRef.current;

  const tableScroller =
    serviceComponentsTableScrollRef.current;

  if (
    !topScroller ||
    !tableScroller
  ) {
    return;
  }

  tableScroller.scrollLeft =
    topScroller.scrollLeft;
};


const handleServiceComponentsTableScroll = () => {
  const topScroller =
    serviceComponentsTopScrollRef.current;

  const tableScroller =
    serviceComponentsTableScrollRef.current;

  if (
    !topScroller ||
    !tableScroller
  ) {
    return;
  }

  topScroller.scrollLeft =
    tableScroller.scrollLeft;
};
  const [searchInput, setSearchInput] =
    useState("");

const [
  searchedQuoteId,
  setSearchedQuoteId,
] = useState("");

const [
  searchVersion,
  setSearchVersion,
] = useState(0);

const [rows, setRows] =
  useState<AccountsRow[]>([]);

const [summary, setSummary] =
  useState<AccountsSummary | null>(null);

const [
  vendorLedgerRows,
  setVendorLedgerRows,
] = useState<LedgerRow[]>([]);

const [
  agentLedgerRows,
  setAgentLedgerRows,
] = useState<LedgerRow[]>([]);

const [
  bookingMeta,
  setBookingMeta,
] = useState<BookingMeta | null>(null);

const [
  invoiceData,
  setInvoiceData,
] = useState<any>(null);

const [loading, setLoading] =
  useState(false);

  const [error, setError] =
  useState("");

const [
  notice,
  setNotice,
] = useState("");

const [
  activeTab,
  setActiveTab,
] =
  useState<OverviewTab>(
    "Financial Overview",
  );

const [
  selectedPaymentRow,
  setSelectedPaymentRow,
] =
  useState<
    AccountsRow | null
  >(null);

  const [
  paymentModes,
  setPaymentModes,
] =
  useState<
    PaymentModeOption[]
  >([]);

useEffect(() => {
  let cancelled = false;

  fetchPaymentModes()
    .then((modes) => {
      if (!cancelled) {
        setPaymentModes(modes);
      }
    })
    .catch((lookupError) => {
      console.error(
        "Payment modes failed:",
        lookupError,
      );

      if (!cancelled) {
        setPaymentModes([]);
      }
    });

  return () => {
    cancelled = true;
  };
}, []);

const handleSearch = () => {
  const value =
    searchInput.trim();

  if (!value) {
  setError(
    "Enter a booking/quote ID, vendor, or agent.",
  );


    setNotice("");

    return;
  }

  setError("");
  setNotice("");

  setSearchedQuoteId(
    value,
  );

  setSearchVersion(
    (current) =>
      current + 1,
  );
};
useEffect(() => {
  let cancelled = false;

 if (!searchedQuoteId) {
  setRows([]);
  setSummary(null);
  setVendorLedgerRows([]);
  setAgentLedgerRows([]);
  setBookingMeta(null);
  setInvoiceData(null);
  setNotice("");

  return () => {
    cancelled = true;
  };
}

  async function loadAccountsOverview() {
    setLoading(true);

setError("");
setNotice("");

setRows([]);
setSummary(null);
setVendorLedgerRows([]);
setAgentLedgerRows([]);
setBookingMeta(null);
setInvoiceData(null);

    try {
   const filters = {
  status: "all" as const,

  /*
   * General Accounts search.
   *
   * Backend now searches:
   * - booking / quote ID
   * - vendor / supplier
   * - agent
   */
  search: searchedQuoteId,
};

      const ledgerBaseFilters = {
        quoteId: searchedQuoteId,

        fromDate: "",
        toDate: "",

        guideName: "",
        hotspotName: "",
        activityName: "",
        hotelName: "",

        branch: "",
        vehicle: "",
        vehicleVendor: "",
        agentName: "",
      };

/*
 * First resolve / repair Accounts records.
 *
 * The backend will create only missing Accounts
 * rows for a fully confirmed itinerary.
 */
const [
  accountsRows,
  itineraryLookup,
] = await Promise.all([

  fetchAccountsList(
    filters,
  ).catch(
    (accountsError) => {
      console.error(
        "Accounts list failed:",
        accountsError,
      );

      return [] as AccountsRow[];
    },
  ),

  findItineraryMetadata(
    searchedQuoteId,
  ),
]);

if (cancelled) {
  return;
}


/*
 * After Accounts repair has completed, load all
 * aggregate/ledger views from the persisted rows.
 */
const [
  accountsSummary,
  vendorLedgers,
  agentLedgers,
] = await Promise.all([

  fetchAccountsSummary(
    filters,
  ).catch(
    (summaryError) => {
      console.error(
        "Accounts summary failed:",
        summaryError,
      );

      return null;
    },
  ),

  fetchLedgerFromApi({
    ...ledgerBaseFilters,
    componentType: "all",
  }).catch(
    (ledgerError) => {
      console.error(
        "Vendor ledger failed:",
        ledgerError,
      );

      return [] as LedgerRow[];
    },
  ),

  fetchLedgerFromApi({
    ...ledgerBaseFilters,
    componentType: "agent",
  }).catch(
    (ledgerError) => {
      console.error(
        "Agent ledger failed:",
        ledgerError,
      );

      return [] as LedgerRow[];
    },
  ),
]);
      if (cancelled) {
        return;
      }

      setRows(accountsRows);

      setSummary(
        accountsSummary,
      );

      setVendorLedgerRows(
        vendorLedgers,
      );

      setAgentLedgerRows(
        agentLedgers,
      );

      const firstRow =
  accountsRows[0];

const firstAgentLedger =
  agentLedgers[0];

const ledgerPlanId =
  agentLedgers.find(
    (row) =>
      Number(
        row.itineraryPlanId ||
          0,
      ) > 0,
  )?.itineraryPlanId ||
  vendorLedgers.find(
    (row) =>
      Number(
        row.itineraryPlanId ||
          0,
      ) > 0,
  )?.itineraryPlanId;

/*
 * If Latest / Confirmed identified the itinerary,
 * its plan ID takes priority.
 *
 * Otherwise use Accounts Ledger plan ID.
 */
const planId =
  Number(
    itineraryLookup
      ?.planId ||
      ledgerPlanId ||
      0,
  ) || undefined;

const financeAgent =
  usableText(
    firstRow?.agent,
    firstAgentLedger
      ?.agentName,
  );

const financeGuest =
  usableText(
    firstRow?.guestName,
    firstRow?.guest,
  );

const financeStartDate =
  usableText(
    firstRow
      ?.arrivalStartDate,
    firstRow
      ?.arrivalStart,
    firstRow?.startDate,
    firstAgentLedger
      ?.startDate,
  );

const financeEndDate =
  usableText(
    firstRow
      ?.destinationEndDate,
    firstRow
      ?.destinationEnd,
    firstRow?.endDate,
    firstAgentLedger
      ?.endDate,
  );

const isConfirmedLookup =
  itineraryLookup
    ?.status ===
  "Confirmed";

const initialMeta:
  BookingMeta = {
  quoteId:
    usableText(
      itineraryLookup
        ?.quoteId,
      firstRow?.quoteId,
      firstAgentLedger
        ?.bookingId,
      searchedQuoteId,
    ),

  planId,

  status:
    itineraryLookup
      ?.status ||
    "Accounts",

  /*
   * Confirmed endpoint contains better booking
   * metadata, so prefer it.
   *
   * Latest does not reliably include agent/guest,
   * therefore Accounts data wins for those fields.
   */
  agent:
    isConfirmedLookup
      ? usableText(
          itineraryLookup
            ?.agent,
          financeAgent,
        )
      : usableText(
          financeAgent,
          itineraryLookup
            ?.agent,
        ),

  guest:
    isConfirmedLookup
      ? usableText(
          itineraryLookup
            ?.guest,
          financeGuest,
        )
      : usableText(
          financeGuest,
          itineraryLookup
            ?.guest,
        ),

  startDate:
    isConfirmedLookup
      ? usableText(
          itineraryLookup
            ?.startDate,
          financeStartDate,
        )
      : usableText(
          financeStartDate,
          itineraryLookup
            ?.startDate,
        ),

  endDate:
    isConfirmedLookup
      ? usableText(
          itineraryLookup
            ?.endDate,
          financeEndDate,
        )
      : usableText(
          financeEndDate,
          itineraryLookup
            ?.endDate,
        ),
};

setBookingMeta(
  initialMeta,
);

      const hasFinanceData =
  accountsRows.length > 0 ||
  vendorLedgers.length > 0 ||
  agentLedgers.length > 0;

if (
  !itineraryLookup &&
  !hasFinanceData
) {
  /*
   * Nothing exists anywhere.
   */
  setError(
    `No itinerary found for ${searchedQuoteId}.`,
  );

  setNotice("");
} else if (
  itineraryLookup &&
  !hasFinanceData
) {
  /*
   * Important:
   *
   * The itinerary DOES exist.
   * Only finance records are missing.
   */
  setError("");

  setNotice(
    `${itineraryLookup.status} itinerary ${itineraryLookup.quoteId} was found, but Accounts & Finance records have not been generated yet.`,
  );
} else {
  setError("");
  setNotice("");
}

const shouldLoadInvoiceData =
  Boolean(planId) &&
  (
    itineraryLookup
      ?.status ===
      "Confirmed" ||
    accountsRows.length > 0
  );

if (
  planId &&
  shouldLoadInvoiceData
) {
  try {
    const invoice =
      await fetchAccountsInvoiceData(
        planId,
      );
    if (!cancelled) {
      setInvoiceData(
        invoice,
      );

      setBookingMeta(
        (current) => ({
          quoteId:
            String(
              invoice?.itinerary
                ?.quoteId ||
                invoice?.meta
                  ?.invoiceNo ||
                current
                  ?.quoteId ||
                searchedQuoteId,
            ),

          planId,

          status:
            "Confirmed",

          agent:
            String(
              invoice?.buyer
                ?.agentName ||
                invoice?.buyer
                  ?.companyName ||
                current?.agent ||
                "-",
            ),

          guest:
            String(
              invoice?.guest
                ?.name ||
                current?.guest ||
                "-",
            ),

          startDate:
            String(
              invoice?.itinerary
                ?.tripStartDateTime ||
                invoice?.guest
                  ?.arrivalDateTime ||
                current
                  ?.startDate ||
                "-",
            ),

          endDate:
            String(
              invoice?.itinerary
                ?.tripEndDateTime ||
                invoice?.guest
                  ?.departureDateTime ||
                current
                  ?.endDate ||
                "-",
            ),
        }),
      );
    }
  } catch (
    invoiceError
  ) {
    console.error(
      "Invoice data failed:",
      invoiceError,
    );

    if (!cancelled) {
      setInvoiceData(
        null,
      );
    }
  }
}
    } catch (loadError: any) {
      console.error(
        "Accounts Overview load failed:",
        loadError,
      );

      if (!cancelled) {
        setRows([]);
        setSummary(null);
        setVendorLedgerRows([]);
        setAgentLedgerRows([]);
        setBookingMeta(null);
        setInvoiceData(null);

        setError(
          loadError?.message ||
            `Unable to load Accounts & Finance data for ${searchedQuoteId}.`,
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void loadAccountsOverview();

  return () => {
    cancelled = true;
  };
}, [
  searchedQuoteId,
  searchVersion,
]);
const agentLedger =
  agentLedgerRows[0] ?? null;

/*
 * Agent/Vendor searches can return several components
 * from the same booking.
 *
 * Aggregate the booking/header financial data once
 * per accounts header, not once per component.
 */
const headerTotals =
  useMemo(() => {
    const usedHeaders =
      new Set<number>();

    let selling = 0;
    let received = 0;
    let pending = 0;

    for (const row of rows) {
      const headerId =
        Number(
          row.headerId || 0,
        );

      if (
        headerId > 0 &&
        usedHeaders.has(
          headerId,
        )
      ) {
        continue;
      }

      if (headerId > 0) {
        usedHeaders.add(
          headerId,
        );
      }

      selling +=
        toNumber(
          row.headerTotalBilled ??
            row.receivableFromAgentAmount ??
            row.amount,
        );

      received +=
        toNumber(
          row.headerTotalReceived ??
            row.inhandAmount,
        );

      pending +=
        toNumber(
          row.headerTotalReceivable,
        );
    }

    return {
      selling,
      received,
      pending,
    };
  }, [rows]);

const totals = useMemo(() => {
  const sellingFromRows =
  rows.reduce(
    (total, row) =>
      total +
      componentSelling(row),
    0,
  );
const selling =
  agentLedger
    ? toNumber(
        agentLedger.totalBilled,
      )
    : headerTotals.selling ||
      sellingFromRows;

  const purchaseFromRows =
    rows.reduce(
      (total, row) =>
        total +
        componentPurchase(row),
      0,
    );

  const purchase =
    summary
      ? toNumber(
          summary.totalPayable,
        )
      : purchaseFromRows;

  const fallbackReceived =
    rows.reduce(
      (total, row) =>
        total +
        toNumber(
          row.inhandAmount,
        ),
      0,
    );

const received =
  agentLedger
    ? toNumber(
        agentLedger.totalReceived,
      )
    : headerTotals.received ||
      fallbackReceived;

  const fallbackPending =
    rows.reduce(
      (total, row) =>
        total +
        toNumber(
          row.receivableFromAgentAmount ??
            row.agentReceivable,
        ),
      0,
    );

const pending =
  agentLedger
    ? toNumber(
        agentLedger.totalReceivable,
      )
    : headerTotals.pending ||
      fallbackPending;

  const vendorPayments =
    summary
      ? toNumber(
          summary.totalPaid,
        )
      : rows.reduce(
          (total, row) =>
            total +
            toNumber(
              row.payout,
            ),
          0,
        );

  const vendorPayable =
    summary
      ? toNumber(
          summary.totalBalance,
        )
      : rows.reduce(
          (total, row) =>
            total +
            toNumber(
              row.payable,
            ),
          0,
        );

  return {
    selling,
    purchase,
    profit:
      selling -
      purchase,

    received,
    pending,

    vendorPayments,
    vendorPayable,
  };
}, [
  rows,
  summary,
  agentLedger,
  headerTotals,
]);

const agentReceiptRows:
  (string | number)[][] =
  useMemo(() => {
    if (agentLedger) {
      const received =
        toNumber(
          agentLedger.totalReceived,
        );

      const receivable =
        toNumber(
          agentLedger
            .totalReceivable,
        );

      return [
        [
          agentLedger.startDate ||
            bookingMeta
              ?.startDate ||
            "-",

          bookingMeta?.agent ||
            agentLedger
              .agentName ||
            "Agent",

          received,

          receivable > 0
            ? `Pending ${money(
                receivable,
              )}`
            : "Received",
        ],
      ];
    }

    if (
      totals.received > 0 ||
      totals.pending > 0
    ) {
      return [
        [
          bookingMeta
            ?.startDate ||
            "-",

          bookingMeta
            ?.agent ||
            "Agent",

          totals.received,

          totals.pending > 0
            ? `Pending ${money(
                totals.pending,
              )}`
            : "Received",
        ],
      ];
    }

    return [];
  }, [
    agentLedger,
    bookingMeta,
    totals.received,
    totals.pending,
  ]);

const paymentModeLabelById =
  useMemo(
    () =>
      new Map(
        paymentModes.map(
          (mode) => [
            Number(
              mode.id,
            ),
            mode.label,
          ],
        ),
      ),
    [paymentModes],
  );

const accountRowByComponent =
  useMemo(() => {
    const map =
      new Map<
        string,
        AccountsRow
      >();

    rows.forEach((row) => {
      map.set(
        `${row.componentType}:${row.id}`,
        row,
      );
    });

    return map;
  }, [rows]);

const vendorPaymentRows:
  (string | number)[][] =
  useMemo(
    () =>
      vendorLedgerRows
        .filter(
          (row) =>
            row.componentType !==
            "agent",
        )
        .flatMap(
          (row) => {
            const matchingAccountRow =
              row.componentDetailId
                ? accountRowByComponent.get(
                    `${row.componentType}:${row.componentDetailId}`,
                  )
                : undefined;

            const displayName =
              matchingAccountRow
                ? componentName(
                    matchingAccountRow,
                  )
                : ledgerComponentName(
                    row,
                  );

            return (
              row.transactions ??
              []
            ).map(
              (
                transaction,
              ) => {
                const paymentMode =
                  paymentModeLabelById.get(
                    transaction
                      .modeOfPayId,
                  ) ||
                  (
                    transaction
                      .modeOfPayId
                      ? `Mode #${transaction.modeOfPayId}`
                      : ""
                  );

                const details =
                  [
                    paymentMode,

                    transaction
                      .utrNo
                      ? `UTR ${transaction.utrNo}`
                      : "",

                    transaction
                      .doneBy
                      ? `By ${transaction.doneBy}`
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " · ",
                    );

                return [
                  formatDisplayDate(
                    transaction.date,
                  ),

                  `${displayName} · ${String(
                    row.componentType,
                  ).toUpperCase()}`,

                  toNumber(
                    transaction.amount,
                  ),

                  details ||
                    "Paid",
                ];
              },
            );
          },
        ),
    [
      vendorLedgerRows,
      paymentModeLabelById,
      accountRowByComponent,
    ],
  );

const vendorBillRows:
  (string | number)[][] =
  useMemo(
    () =>
      vendorLedgerRows
        .filter(
          (row) =>
            row.componentType !==
            "agent",
        )
        .map(
          (row) => {
            const matchingAccountRow =
              row.componentDetailId
                ? accountRowByComponent.get(
                    `${row.componentType}:${row.componentDetailId}`,
                  )
                : undefined;

            const displayName =
              matchingAccountRow
                ? componentName(
                    matchingAccountRow,
                  )
                : ledgerComponentName(
                    row,
                  );

            const balance =
              toNumber(
                row.totalBalance,
              );

            return [
              `${String(
                row.componentType,
              ).toUpperCase()} · ${displayName}${
                balance > 0
                  ? ` · Due ${money(
                      balance,
                    )}`
                  : " · Paid"
              }`,

              toNumber(
                row.totalBilled,
              ),
            ];
          },
        ),
    [
      vendorLedgerRows,
      accountRowByComponent,
    ],
  );

const invoiceRows:
  (string | number)[][] =
  useMemo(() => {
    if (!invoiceData) {
      return [];
    }

    return [
      [
        "Invoice No",
        String(
          invoiceData
            ?.meta
            ?.invoiceNo ||
            bookingMeta
              ?.quoteId ||
            "-",
        ),
      ],

      [
        "Invoice Date",
        formatDisplayDate(
          invoiceData
            ?.meta
            ?.invoiceDate,
        ),
      ],

      [
        "GST Type",
        String(
          invoiceData
            ?.meta
            ?.gstLabel ||
            "-",
        ),
      ],

      [
        "Total Amount",
        toNumber(
          invoiceData
            ?.totals
            ?.totalAmount,
        ),
      ],
    ];
  }, [
    invoiceData,
    bookingMeta,
  ]);

  const invoiceStartDate =
  normalizeDateOnly(
    bookingMeta
      ?.startDate,
  );

const invoiceEndDate =
  normalizeDateOnly(
    bookingMeta
      ?.endDate,
  );

const currentDate =
  todayYmd();

const hasValidInvoiceDateRange =
  /^\d{4}-\d{2}-\d{2}$/.test(
    invoiceStartDate,
  ) &&
  /^\d{4}-\d{2}-\d{2}$/.test(
    invoiceEndDate,
  ) &&
  invoiceStartDate <=
    invoiceEndDate;

const isInvoiceEligible =
  hasValidInvoiceDateRange &&
  invoiceStartDate >=
    INVOICE_ELIGIBILITY_START_DATE;

const shouldShowProformaInvoice =
  isInvoiceEligible &&
  currentDate >=
    invoiceStartDate &&
  currentDate <=
    invoiceEndDate;

const shouldShowTaxInvoice =
  isInvoiceEligible &&
  currentDate >
    invoiceEndDate;

const selectedQuoteId =
  String(
    bookingMeta
      ?.quoteId ||
      searchedQuoteId ||
      "",
  ).trim();

const handleEditBooking =
  () => {
    const planId =
      Number(
        bookingMeta
          ?.planId ||
          0,
      );

    if (!planId) {
      toast.error(
        "Search and load a booking first.",
      );

      return;
    }

    navigate(
      `/create-itinerary?id=${planId}`,
    );
  };

const handleViewItinerary =
  () => {
    const planId =
      Number(
        bookingMeta
          ?.planId ||
          0,
      );

    if (
      bookingMeta
        ?.status ===
        "Confirmed" &&
      planId
    ) {
      navigate(
        `/confirmed-itinerary/${planId}`,
      );

      return;
    }

    if (
      selectedQuoteId
    ) {
      navigate(
        `/itinerary-details/${encodeURIComponent(
          selectedQuoteId,
        )}`,
      );

      return;
    }

    toast.error(
      "Search and load a booking first.",
    );
  };

const handleOpenAccountsManager =
  () => {
    if (
      !selectedQuoteId
    ) {
      toast.error(
        "Search and load a booking first.",
      );

      return;
    }

    navigate(
      `/accounts-manager?quoteId=${encodeURIComponent(
        selectedQuoteId,
      )}`,
    );
  };

const handleOpenLedger =
  (
    componentType:
      string = "all",
  ) => {
    if (
      !selectedQuoteId
    ) {
      toast.error(
        "Search and load a booking first.",
      );

      return;
    }

    navigate(
      `/accounts-ledger?quoteId=${encodeURIComponent(
        selectedQuoteId,
      )}&componentType=${encodeURIComponent(
        componentType,
      )}`,
    );
  };

const handleOpenInvoice =
  (
    type:
      | "tax"
      | "proforma",
  ) => {
    const planId =
      Number(
        bookingMeta
          ?.planId ||
          0,
      );

    if (!planId) {
      toast.error(
        "Invoice is not available until the confirmed booking is loaded.",
      );

      return;
    }

    if (
      type === "tax" &&
      !shouldShowTaxInvoice
    ) {
      toast.error(
        "Tax Invoice is available only after the trip has ended.",
      );

      return;
    }

    if (
      type ===
        "proforma" &&
      !shouldShowProformaInvoice
    ) {
      toast.error(
        "Proforma Invoice is available only during the trip date range.",
      );

      return;
    }

    window.open(
      `/pdf-preview/invoice/${planId}?type=${encodeURIComponent(
        type,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

const handleOpenAvailableInvoice =
  () => {
    if (
      shouldShowTaxInvoice
    ) {
      handleOpenInvoice(
        "tax",
      );

      return;
    }

    if (
      shouldShowProformaInvoice
    ) {
      handleOpenInvoice(
        "proforma",
      );

      return;
    }

    toast.error(
      "No invoice is available for the current trip date.",
    );
  };

const scrollToOverviewSection =
  (
    id: string,
  ) => {
    document
      .getElementById(
        id,
      )
      ?.scrollIntoView({
        behavior:
          "smooth",
        block: "start",
      });
  };

const handleOverviewTab =
  (
    tab:
      OverviewTab,
  ) => {
    setActiveTab(
      tab,
    );

    switch (tab) {
      case "Financial Overview":
        scrollToOverviewSection(
          "accounts-financial-summary",
        );
        break;

      case "Itinerary":
      case "Documents":
        handleViewItinerary();
        break;

      case "Services & Components":
        scrollToOverviewSection(
          "accounts-service-components",
        );
        break;

      case "Invoices":
        scrollToOverviewSection(
          "accounts-invoices",
        );
        break;

      case "Vendor Bills":
        scrollToOverviewSection(
          "accounts-vendor-bills",
        );
        break;

      case "Payments":
        handleOpenAccountsManager();
        break;

      case "Ledgers":
        handleOpenLedger(
          "all",
        );
        break;

      case "GST":
        navigate(
          "/settings/gst",
        );
        break;

      case "Profitability":
        scrollToOverviewSection(
          "accounts-profitability",
        );
        break;

      case "Activity Log":
        scrollToOverviewSection(
          "accounts-payments",
        );
        break;
    }
  };

const handlePaymentSuccess =
  () => {
    setSelectedPaymentRow(
      null,
    );

    toast.success(
      "Payment recorded successfully.",
    );

    setSearchVersion(
      (current) =>
        current + 1,
    );
  };
return (
  <main className="min-h-screen bg-[#f5f8fc] text-[#17233d]">

    {/* =========================================================
        TOP HORIZONTAL SCROLLBAR
    ========================================================= */}
    <div
      ref={topHorizontalScrollRef}
      onScroll={handleTopHorizontalScroll}
      className="sticky top-0 z-30 overflow-x-auto border-b border-[#dbe4f1] bg-[#f5f8fc]"
    >
     <div className="h-px w-full" />
    </div>


    {/* =========================================================
        HORIZONTALLY SCROLLABLE PAGE CONTENT
    ========================================================= */}
    <div
  ref={contentHorizontalScrollRef}
  className="overflow-x-hidden"
>
  <div className="min-w-0 p-4 md:p-6">

    {/* =========================================================
        SEARCH
    ========================================================= */}
<section className="mb-4 rounded-lg border border-[#dbe4f1] bg-white p-4 shadow-sm">
  <div className="flex flex-col items-start gap-4">

    <div>
      <h1 className="text-xl font-bold">
        Accounts &amp; Finance Overview
      </h1>

      <p className="mt-1 text-xs text-[#71809a]">
  Booking, Agent &amp; Vendor financial control centre
</p>
    </div>

    <div className="flex w-full max-w-[620px] items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8290a7]" />

        <Input
          value={searchInput}
          onChange={(event) =>
            setSearchInput(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch();
            }
          }}
          className="h-9 pl-9"
         placeholder="Search booking/quote ID, vendor or agent"
        />
      </div>

      <Button
        onClick={handleSearch}
        disabled={loading}
        className="h-9 shrink-0 bg-[#245bea] hover:bg-[#1749c5]"
      >
        <Search className="mr-2 h-4 w-4" />

        {loading ? "Loading..." : "Search"}
      </Button>
    </div>
  </div>
{error && (
  <p className="mt-2 text-xs text-red-600">
    {error}
  </p>
)}

{notice && (
  <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
    {notice}
  </p>
)}
    </section>


    {/* =========================================================
        BOOKING HEADER
    ========================================================= */}
    <section className="mb-4 rounded-lg border border-[#dbe4f1] bg-white shadow-sm">

<div className="flex flex-col items-start gap-3 border-b border-[#e7edf5] p-4">

  <div>
    <div className="flex items-center gap-2">
      <h2 className="font-bold">
        Booking #{" "}
        {bookingMeta?.quoteId ||
          searchedQuoteId ||
          "No booking selected"}
      </h2>

      {bookingMeta && (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            bookingMeta.status === "Confirmed"
              ? "bg-emerald-100 text-emerald-700"
              : bookingMeta.status === "Latest"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
          }`}
        >
          {bookingMeta.status}
        </span>
      )}
    </div>

    <p className="mt-1 text-xs text-[#71809a]">
      Agent: {bookingMeta?.agent || "-"}

      <span className="mx-2">|</span>

      Guest: {bookingMeta?.guest || "-"}

      <span className="mx-2">|</span>

      Travel Date:{" "}
      {formatDisplayDate(
        bookingMeta?.startDate,
      )}{" "}
      -{" "}
      {formatDisplayDate(
        bookingMeta?.endDate,
      )}
    </p>
  </div>


  <div className="flex items-center gap-2">

    <Button
      variant="outline"
      size="sm"
      onClick={handleEditBooking}
      disabled={!bookingMeta?.planId}
    >
      Edit Booking
    </Button>


    <DropdownMenu>

      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          disabled={
            !bookingMeta?.planId ||
            (
              !shouldShowTaxInvoice &&
              !shouldShowProformaInvoice
            )
          }
          className="bg-[#245bea] hover:bg-[#1749c5]"
        >
          Generate Invoices

          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">

        {shouldShowTaxInvoice && (
          <DropdownMenuItem
            onClick={() =>
              handleOpenInvoice("tax")
            }
          >
            Tax Invoice
          </DropdownMenuItem>
        )}

        {shouldShowProformaInvoice && (
          <DropdownMenuItem
            onClick={() =>
              handleOpenInvoice("proforma")
            }
          >
            Proforma Invoice
          </DropdownMenuItem>
        )}

      </DropdownMenuContent>

    </DropdownMenu>

  </div>

</div>

      {/* =======================================================
          TABS
      ======================================================= */}
      <div className="flex gap-5 overflow-x-auto px-4 pt-3 text-xs font-semibold text-[#71809a]">

       {OVERVIEW_TABS.map(
  (tab) => (

    <button
      key={tab}
      type="button"
      onClick={() =>
        handleOverviewTab(
          tab,
        )
      }
      className={`whitespace-nowrap border-b-2 pb-3 ${
        activeTab === tab
          ? "border-[#245bea] text-[#245bea]"
          : "border-transparent"
      }`}
    >
      {tab}
    </button>

  ),
)}

      </div>
    </section>


    {/* =========================================================
        FINANCIAL SUMMARY CARDS
    ========================================================= */}
   <section
  id="accounts-financial-summary"
  className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
>

      {[
        [
          "Total Selling",
          totals.selling,
          "#fff7e6",
        ],
        [
          "Total Purchase",
          totals.purchase,
          "#eef5ff",
        ],
        [
          "Gross Profit",
          totals.profit,
          "#edfff4",
        ],
        [
          "Received",
          totals.received,
          "#f2efff",
        ],
        [
          "Pending from Agent",
          totals.pending,
          "#fff0f0",
        ],
        [
          "Vendor Payments",
          totals.vendorPayments,
          "#eefaff",
        ],
      ].map(([label, value, background]) => (

        <div
          key={String(label)}
          style={{
            backgroundColor: String(background),
          }}
          className="rounded-lg border border-white p-4 shadow-sm"
        >

          <p className="text-xs text-[#71809a]">
            {label}
          </p>

          <p className="mt-2 text-lg font-bold">
            {money(Number(value))}
          </p>

        </div>

      ))}

    </section>


    {/* =========================================================
        COMPONENTS + TRANSACTIONS
    ========================================================= */}
   <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-4">


      {/* =======================================================
          SERVICE COMPONENTS
      ======================================================= */}
<section
  id="accounts-service-components"
  className="overflow-hidden rounded-lg border border-[#dbe4f1] bg-white shadow-sm"
>

  {/* HEADER */}
  <div className="flex items-center justify-between border-b border-[#e7edf5] p-4">

    <h2 className="font-bold">
      Service Components ({rows.length})
    </h2>

    <Button
      size="sm"
      onClick={handleEditBooking}
      disabled={!bookingMeta?.planId}
      className="bg-[#245bea] hover:bg-[#1749c5]"
    >
      <Plus className="mr-1 h-4 w-4" />

      Add / Edit Components
    </Button>

  </div>


  {/* HORIZONTAL SCROLLER - ABOVE COLUMNS */}
  <div
    ref={serviceComponentsTopScrollRef}
    onScroll={handleServiceComponentsTopScroll}
    className="overflow-x-auto border-b border-[#e7edf5] bg-white"
  >
    <div className="h-px min-w-[820px]" />
  </div>


{/* TABLE CONTENT */}
<div
  ref={serviceComponentsTableScrollRef}
  onScroll={handleServiceComponentsTableScroll}
  className="overflow-x-hidden"
>
  <table className="w-full min-w-[820px] table-fixed text-left text-[11px] xl:text-xs">

    <thead className="bg-[#f7f9fc] text-[#71809a]">
              <tr>

{[
  ["#", "w-[4%]"],
  ["Type", "w-[8%]"],
  ["Supplier / Vendor", "w-[17%]"],
  ["Details", "w-[10%]"],
  ["Travel Date", "w-[11%]"],
  ["Selling", "w-[11%]"],
  ["Purchase", "w-[11%]"],
  ["Profit", "w-[10%]"],
  ["Status", "w-[8%]"],
  ["Payment", "w-[10%]"],
].map(([heading, width]) => (

  <th
    key={heading}
    className={`${width} px-2 py-3 font-semibold`}
  >
    {heading}
  </th>

))}

              </tr>
            </thead>


            <tbody>

              {rows.length === 0 ? (

                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-[#71809a]"
                  >
                 {loading
  ? "Loading booking details..."
  : bookingMeta &&
      (
        bookingMeta.status ===
          "Latest" ||
        bookingMeta.status ===
          "Confirmed"
      )
    ? `Itinerary ${bookingMeta.quoteId} was found in ${bookingMeta.status} Itineraries, but no Accounts & Finance components are available yet.`
    : searchedQuoteId
      ? `No account components found for ${searchedQuoteId}.`
      : "Search an itinerary to view its details."}
                  </td>
                </tr>

              ) : (

                rows.map((row, index) => {

              const selling =
  componentSelling(row);

const purchase =
  componentPurchase(row);

const profit =
  selling -
  purchase;

                  return (

                    <tr
                      key={`${row.componentType}-${row.id}-${index}`}
                      className="border-t border-[#edf1f6]"
                    >

                      <td className="px-3 py-3">
                        {index + 1}
                      </td>


                   <td className="px-3 py-3 capitalize">
  {row.componentType}
</td>

<td className="px-2 py-3 break-words">
  {componentSupplierName(
    row,
  )}
</td>

<td className="px-3 py-3 break-words">
  {componentDetails(
    row,
  )}
</td>


                      <td className="px-3 py-3">
                        {componentDate(row)}
                      </td>


                      <td className="px-3 py-3">
  {money(selling)}
</td>


                      <td className="px-3 py-3">
                        {money(purchase)}
                      </td>


                      <td
                        className={`px-3 py-3 font-semibold ${
                          profit >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {money(profit)}
                      </td>


                      <td className="px-3 py-3">

  <span
    className={`rounded px-2 py-1 ${
      statusStyles[
        row.status
      ]
    }`}
  >
    {row.status ===
    "paid"
      ? "Paid"
      : "Due"}
  </span>

</td>


<td className="px-3 py-3">

  <Button
    type="button"
    size="sm"
    variant="outline"
    disabled={
      row.status !==
        "due" ||
      toNumber(
        row.payable,
      ) <= 0
    }
    onClick={() =>
      setSelectedPaymentRow(
        row,
      )
    }
    className="h-7 text-[11px]"
  >
    {row.status ===
    "paid"
      ? "Paid"
      : "Pay Now"}
  </Button>

</td>

                    </tr>

                  );
                })

              )}

            </tbody>
          </table>

        </div>

      </section>


      {/* =======================================================
          RECEIPTS / VENDOR PAYMENTS
      ======================================================= */}
     <div className="grid min-w-0 grid-cols-1 gap-4">

        <FinanceList
          title="Receipts from Agent"
          icon={
            <WalletCards className="h-4 w-4 text-[#245bea]" />
          }
          rows={agentReceiptRows}
        />


       <FinanceList
  id="accounts-payments"
  title="Payments to Vendors"
  icon={
    <Clock3 className="h-4 w-4 text-[#f08b22]" />
  }
  rows={
    vendorPaymentRows
  }
  action="Manage Payments"
  onAction={
    handleOpenAccountsManager
  }
/>

      </div>

    </div>


    {/* =========================================================
        BOTTOM DATA BOXES
    ========================================================= */}
<div className="mt-4">

  {/* =======================================================
      BOTTOM BOXES HORIZONTAL SCROLLER
  ======================================================= */}
  <div
    ref={bottomCardsTopScrollRef}
    onScroll={handleBottomCardsTopScroll}
    className="mb-2 overflow-x-auto"
  >
    <div className="h-px min-w-[1248px]" />
  </div>


  {/* =======================================================
      BOTTOM DATA BOXES
  ======================================================= */}
  <div
    ref={bottomCardsContentRef}
    onScroll={handleBottomCardsContentScroll}
    className="overflow-x-hidden"
  >
    <section className="grid min-w-[1248px] grid-cols-4 gap-4">

      <SummaryPanel
        id="accounts-invoices"
        title="Invoices"
        action="Open Invoice"
        rows={invoiceRows}
        onAction={
          handleOpenAvailableInvoice
        }
        actionDisabled={
          !shouldShowTaxInvoice &&
          !shouldShowProformaInvoice
        }
      />


      <SummaryPanel
        id="accounts-vendor-bills"
        title="Vendor Bills"
        action="View Vendor Ledger"
        rows={vendorBillRows}
        onAction={() =>
          handleOpenLedger("all")
        }
      />


      <SummaryPanel
        title="Ledger Summary"
        action="View Detailed Ledgers"
        onAction={() =>
          handleOpenLedger("all")
        }
        rows={[
          [
            "Agent (Receivable)",
            totals.pending,
          ],
          [
            "Vendor (Payable)",
            totals.vendorPayable,
          ],
        ]}
      />


      <SummaryPanel
        id="accounts-profitability"
        title="Profitability (Booking Level)"
        action="View Profitability"
        onAction={
          handleOpenAccountsManager
        }
        rows={[
          [
            "Total Selling",
            totals.selling,
          ],
          [
            "Total Purchase",
            totals.purchase,
          ],
          [
            "Gross Profit",
            totals.profit,
          ],
        ]}
      />

    </section>
  </div>

</div>
    {loading && (
      <p className="mt-3 text-center text-xs text-[#71809a]">
        Refreshing booking data...
      </p>
    )}

{selectedPaymentRow && (
  <PayNowModal
    row={selectedPaymentRow}
    paymentModes={paymentModes}
    onClose={() =>
      setSelectedPaymentRow(null)
    }
    onSuccess={handlePaymentSuccess}
  />
)}

      </div>
    </div>
  </main>
);
}


/* ============================================================
   RECEIPTS / PAYMENTS CARD
============================================================ */

function FinanceList({
  id,
  title,
  icon,
  rows,
  action,
  onAction,
}: {
  id?: string;
  title: string;
  icon: ReactNode;
  rows: (string | number)[][];
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section
      id={id}
      className="min-w-[320px] rounded-lg border border-[#dbe4f1] bg-white shadow-sm"
    >

      <div className="flex items-center justify-between gap-2 border-b border-[#e7edf5] p-4">

        <div className="flex items-center gap-2">

          <span>
            {icon}
          </span>

          <h2 className="font-bold">
            {title}
          </h2>

        </div>


        {action &&
          onAction && (

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={
                onAction
              }
              className="h-7 text-[10px]"
            >
              {action}
            </Button>

          )}

      </div>

      <div className="p-3 text-xs">

        {rows.length === 0 ? (

          <p className="py-5 text-center text-[#71809a]">
            No transaction data available.
          </p>

        ) : (

          rows.map((row, index) => (

            <div
              key={index}
              className="flex items-center justify-between gap-3 border-b border-[#edf1f6] py-2 last:border-0"
            >

              <span>
                {row[0]}

                <br />

                <span className="text-[#71809a]">
                  {row[1]}
                </span>
              </span>


              <span className="text-right font-semibold">

                {money(
                  Number(row[2] || 0),
                )}

                <br />

                <span className="font-normal text-[#71809a]">
                  {row[3]}
                </span>

              </span>

            </div>

          ))

        )}

      </div>

    </section>
  );
}


/* ============================================================
   SUMMARY CARD
============================================================ */
function SummaryPanel({
  id,
  title,
  action,
  rows,
  onAction,
  actionDisabled = false,
}: {
  id?: string;
  title: string;
  action: string;
  rows: (string | number)[][];
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <section
      id={id}
      className="min-w-[300px] rounded-lg border border-[#dbe4f1] bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-2">

        <h2 className="font-bold">
          {title}
        </h2>

    <Button
  type="button"
  variant="outline"
  size="sm"
  onClick={
    onAction
  }
  disabled={
    actionDisabled ||
    !onAction
  }
  className="h-7 text-[10px]"
>
  {action}
</Button>

      </div>


      {rows.length === 0 ? (

        <p className="py-4 text-center text-xs text-[#71809a]">
          No data available.
        </p>

      ) : (

        rows.map((row, index) => (

          <div
            key={index}
            className="flex justify-between gap-3 border-b border-[#edf1f6] py-2 text-xs last:border-0"
          >

            <span>
              {row[0]}
            </span>

            <span className="text-right font-semibold">

              {typeof row[1] === "number"
                ? money(row[1])
                : row[1]}

            </span>

          </div>

        ))

      )}


      <div className="mt-3 flex items-center gap-1 text-[10px] text-[#245bea]">

        <CheckCircle2 className="h-3 w-3" />

        Updated just now

      </div>

    </section>
  );
}
