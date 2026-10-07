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
  downloadAuthenticatedFile,
} from "@/services/itineraryPdf";

import {
  downloadTableExcel,
} from "@/utils/tableExcel";

import {
  PayNowModal,
} from "./PayNowModal";

import {
  BulkPayNowModal,
} from "./BulkPayNowModal";

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
 * ============================================================
 * SERVICE COMPONENT BULK PAYMENT HELPERS
 * ============================================================
 */

const paymentRowKey = (
  row: AccountsRow,
) =>
  `${row.componentType}:${row.headerId}:${row.id}`;


const paymentSupplierGroupKey = (
  row: AccountsRow,
) => {
  const vendorId =
    Number(
      row.vendorId || 0,
    );

  if (
    vendorId > 0
  ) {
    return `${row.componentType}:id:${vendorId}`;
  }

  return `${row.componentType}:name:${componentSupplierName(
    row,
  )
    .trim()
    .toLowerCase()}`;
};


const isPayablePaymentRow = (
  row: AccountsRow,
) =>
  row.status ===
    "due" &&
  toNumber(
    row.payable,
  ) > 0;


/*
 * Accounts Overview:
 * Keep component details readable and structured.
 */
const componentDetails = (
  row: AccountsRow,
): ReactNode => {
  if (
    row.componentType !==
    "vehicle"
  ) {
    return (
      <span className="capitalize">
        {row.componentType ||
          "Component"}
      </span>
    );
  }

  const vehicleType =
    usableText(
      row.vehicleTypeName,
    );

  const rawVehicleName =
    usableText(
      row.vehicleName,
    );

  /*
   * API values can already be like:
   * "Vehicle #323"
   *
   * Since the UI itself now shows the
   * "Vehicle:" label, avoid:
   * Vehicle: Vehicle #323
   */
  const vehicleName =
    rawVehicleName === "-"
      ? "-"
      : rawVehicleName
          .replace(
            /^vehicle\s*/i,
            "",
          )
          .trim() || rawVehicleName;

  const vendorName =
    componentSupplierName(
      row,
    );

  const branchName =
    usableText(
      row.vendorBranchName,
    );

  /*
   * Do not repeat branch when backend
   * returns the same value as vendor.
   */
  const showBranch =
    branchName !== "-" &&
    branchName.toLowerCase() !==
      vendorName.toLowerCase();

  return (
    <div className="space-y-1.5 normal-case leading-5">

      <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-x-2">
        <span className="whitespace-nowrap font-semibold text-[#71809a]">
          Vehicle Type:
        </span>

        <span className="min-w-0 break-words text-[#1f2937]">
          {vehicleType}
        </span>
      </div>


      <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-x-2">
        <span className="whitespace-nowrap font-semibold text-[#71809a]">
          Vehicle:
        </span>

        <span className="min-w-0 break-words text-[#1f2937]">
          {vehicleName}
        </span>
      </div>


      <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-x-2">
        <span className="whitespace-nowrap font-semibold text-[#71809a]">
          Vendor:
        </span>

        <span className="min-w-0 break-words text-[#1f2937]">
          {vendorName}
        </span>
      </div>


      {showBranch && (
        <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-x-2">
          <span className="whitespace-nowrap font-semibold text-[#71809a]">
            Branch:
          </span>

          <span className="min-w-0 break-words text-[#1f2937]">
            {branchName}
          </span>
        </div>
      )}

    </div>
  );
};


/*
 * Text-only version of component Details.
 *
 * Use this for Excel/downloads because the normal
 * componentDetails() function returns React JSX.
 */
const componentDetailsText = (
  row: AccountsRow,
): string => {
  if (
    row.componentType !==
    "vehicle"
  ) {
    return String(
      row.componentType ||
        "Component",
    );
  }


  const vehicleType =
    usableText(
      row.vehicleTypeName,
    );


  const rawVehicleName =
    usableText(
      row.vehicleName,
    );


  const vehicleName =
    rawVehicleName === "-"
      ? "-"
      : rawVehicleName
          .replace(
            /^vehicle\s*/i,
            "",
          )
          .trim() ||
        rawVehicleName;


  const vendorName =
    componentSupplierName(
      row,
    );


  const branchName =
    usableText(
      row.vendorBranchName,
    );


  const values = [
    `Vehicle Type: ${vehicleType}`,
    `Vehicle: ${vehicleName}`,
    `Vendor: ${vendorName}`,
  ];


  if (
    branchName !== "-" &&
    branchName.toLowerCase() !==
      vendorName.toLowerCase()
  ) {
    values.push(
      `Branch: ${branchName}`,
    );
  }


  return values.join(
    " | ",
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

type MatchedInvoice = {
  planId: number;
  quoteId: string;
  data: any;
};

const [
  matchedInvoices,
  setMatchedInvoices,
] = useState<MatchedInvoice[]>([]);

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


/*
 * Multiple Service Component payment tasks.
 */
const [
  selectedPaymentRows,
  setSelectedPaymentRows,
] =
  useState<
    AccountsRow[]
  >([]);


const [
  bulkPaymentModalOpen,
  setBulkPaymentModalOpen,
] =
  useState(false);


const [
  paymentSelectionError,
  setPaymentSelectionError,
] =
  useState("");


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


/*
 * ============================================================
 * SERVICE COMPONENT BULK PAYMENT SELECTION
 * ============================================================
 */

const selectedPaymentKeySet =
  useMemo(
    () =>
      new Set(
        selectedPaymentRows.map(
          paymentRowKey,
        ),
      ),
    [selectedPaymentRows],
  );


const duePaymentRows =
  useMemo(
    () =>
      rows.filter(
        isPayablePaymentRow,
      ),
    [rows],
  );


const selectedPaymentGroupKey =
  selectedPaymentRows.length >
  0
    ? paymentSupplierGroupKey(
        selectedPaymentRows[0],
      )
    : "";


const dueRowsForSelectedVendor =
  useMemo(() => {
    if (
      !selectedPaymentGroupKey
    ) {
      return [];
    }

    return duePaymentRows.filter(
      (row) =>
        paymentSupplierGroupKey(
          row,
        ) ===
        selectedPaymentGroupKey,
    );
  }, [
    duePaymentRows,
    selectedPaymentGroupKey,
  ]);


const allSelectedVendorRowsSelected =
  dueRowsForSelectedVendor.length >
    0 &&
  dueRowsForSelectedVendor.every(
    (row) =>
      selectedPaymentKeySet.has(
        paymentRowKey(
          row,
        ),
      ),
  );


const selectedPaymentTotal =
  useMemo(
    () =>
      selectedPaymentRows.reduce(
        (
          total,
          row,
        ) =>
          total +
          toNumber(
            row.payable,
          ),
        0,
      ),
    [selectedPaymentRows],
  );


const togglePaymentRow = (
  row: AccountsRow,
) => {
  if (
    !isPayablePaymentRow(
      row,
    )
  ) {
    return;
  }


  const key =
    paymentRowKey(
      row,
    );


  /*
   * Unselect.
   */
  if (
    selectedPaymentKeySet.has(
      key,
    )
  ) {
    setSelectedPaymentRows(
      (current) =>
        current.filter(
          (item) =>
            paymentRowKey(
              item,
            ) !== key,
        ),
    );

    setPaymentSelectionError(
      "",
    );

    return;
  }


  /*
   * One bulk payment cannot contain
   * different Vendors/Suppliers.
   */
  if (
    selectedPaymentRows.length >
      0 &&
    paymentSupplierGroupKey(
      row,
    ) !==
      paymentSupplierGroupKey(
        selectedPaymentRows[0],
      )
  ) {
    setPaymentSelectionError(
      "Multiple payment tasks must belong to the same vendor.",
    );

    return;
  }


  setSelectedPaymentRows(
    (current) => [
      ...current,
      row,
    ],
  );

  setPaymentSelectionError(
    "",
  );
};


const toggleSelectAllDuePayments =
  () => {
    if (
      duePaymentRows.length ===
      0
    ) {
      return;
    }


    /*
     * Vendor already selected:
     * select/unselect all Due tasks
     * belonging to that Vendor.
     */
    if (
      selectedPaymentRows.length >
      0
    ) {
      setSelectedPaymentRows(
        allSelectedVendorRowsSelected
          ? []
          : dueRowsForSelectedVendor,
      );

      setPaymentSelectionError(
        "",
      );

      return;
    }


    /*
     * Nothing selected yet.
     *
     * Automatically Select All only when
     * all visible Due rows belong to one Vendor.
     */
    const grouped =
      new Map<
        string,
        AccountsRow[]
      >();


    duePaymentRows.forEach(
      (row) => {
        const key =
          paymentSupplierGroupKey(
            row,
          );

        const group =
          grouped.get(
            key,
          ) || [];

        group.push(
          row,
        );

        grouped.set(
          key,
          group,
        );
      },
    );


    if (
      grouped.size > 1
    ) {
      setPaymentSelectionError(
        "Select one vendor task first, then Select All Due will select all due tasks for that vendor.",
      );

      return;
    }


    setSelectedPaymentRows(
      Array.from(
        grouped.values(),
      )[0] || [],
    );

    setPaymentSelectionError(
      "",
    );
  };


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
  setMatchedInvoices([]);
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
setMatchedInvoices([]);


/*
 * A fresh search must not retain payment
 * tasks selected from the previous result.
 */
setSelectedPaymentRows([]);
setBulkPaymentModalOpen(false);
setPaymentSelectionError("");


    try {
/*
 * ============================================================
 * ACCOUNTS SEARCH + ITINERARY LOOKUP
 * ============================================================
 *
 * IMPORTANT:
 *
 * Keep Accounts search on the backend's general `search`
 * parameter.
 *
 * That backend flow already resolves:
 * - confirmed Booking ID
 * - original Quote ID
 * - Agent
 * - Vehicle Vendor
 * - Vendor Code / Branch
 * - Hotel / Supplier
 *
 * It also repairs missing Accounts component rows for
 * matching confirmed itineraries before returning them.
 */
const filters = {
  status: "all" as const,

  search:
    searchedQuoteId,
};


const [
  accountsRows,
  itineraryLookup,
] =
  await Promise.all([
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
const normalizedSearch =
  normalizeQuoteId(
    searchedQuoteId,
  );

/*
 * Accounts search may be:
 * - exact booking / quote
 * - vendor
 * - agent
 *
 * Only use the ledger Quote filter when this
 * really is an exact booking search.
 */
const exactAccountsRow =
  accountsRows.find(
    (row) =>
      normalizeQuoteId(
        row.quoteId,
      ) === normalizedSearch,
  );

const isBookingSearch =
  Boolean(
    itineraryLookup ||
      exactAccountsRow,
  );

const resolvedQuoteId =
  usableText(
    itineraryLookup?.quoteId,
    exactAccountsRow?.quoteId,
  );

const ledgerBaseFilters = {
  quoteId:
    isBookingSearch &&
    resolvedQuoteId !== "-"
      ? resolvedQuoteId
      : "",

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

if (cancelled) {
  return;
}


/*
 * After Accounts repair has completed, load all
 * aggregate/ledger views from the persisted rows.
 */
const accountsSummary =
  await fetchAccountsSummary(
    filters,
  ).catch(
    (summaryError) => {
      console.error(
        "Accounts summary failed:",
        summaryError,
      );

      return null;
    },
  );

let vendorLedgers: LedgerRow[] = [];
let agentLedgers: LedgerRow[] = [];


/*
 * Exact Booking / Quote search:
 * preserve the current behaviour.
 */
if (isBookingSearch) {
  [
    vendorLedgers,
    agentLedgers,
  ] = await Promise.all([
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
} else {
  /*
   * Vendor / Agent search.
   *
   * Accounts search has already identified the
   * bookings/components that belong to the search.
   *
   * Load their persisted ledgers booking-by-booking
   * instead of throwing the ledger information away.
   */
  const matchedQuoteIds =
    Array.from(
      new Set(
        accountsRows
          .map((row) =>
            String(
              row.quoteId || "",
            ).trim(),
          )
          .filter(Boolean),
      ),
    );


  const matchedComponentKeys =
    new Set(
      accountsRows.map(
        (row) =>
          `${normalizeQuoteId(
            row.quoteId,
          )}:${row.componentType}:${row.id}`,
      ),
    );


  const ledgerGroups =
    await Promise.all(
      matchedQuoteIds.map(
        (quoteId) =>
          fetchLedgerFromApi({
            ...ledgerBaseFilters,

            quoteId,

            componentType: "all",
          }).catch(
            (ledgerError) => {
              console.error(
                `Ledger failed for ${quoteId}:`,
                ledgerError,
              );

              return [] as LedgerRow[];
            },
          ),
      ),
    );


  vendorLedgers =
    ledgerGroups
      .flat()
      .filter((ledgerRow) => {
        if (
          ledgerRow.componentType ===
          "agent"
        ) {
          return false;
        }

        if (
          !ledgerRow.componentDetailId
        ) {
          return false;
        }

        return matchedComponentKeys.has(
          `${normalizeQuoteId(
            ledgerRow.bookingId,
          )}:${ledgerRow.componentType}:${ledgerRow.componentDetailId}`,
        );
      });


  /*
   * Do not populate agentLedgers here.
   *
   * Vendor/Agent searches can represent multiple
   * bookings, so Overview's existing headerTotals
   * must continue doing the aggregate calculation.
   */
  agentLedgers = [];
}

if (
  !isBookingSearch &&
  vendorLedgers.length > 0
) {
  const invoiceTargetMap =
    new Map<
      number,
      {
        planId: number;
        quoteId: string;
      }
    >();


  vendorLedgers.forEach(
    (ledgerRow) => {
      const targetPlanId =
        Number(
          ledgerRow.itineraryPlanId ||
            0,
        );

      if (!targetPlanId) {
        return;
      }

      if (
        !invoiceTargetMap.has(
          targetPlanId,
        )
      ) {
        invoiceTargetMap.set(
          targetPlanId,
          {
            planId:
              targetPlanId,

            quoteId:
              String(
                ledgerRow.bookingId ||
                  "",
              ).trim(),
          },
        );
      }
    },
  );


  const invoiceTargets =
    Array.from(
      invoiceTargetMap.values(),
    );


  const loadedInvoices =
    await Promise.all(
      invoiceTargets.map(
        async (target) => {
          try {
            const data =
              await fetchAccountsInvoiceData(
                target.planId,
              );

            return {
              planId:
                target.planId,

              quoteId:
                target.quoteId,

              data,
            };
          } catch (
            invoiceError
          ) {
            console.error(
              `Invoice data failed for ${target.quoteId}:`,
              invoiceError,
            );

            return null;
          }
        },
      ),
    );


  if (!cancelled) {
    setMatchedInvoices(
      loadedInvoices.filter(
        (
          invoice,
        ): invoice is MatchedInvoice =>
          invoice !== null,
      ),
    );
  }
}
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
  itineraryLookup?.status ===
  "Confirmed";

if (isBookingSearch) {
  const bookingRow =
    exactAccountsRow ||
    firstRow;

  const initialMeta: BookingMeta = {
    quoteId:
      usableText(
        itineraryLookup?.quoteId,
        bookingRow?.quoteId,
        firstAgentLedger?.bookingId,
      ),

    planId,

    status:
      itineraryLookup?.status ||
      "Accounts",

    agent:
      isConfirmedLookup
        ? usableText(
            itineraryLookup?.agent,
            bookingRow?.agent,
            financeAgent,
          )
        : usableText(
            bookingRow?.agent,
            financeAgent,
            itineraryLookup?.agent,
          ),

    guest:
      isConfirmedLookup
        ? usableText(
            itineraryLookup?.guest,
            financeGuest,
          )
        : usableText(
            financeGuest,
            itineraryLookup?.guest,
          ),

    startDate:
      isConfirmedLookup
        ? usableText(
            itineraryLookup?.startDate,
            financeStartDate,
          )
        : usableText(
            financeStartDate,
            itineraryLookup?.startDate,
          ),

    endDate:
      isConfirmedLookup
        ? usableText(
            itineraryLookup?.endDate,
            financeEndDate,
          )
        : usableText(
            financeEndDate,
            itineraryLookup?.endDate,
          ),
  };

  setBookingMeta(
    initialMeta,
  );
} else {
  /*
   * Vendor / Agent search.
   *
   * There is no single booking to put in the
   * booking header.
   */
  setBookingMeta(null);
}

const hasFinanceData =
  accountsRows.length > 0 ||
  vendorLedgers.length > 0 ||
  agentLedgers.length > 0;

if (
  !itineraryLookup &&
  !hasFinanceData
) {
  setError(
    `No Accounts & Finance data found for "${searchedQuoteId}".`,
  );

  setNotice("");
} else if (
  itineraryLookup &&
  !hasFinanceData
) {
  /*
   * The itinerary exists, but its Accounts
   * records have not been generated yet.
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
  isBookingSearch &&
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
       setMatchedInvoices([]);

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


/*
 * Number of unique bookings returned by
 * an Agent / Vendor search.
 */
const matchedBookingCount =
  useMemo(
    () =>
      new Set(
        rows
          .map((row) =>
            String(
              row.quoteId || "",
            ).trim(),
          )
          .filter(Boolean),
      ).size,
    [rows],
  );


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
    ? componentSupplierName(
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
  useMemo(() => {
    const ledgerBills =
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
                ? componentSupplierName(
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
        );


    if (
      ledgerBills.length > 0
    ) {
      return ledgerBills;
    }


    /*
     * Safe fallback for Agent / Vendor searches.
     */
    return rows.map(
      (row) => {
        const balance =
          toNumber(
            row.payable,
          );

        return [
          `${String(
            row.componentType,
          ).toUpperCase()} · ${componentSupplierName(
            row,
          )}${
            balance > 0
              ? ` · Due ${money(
                  balance,
                )}`
              : " · Paid"
          }`,

          toNumber(
            row.amount,
          ),
        ];
      },
    );
  }, [
    vendorLedgerRows,
    accountRowByComponent,
    rows,
  ]);

const invoiceRows:
  (string | number)[][] =
  useMemo(() => {
    /*
     * Exact booking search.
     */
    if (invoiceData) {
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
    }


    /*
     * Vendor / Agent search.
     *
     * There can be several bookings, so show
     * one invoice summary per matching booking.
     */
    return matchedInvoices.map(
      ({
        quoteId,
        data,
      }) => {
        const invoiceNo =
          String(
            data
              ?.meta
              ?.invoiceNo ||
              quoteId ||
              "-",
          );

        const invoiceDate =
          formatDisplayDate(
            data
              ?.meta
              ?.invoiceDate,
          );

        return [
          `${invoiceNo} · ${invoiceDate}`,

          toNumber(
            data
              ?.totals
              ?.totalAmount,
          ),
        ];
      },
    );
  }, [
    invoiceData,
    matchedInvoices,
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

  const handleOpenPayments =
  () => {
    const params =
      new URLSearchParams();


    /*
     * Exact Booking / Quote search.
     */
    if (
      bookingMeta
        ?.quoteId
    ) {
      params.set(
        "quoteId",
        bookingMeta.quoteId,
      );
    } else if (
      searchedQuoteId.trim()
    ) {
      /*
       * Vendor / Agent search.
       *
       * The Payments page must use its general
       * search filter, not incorrectly treat the
       * Vendor name as a Quote ID.
       */
      params.set(
        "search",
        searchedQuoteId.trim(),
      );
    }


    const query =
      params.toString();


    navigate(
      `/accounts-payments${
        query
          ? `?${query}`
          : ""
      }`,
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

    /*
     * Keep the existing preview functionality.
     *
     * This is still used by the Overview
     * "Open Invoice" action.
     */
    window.open(
      `/pdf-preview/invoice/${planId}?type=${encodeURIComponent(
        type,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  };


/*
 * Generate / download the actual Invoice PDF.
 *
 * The existing Itinerary service already uses:
 *
 * GET /itineraries/:id/invoice-pdf?type=tax|proforma
 *
 * so we do not need another API or backend change.
 */
const handleDownloadInvoicePdf =
  async (
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
        "Invoice PDF is not available until the confirmed booking is loaded.",
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


    try {
      await ItineraryService
        .downloadInvoicePdf(
          planId,
          type,
        );
    } catch (
      downloadError
    ) {
      console.error(
        "Invoice PDF download failed:",
        downloadError,
      );

      toast.error(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to generate Invoice PDF.",
      );
    }
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
  handleOpenPayments();
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
const handleDownloadPurchaseCostPdf =
  async (
    row: AccountsRow,
  ) => {
    const headerId =
      Number(
        row.headerId ||
          0,
      );


    if (!headerId) {
      toast.error(
        "Accounts booking is not available for this component.",
      );

      return;
    }


    const safeQuoteId =
      String(
        row.quoteId ||
          `booking-${headerId}`,
      )
        .replace(
          /[^a-zA-Z0-9_-]+/g,
          "-",
        )
        .replace(
          /-+/g,
          "-",
        );


    try {
      await downloadAuthenticatedFile(
        `accounts-manager/purchase-cost-pdf/${headerId}`,

        `purchase-cost-${safeQuoteId}.pdf`,
      );
    } catch (
      error: any
    ) {
      console.error(
        "Purchase Cost PDF download failed:",
        error,
      );

      toast.error(
        error?.message ||
          "Unable to download Purchase Cost PDF.",
      );
    }
  };


const handleDownloadServiceComponentsExcel =
  async () => {
    if (
      rows.length === 0
    ) {
      toast.error(
        "No Service Components are available to export.",
      );

      return;
    }


    const sourceName =
      bookingMeta?.quoteId ||
      searchedQuoteId ||
      "accounts";


    const safeName =
      String(
        sourceName,
      )
        .replace(
          /[^a-zA-Z0-9_-]+/g,
          "-",
        )
        .replace(
          /-+/g,
          "-",
        )
        .replace(
          /^-|-$/g,
          "",
        ) ||
      "accounts";


    try {
      await downloadTableExcel<AccountsRow>({
        fileName:
          `service-components-${safeName}.xlsx`,

        sheetName:
          "Service Components",

        rows,

        columns: [
          {
            header:
              "#",

            value:
              (
                _row,
                index,
              ) =>
                index + 1,

            width:
              6,
          },

          /*
           * Keep booking context in Excel.
           * This matters for Vendor / Agent searches
           * where several bookings can be returned.
           */
          {
            header:
              "Booking / Quote ID",

            value:
              (row) =>
                row.quoteId,

            width:
              22,
          },

          {
            header:
              "Agent",

            value:
              (row) =>
                row.agent ||
                "-",

            width:
              24,
          },

          {
            header:
              "Type",

            value:
              (row) =>
                row.componentType,

            width:
              14,
          },

          {
            header:
              "Supplier / Vendor",

            value:
              (row) =>
                componentSupplierName(
                  row,
                ),

            width:
              30,
          },

      {
  header:
    "Details",

  value:
    (row) =>
      componentDetailsText(
        row,
      ),

  width:
    40,
},

          {
            header:
              "Travel Date",

            value:
              (row) =>
                componentDate(
                  row,
                ),

            width:
              16,
          },

          {
            header:
              "Selling",

            value:
              (row) =>
                componentSelling(
                  row,
                ),

            width:
              16,
          },

          {
            header:
              "Purchase",

            value:
              (row) =>
                componentPurchase(
                  row,
                ),

            width:
              16,
          },

          {
            header:
              "Profit",

            value:
              (row) =>
                componentSelling(
                  row,
                ) -
                componentPurchase(
                  row,
                ),

            width:
              16,
          },

          {
            header:
              "Status",

            value:
              (row) =>
                row.status ===
                "paid"
                  ? "Paid"
                  : "Due",

            width:
              12,
          },

          {
            header:
              "Payment",

            value:
              (row) =>
                row.status ===
                "paid"
                  ? "Paid"
                  : `Due - INR ${toNumber(
                      row.payable,
                    ).toLocaleString(
                      "en-IN",
                    )}`,

            width:
              20,
          },
        ],
      });


      toast.success(
        "Service Components Excel downloaded.",
      );
    } catch (
      error
    ) {
      console.error(
        "Service Components Excel download failed:",
        error,
      );

      toast.error(
        "Unable to download Service Components Excel.",
      );
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


const handleBulkPaymentSuccess =
  () => {
    setBulkPaymentModalOpen(
      false,
    );

    setSelectedPaymentRows(
      [],
    );

    setPaymentSelectionError(
      "",
    );

    toast.success(
      "Selected payments recorded successfully.",
    );

    /*
     * Reload Overview so every component's
     * Paid / Balance / Status and transaction
     * history immediately reflect the payment.
     */
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
  {bookingMeta
    ? `Booking # ${bookingMeta.quoteId}`
    : rows.length > 0
      ? `Accounts Results: ${searchedQuoteId}`
      : "No booking selected"}
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

{bookingMeta ? (
  <p className="mt-1 text-xs text-[#71809a]">
    Agent: {bookingMeta.agent || "-"}

    <span className="mx-2">|</span>

    Guest: {bookingMeta.guest || "-"}

    <span className="mx-2">|</span>

    Travel Date:{" "}
    {formatDisplayDate(
      bookingMeta.startDate,
    )}{" "}
    -{" "}
    {formatDisplayDate(
      bookingMeta.endDate,
    )}
  </p>
) : rows.length > 0 ? (
  <p className="mt-1 text-xs text-[#71809a]">
    {matchedBookingCount} booking
    {matchedBookingCount === 1
      ? ""
      : "s"}{" "}
    matched this Agent / Vendor search
  </p>
) : (
  <p className="mt-1 text-xs text-[#71809a]">
    Search a booking, vendor or agent
    to view financial details.
  </p>
)}
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
        void handleDownloadInvoicePdf(
          "tax",
        )
      }
    >
      Tax Invoice
    </DropdownMenuItem>
  )}


  {shouldShowProformaInvoice && (
    <DropdownMenuItem
      onClick={() =>
        void handleDownloadInvoicePdf(
          "proforma",
        )
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

<div className="flex items-center justify-between border-b border-[#e7edf5] p-4">

  <h2 className="font-bold">
    Service Components ({rows.length})
  </h2>


  <div className="flex items-center gap-2">

    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={
        rows.length === 0
      }
      onClick={() =>
        void handleDownloadServiceComponentsExcel()
      }
    >
      Download Excel
    </Button>


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

</div>


{/* =======================================================
    BULK PAYMENT SELECTION ERROR
======================================================= */}
{paymentSelectionError && (
  <div className="border-b border-[#e7edf5] bg-amber-50 px-4 py-2 text-xs text-amber-700">
    {paymentSelectionError}
  </div>
)}


{/* =======================================================
    SELECTED PAYMENT TASKS
======================================================= */}
{selectedPaymentRows.length >
  0 && (
  <div className="border-b border-[#e7edf5] bg-[#fbfcff] p-3">

    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

      <div>
        <p className="text-sm font-bold text-[#17233d]">
          Selected Payment Tasks (
          {selectedPaymentRows.length})
        </p>

        <p className="mt-1 text-[11px] text-[#71809a]">
          Vendor:{" "}
          {componentSupplierName(
            selectedPaymentRows[0],
          )}
        </p>
      </div>


      <div className="flex items-center gap-3">

        <div className="text-right">
          <p className="text-[10px] text-[#71809a]">
            Selected Total
          </p>

          <p className="font-bold text-[#17233d]">
            {money(
              selectedPaymentTotal,
            )}
          </p>
        </div>


        <Button
          type="button"
          size="sm"
          onClick={() =>
            setBulkPaymentModalOpen(
              true,
            )
          }
          className="bg-[#245bea] hover:bg-[#1749c5]"
        >
          Pay Selected
        </Button>

      </div>

    </div>


    <div className="max-h-[220px] overflow-auto rounded-md border border-[#e1e7f0] bg-white">

      <table className="w-full min-w-[720px] text-left text-[11px]">

        <thead className="sticky top-0 z-10 bg-[#f7f9fc] text-[#71809a]">
          <tr>

            {[
              "Booking ID",
              "Component",
              "Vendor",
              "Travel Date",
              "Payable",
            ].map(
              (heading) => (
                <th
                  key={heading}
                  className="px-3 py-2 font-semibold"
                >
                  {heading}
                </th>
              ),
            )}

          </tr>
        </thead>


        <tbody>

          {selectedPaymentRows.map(
            (row) => (
              <tr
                key={`overview-selected-${paymentRowKey(
                  row,
                )}`}
                className="border-t border-[#edf1f6]"
              >

                <td className="px-3 py-2">
                  {row.quoteId}
                </td>

                <td className="px-3 py-2 capitalize">
                  {row.componentType}
                </td>

                <td className="px-3 py-2">
                  {componentSupplierName(
                    row,
                  )}
                </td>

                <td className="px-3 py-2">
                  {componentDate(
                    row,
                  )}
                </td>

                <td className="px-3 py-2 font-semibold">
                  {money(
                    toNumber(
                      row.payable,
                    ),
                  )}
                </td>

              </tr>
            ),
          )}

        </tbody>

      </table>

    </div>


    <div className="mt-2 flex items-center justify-between text-[11px]">

      <span className="text-[#71809a]">
        {selectedPaymentRows.length} Tasks Selected
      </span>

      <span className="font-semibold text-[#17233d]">
        Total:{" "}
        {money(
          selectedPaymentTotal,
        )}
      </span>

    </div>

  </div>
)}


{/* HORIZONTAL SCROLLER - ABOVE COLUMNS */}
<div
  ref={serviceComponentsTopScrollRef}
    onScroll={handleServiceComponentsTopScroll}
    className="overflow-x-auto border-b border-[#e7edf5] bg-white"
  >
<div className="h-px min-w-[1240px]" />
  </div>


{/* TABLE CONTENT */}
<div
  ref={serviceComponentsTableScrollRef}
  onScroll={handleServiceComponentsTableScroll}
  className="overflow-x-hidden"
>
<table className="w-full min-w-[1240px] table-fixed text-left text-[11px] xl:text-xs">

    <thead className="bg-[#f7f9fc] text-[#71809a]">
              <tr>

  <th className="w-[10%] px-2 py-3 font-semibold">

    <label className="flex items-center gap-2 whitespace-nowrap">

      <input
        type="checkbox"
        checked={
          allSelectedVendorRowsSelected
        }
        onChange={
          toggleSelectAllDuePayments
        }
        disabled={
          duePaymentRows.length ===
          0
        }
        className="h-4 w-4"
      />

      Select All Due

    </label>

  </th>


{[
  ["#", "w-[4%]"],
  ["Type", "w-[7%]"],
  ["Supplier / Vendor", "w-[14%]"],
  ["Details", "w-[18%]"],
  ["Travel Date", "w-[10%]"],
  ["Selling", "w-[8%]"],
  ["Purchase", "w-[8%]"],
  ["Profit", "w-[7%]"],
  ["Status", "w-[6%]"],
  ["Payment", "w-[8%]"],
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
  colSpan={11}
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

  {/* Bulk Payment Checkbox */}
  <td className="px-3 py-3">

    <input
      type="checkbox"
      checked={
        selectedPaymentKeySet.has(
          paymentRowKey(
            row,
          ),
        )
      }
      disabled={
        !isPayablePaymentRow(
          row,
        )
      }
      onChange={() =>
        togglePaymentRow(
          row,
        )
      }
      className="h-4 w-4"
    />

  </td>


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

<td className="px-3 py-3 align-top">
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

  <button
    type="button"
    onClick={() =>
      void handleDownloadPurchaseCostPdf(
        row,
      )
    }
    className="
      font-semibold
      text-[#245bea]
      underline
      decoration-dotted
      underline-offset-4
      transition-colors
      hover:text-[#1749c5]
    "
    title="Download complete Purchase Cost PDF"
  >
    {money(
      purchase,
    )}
  </button>

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
    rows={
      agentReceiptRows
    }
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
      handleOpenPayments
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
      setSelectedPaymentRow(
        null,
      )
    }
    onSuccess={
      handlePaymentSuccess
    }
  />
)}


{bulkPaymentModalOpen &&
  selectedPaymentRows.length >
    0 && (
    <BulkPayNowModal
      rows={
        selectedPaymentRows
      }
      paymentModes={
        paymentModes
      }
      onClose={() =>
        setBulkPaymentModalOpen(
          false,
        )
      }
      onSuccess={
        handleBulkPaymentSuccess
      }
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
