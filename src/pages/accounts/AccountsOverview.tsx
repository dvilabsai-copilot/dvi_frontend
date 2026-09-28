import {
  useEffect,
  useMemo,
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
  getConfirmedItineraries,
} from "@/services/itineraryBackOffice";

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
  status: "Confirmed" | "Accounts";
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

export function AccountsOverview() {
  const navigate = useNavigate();

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
  const value = searchInput.trim();

  if (!value) {
    setError(
      "Enter a booking or quote ID first.",
    );
    return;
  }

  setError("");
  setSearchedQuoteId(value);
  setSearchVersion((current) => current + 1);
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

    return () => {
      cancelled = true;
    };
  }

  async function loadAccountsOverview() {
    setLoading(true);
    setError("");

    setRows([]);
    setSummary(null);
    setVendorLedgerRows([]);
    setAgentLedgerRows([]);
    setBookingMeta(null);
    setInvoiceData(null);

    try {
      const filters = {
        status: "all" as const,
        quoteId: searchedQuoteId,
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

      const [
        accountsRows,
        accountsSummary,
        vendorLedgers,
        agentLedgers,
        confirmedResponse,
      ] = await Promise.all([
        fetchAccountsList(filters),

        fetchAccountsSummary(
          filters,
        ).catch((summaryError) => {
          console.error(
            "Accounts summary failed:",
            summaryError,
          );

          return null;
        }),

        fetchLedgerFromApi({
          ...ledgerBaseFilters,
          componentType: "all",
        }).catch((ledgerError) => {
          console.error(
            "Vendor ledger failed:",
            ledgerError,
          );

          return [] as LedgerRow[];
        }),

        fetchLedgerFromApi({
          ...ledgerBaseFilters,
          componentType: "agent",
        }).catch((ledgerError) => {
          console.error(
            "Agent ledger failed:",
            ledgerError,
          );

          return [] as LedgerRow[];
        }),

        getConfirmedItineraries({
          start: 0,
          length: 10,
          search: searchedQuoteId,
        }).catch((confirmedError) => {
          console.error(
            "Confirmed itinerary metadata failed:",
            confirmedError,
          );

          return {
            data: [],
          };
        }),
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

      const confirmedItems =
        Array.isArray(
          (confirmedResponse as any)
            ?.data,
        )
          ? (confirmedResponse as any)
              .data
          : [];

      const normalizedQuote =
        searchedQuoteId
          .trim()
          .toLowerCase();

      const confirmedBooking =
        confirmedItems.find(
          (item: any) => {
            const itemQuote =
              String(
                item.booking_quote_id ||
                  item.itinerary_quote_ID ||
                  "",
              )
                .trim()
                .toLowerCase();

            return (
              itemQuote ===
              normalizedQuote
            );
          },
        ) ??
        confirmedItems[0] ??
        null;

      const firstRow =
        accountsRows[0];

      const planId =
        Number(
          confirmedBooking
            ?.itinerary_plan_ID ||
            confirmedBooking
              ?.confirmed_itinerary_plan_ID ||
            0,
        ) || undefined;

      const meta: BookingMeta = {
        quoteId:
          String(
            confirmedBooking
              ?.booking_quote_id ||
              confirmedBooking
                ?.itinerary_quote_ID ||
              firstRow?.quoteId ||
              searchedQuoteId,
          ),

        planId,

        status:
          confirmedBooking
            ? "Confirmed"
            : "Accounts",

        agent:
          String(
            confirmedBooking
              ?.agent_name ||
              firstRow?.agent ||
              "-",
          ),

        guest:
          String(
            confirmedBooking
              ?.primary_customer_name ||
              firstRow?.guestName ||
              firstRow?.guest ||
              "-",
          ),

        startDate:
          String(
            confirmedBooking
              ?.arrival_date ||
              firstRow
                ?.arrivalStartDate ||
              firstRow?.arrivalStart ||
              firstRow?.startDate ||
              agentLedgers[0]
                ?.startDate ||
              "-",
          ),

        endDate:
          String(
            confirmedBooking
              ?.departure_date ||
              firstRow
                ?.destinationEndDate ||
              firstRow
                ?.destinationEnd ||
              firstRow?.endDate ||
              agentLedgers[0]
                ?.endDate ||
              "-",
          ),
      };

      setBookingMeta(meta);

      if (
        accountsRows.length === 0 &&
        vendorLedgers.length === 0 &&
        agentLedgers.length === 0
      ) {
        setError(
          `No Accounts & Finance data found for ${searchedQuoteId}.`,
        );
      }

      if (planId) {
        try {
          const invoice =
            await fetchAccountsInvoiceData(
              planId,
            );

          if (!cancelled) {
            setInvoiceData(
              invoice,
            );
          }
        } catch (invoiceError) {
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

const totals = useMemo(() => {
  const sellingFromRows =
    rows.reduce(
      (total, row) =>
        total +
        toNumber(row.amount),
      0,
    );

  const selling =
    agentLedger
      ? toNumber(
          agentLedger.totalBilled,
        )
      : sellingFromRows;

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
      : fallbackReceived;

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
      : fallbackPending;

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

const vendorPaymentRows:
  (string | number)[][] =
  useMemo(
    () =>
      rows
        .filter(
          (row) =>
            toNumber(
              row.payout,
            ) > 0 ||
            toNumber(
              row.payable,
            ) > 0,
        )
        .map((row) => [
          componentDate(row),

          componentName(row),

          toNumber(
            row.payout,
          ),

          toNumber(
            row.payable,
          ) > 0
            ? `Balance ${money(
                toNumber(
                  row.payable,
                ),
              )}`
            : "Paid",
        ]),
    [rows],
  );

const vendorBillRows:
  (string | number)[][] =
  useMemo(
    () =>
      rows.map((row) => [
        `${String(
          row.componentType,
        ).toUpperCase()} · ${componentName(
          row,
        )}`,

        componentPurchase(
          row,
        ),
      ]),
    [rows],
  );

const invoiceRows:
  (string | number)[][] =
  useMemo(() => {
    if (!invoiceData) {
      return [];
    }

    return [
      [
        "Invoice data",
        "Available",
      ],
    ];
  }, [invoiceData]);

return (
  <main className="min-h-screen bg-[#f5f8fc] p-4 text-[#17233d] md:p-6">

    {/* =========================================================
        SEARCH
    ========================================================= */}
    <section className="mb-4 rounded-lg border border-[#dbe4f1] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-xl font-bold">
            Accounts &amp; Finance Overview
          </h1>

          <p className="mt-1 text-xs text-[#71809a]">
            Booking-level financial control centre
          </p>
        </div>

        <div className="flex w-full gap-2 lg:w-[460px]">
          <div className="relative flex-1">

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
              placeholder="Search booking or quote ID"
            />
          </div>

          <Button
            onClick={handleSearch}
            disabled={loading}
            className="h-9 bg-[#245bea] hover:bg-[#1749c5]"
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
    </section>


    {/* =========================================================
        BOOKING HEADER
    ========================================================= */}
    <section className="mb-4 rounded-lg border border-[#dbe4f1] bg-white shadow-sm">

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edf5] p-4">

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
            {bookingMeta?.startDate || "-"} -{" "}
            {bookingMeta?.endDate || "-"}
          </p>
        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
          >
            Edit Booking
          </Button>

          <Button
            size="sm"
            className="bg-[#245bea] hover:bg-[#1749c5]"
          >
            Generate Invoices

            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>

        </div>
      </div>


      {/* =======================================================
          TABS
      ======================================================= */}
      <div className="flex gap-5 overflow-x-auto px-4 pt-3 text-xs font-semibold text-[#71809a]">

        {[
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
        ].map((tab, index) => (

          <span
            key={tab}
            className={`whitespace-nowrap border-b-2 pb-3 ${
              index === 0
                ? "border-[#245bea] text-[#245bea]"
                : "border-transparent"
            }`}
          >
            {tab}
          </span>

        ))}

      </div>
    </section>


    {/* =========================================================
        FINANCIAL SUMMARY CARDS
    ========================================================= */}
    <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

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
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">


      {/* =======================================================
          SERVICE COMPONENTS
      ======================================================= */}
      <section className="rounded-lg border border-[#dbe4f1] bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-[#e7edf5] p-4">

          <h2 className="font-bold">
            Service Components ({rows.length})
          </h2>

          <Button
            size="sm"
            className="bg-[#245bea] hover:bg-[#1749c5]"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add / Edit Components
          </Button>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[800px] text-left text-xs">

            <thead className="bg-[#f7f9fc] text-[#71809a]">
              <tr>

                {[
                  "#",
                  "Type",
                  "Supplier / Vendor",
                  "Details",
                  "Travel Date",
                  "Selling",
                  "Purchase",
                  "Profit",
                  "Status",
                ].map((heading) => (

                  <th
                    key={heading}
                    className="px-3 py-3 font-semibold"
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
                    colSpan={9}
                    className="px-3 py-8 text-center text-[#71809a]"
                  >
                    {loading
                      ? "Loading booking details..."
                      : searchedQuoteId
                        ? `No account components found for ${searchedQuoteId}.`
                        : "Search an itinerary to view its details."}
                  </td>
                </tr>

              ) : (

                rows.map((row, index) => {

                  const purchase =
                    componentPurchase(row);

                  const profit =
                    toNumber(row.amount) -
                    purchase;

                  return (

                    <tr
                      key={`${row.componentType}-${row.id}-${index}`}
                      className="border-t border-[#edf1f6]"
                    >

                      <td className="px-3 py-3">
                        {index + 1}
                      </td>


                      <td className="px-3 py-3 font-medium capitalize">
                        {row.componentType}
                      </td>


                      <td className="px-3 py-3">
                        {componentName(row)}
                      </td>


                      <td className="px-3 py-3 capitalize">
                        {row.componentType}
                      </td>


                      <td className="px-3 py-3">
                        {componentDate(row)}
                      </td>


                      <td className="px-3 py-3">
                        {money(
                          toNumber(row.amount),
                        )}
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
                            statusStyles[row.status]
                          }`}
                        >
                          {row.status === "paid"
                            ? "Paid"
                            : "Due"}
                        </span>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">

        <FinanceList
          title="Receipts from Agent"
          icon={
            <WalletCards className="h-4 w-4 text-[#245bea]" />
          }
          rows={agentReceiptRows}
        />


        <FinanceList
          title="Payments to Vendors"
          icon={
            <Clock3 className="h-4 w-4 text-[#f08b22]" />
          }
          rows={vendorPaymentRows}
        />

      </div>

    </div>


    {/* =========================================================
        BOTTOM DATA BOXES
    ========================================================= */}
    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">


      {/* INVOICES */}
      <SummaryPanel
        title="Invoices"
        action="Generate Invoice"
        rows={invoiceRows}
      />


      {/* VENDOR BILLS */}
      <SummaryPanel
        title="Vendor Bills"
        action="Create Vendor Bill"
        rows={vendorBillRows}
      />


      {/* LEDGER SUMMARY */}
      <SummaryPanel
        title="Ledger Summary"
        action="View Detailed Ledgers"
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


      {/* PROFITABILITY */}
      <SummaryPanel
        title="Profitability (Booking Level)"
        action="View Profitability"
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


    {loading && (
      <p className="mt-3 text-center text-xs text-[#71809a]">
        Refreshing booking data...
      </p>
    )}

  </main>
  );
}


/* ============================================================
   RECEIPTS / PAYMENTS CARD
============================================================ */

function FinanceList({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: ReactNode;
  rows: (string | number)[][];
}) {
  return (
    <section className="rounded-lg border border-[#dbe4f1] bg-white shadow-sm">

      <div className="flex items-center gap-2 border-b border-[#e7edf5] p-4">

        <span>
          {icon}
        </span>

        <h2 className="font-bold">
          {title}
        </h2>

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
  title,
  action,
  rows,
}: {
  title: string;
  action: string;
  rows: (string | number)[][];
}) {
  return (
    <section className="rounded-lg border border-[#dbe4f1] bg-white p-4 shadow-sm">

      <div className="mb-3 flex items-center justify-between gap-2">

        <h2 className="font-bold">
          {title}
        </h2>

        <Button
          variant="outline"
          size="sm"
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
