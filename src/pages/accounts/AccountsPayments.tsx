import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  Search,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  fetchAccountsList,
  fetchAccountsSummary,
  fetchPaymentModes,
  type AccountsComponentType,
  type AccountsRow,
  type AccountsSummary,
  type PaymentModeOption,
} from "@/services/accountsManagerApi";

import {
  PayNowModal,
} from "./PayNowModal";

import {
  BulkPayNowModal,
} from "./BulkPayNowModal";

const money = (
  value: unknown,
) =>
  `₹${Number(
    value || 0,
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    },
  )}`;


const paymentRowKey = (
  row: AccountsRow,
) =>
  `${row.componentType}:${row.headerId}:${row.id}`;


const supplierName = (
  row: AccountsRow,
) =>
  String(
    row.vendorName ||
      row.hotelName ||
      "-",
  ).trim() || "-";


const supplierGroupKey = (
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

  return `${row.componentType}:name:${supplierName(
    row,
  ).toLowerCase()}`;
};


const isPayableRow = (
  row: AccountsRow,
) =>
  row.status === "due" &&
  Number(
    row.payable || 0,
  ) > 0;


const sellingAmount = (
  row: AccountsRow,
) =>
  Number(
    row.receivableFromAgentAmount ??
      row.amount ??
      0,
  );


const purchaseAmount = (
  row: AccountsRow,
) =>
  Number(
    row.amount || 0,
  );


export function AccountsPayments() {
  const [
    searchParams,
  ] = useSearchParams();


  const [
    quoteId,
    setQuoteId,
  ] = useState(
    () =>
      searchParams
        .get("quoteId")
        ?.trim() ||
      "",
  );


  const [
    componentType,
    setComponentType,
  ] = useState<
    AccountsComponentType
  >("all");


  const [
    status,
    setStatus,
  ] = useState<
    "all" | "paid" | "due"
  >("all");


  const [
    search,
    setSearch,
  ] = useState(
    () =>
      searchParams
        .get("search")
        ?.trim() ||
      "",
  );
const [
  rows,
  setRows,
] = useState<
  AccountsRow[]
>([]);


const [
  summary,
  setSummary,
] = useState<
  AccountsSummary | null
>(null);


const [
  paymentModes,
  setPaymentModes,
] = useState<
  PaymentModeOption[]
>([]);


/*
 * Existing single Pay Now.
 */
const [
  selectedRow,
  setSelectedRow,
] = useState<
  AccountsRow | null
>(null);


/*
 * New bulk payment selection.
 */
const [
  selectedRows,
  setSelectedRows,
] = useState<
  AccountsRow[]
>([]);


const [
  bulkModalOpen,
  setBulkModalOpen,
] = useState(false);


const [
  selectionError,
  setSelectionError,
] = useState("");


const [
  loading,
  setLoading,
] = useState(false);


const [
  error,
  setError,
] = useState("");

const load = async () => {
  setLoading(true);

  setError("");
  setSelectionError("");

  /*
   * Search/filter result may now contain
   * a completely different group of tasks.
   */
  setSelectedRows([]);
  setBulkModalOpen(false);

  try {
      const filters = {
  quoteId:
    quoteId.trim() ||
    undefined,

  status,

  search:
    search.trim() ||
    undefined,

  componentType:
    componentType === "all"
      ? undefined
      : componentType,
};
      const [data, totals] = await Promise.all([fetchAccountsList(filters), fetchAccountsSummary(filters)]);
      setRows(data);
      setSummary(totals);
    } catch (cause) {
      setRows([]);
      setSummary(null);
      setError(cause instanceof Error ? cause.message : "Unable to load payments.");
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  void fetchPaymentModes()
    .then(
      setPaymentModes,
    )
    .catch(
      () => undefined,
    );

  void load();
}, []);


/*
 * ============================================================
 * BULK PAYMENT SELECTION
 * ============================================================
 */

const selectedKeySet =
  useMemo(
    () =>
      new Set(
        selectedRows.map(
          paymentRowKey,
        ),
      ),
    [selectedRows],
  );


const dueRows =
  useMemo(
    () =>
      rows.filter(
        isPayableRow,
      ),
    [rows],
  );


const selectedGroupKey =
  selectedRows.length > 0
    ? supplierGroupKey(
        selectedRows[0],
      )
    : "";


const dueRowsForSelectedSupplier =
  useMemo(() => {
    if (
      !selectedGroupKey
    ) {
      return [];
    }

    return dueRows.filter(
      (row) =>
        supplierGroupKey(
          row,
        ) ===
        selectedGroupKey,
    );
  }, [
    dueRows,
    selectedGroupKey,
  ]);


const allSelectedSupplierRowsSelected =
  dueRowsForSelectedSupplier.length >
    0 &&
  dueRowsForSelectedSupplier.every(
    (row) =>
      selectedKeySet.has(
        paymentRowKey(
          row,
        ),
      ),
  );


const selectedTotal =
  useMemo(
    () =>
      selectedRows.reduce(
        (
          total,
          row,
        ) =>
          total +
          Number(
            row.payable || 0,
          ),
        0,
      ),
    [selectedRows],
  );


const toggleRow = (
  row: AccountsRow,
) => {
  if (
    !isPayableRow(
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
   * Unselect current row.
   */
  if (
    selectedKeySet.has(
      key,
    )
  ) {
    setSelectedRows(
      (current) =>
        current.filter(
          (item) =>
            paymentRowKey(
              item,
            ) !== key,
        ),
    );

    setSelectionError("");

    return;
  }


  /*
   * Do not mix payment tasks belonging
   * to different Vendors/Suppliers.
   */
  if (
    selectedRows.length > 0 &&
    supplierGroupKey(
      row,
    ) !==
      supplierGroupKey(
        selectedRows[0],
      )
  ) {
    setSelectionError(
      "Multiple payment tasks must belong to the same vendor.",
    );

    return;
  }


  setSelectedRows(
    (current) => [
      ...current,
      row,
    ],
  );

  setSelectionError("");
};


const toggleSelectAll =
  () => {
    if (
      dueRows.length === 0
    ) {
      return;
    }


    /*
     * A Vendor is already selected:
     * Select All applies only to that Vendor.
     */
    if (
      selectedRows.length > 0
    ) {
      setSelectedRows(
        allSelectedSupplierRowsSelected
          ? []
          : dueRowsForSelectedSupplier,
      );

      setSelectionError("");

      return;
    }


    /*
     * Nothing is selected yet.
     *
     * If several Vendors are visible we cannot
     * safely select every row.
     */
    const grouped =
      new Map<
        string,
        AccountsRow[]
      >();


    dueRows.forEach(
      (row) => {
        const key =
          supplierGroupKey(
            row,
          );

        const current =
          grouped.get(
            key,
          ) || [];

        current.push(
          row,
        );

        grouped.set(
          key,
          current,
        );
      },
    );


    if (
      grouped.size > 1
    ) {
      setSelectionError(
        "Select one vendor task first, then Select All will select all due tasks for that vendor.",
      );

      return;
    }


    setSelectedRows(
      Array.from(
        grouped.values(),
      )[0] || [],
    );

    setSelectionError("");
  };


return (
    <main className="h-screen overflow-y-auto bg-[#f5f8fc] p-4 text-[#17233d] md:p-6">
      <section className="rounded-lg border border-[#dbe4f1] bg-white p-5 shadow-sm"><h1 className="text-xl font-bold">Payments</h1><p className="mt-1 text-sm text-[#71809a]">Record and review real component payments.</p><div className="mt-5 grid gap-3 md:grid-cols-4"><Input value={quoteId} onChange={(event) => setQuoteId(event.target.value)} placeholder="Quote ID" /><Select
  value={
    componentType
  }
  onValueChange={(
    value,
  ) =>
    setComponentType(
      value as AccountsComponentType,
    )
  }
>
  <SelectTrigger><SelectValue placeholder="Component type" /></SelectTrigger><SelectContent>{["all", "hotel", "vehicle", "guide", "hotspot", "activity"].map((type) => <SelectItem key={type} value={type}>{type === "all" ? "All components" : type}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{["all", "due", "paid"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Button onClick={() => void load()} disabled={loading} className="bg-[#245bea] hover:bg-[#1749c5]"><Search className="mr-2 h-4 w-4" />Search</Button></div><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} className="mt-3" placeholder="Search vendor, agent, or component" /></section>
     {error && (
  <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
    {error}
  </p>
)}


{selectionError && (
  <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
    {selectionError}
  </p>
)}
      <section className="mt-4 grid gap-3 md:grid-cols-4">{[["Total Payable", summary?.totalPayable], ["Total Paid", summary?.totalPaid], ["Outstanding", summary?.totalBalance], ["Row Count", summary?.rowCount]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-[#dbe4f1] bg-white p-4 shadow-sm"><p className="text-xs text-[#71809a]">{label}</p><p className="mt-2 text-xl font-bold">{label === "Row Count" ? Number(value || 0) : money(value)}</p></div>)}</section>
      {selectedRows.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-lg border border-[#cfdaf0] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edf5] p-4">
            <div>
              <h2 className="font-bold">Selected Payment Tasks ({selectedRows.length})</h2>
              <p className="mt-1 text-xs text-[#71809a]">Vendor: {supplierName(selectedRows[0])}</p>
            </div>
            <Button onClick={() => setBulkModalOpen(true)} className="bg-[#245bea] hover:bg-[#1749c5]">Pay Selected</Button>
          </div>
          <div className="max-h-[240px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#f7f9fc] text-[#71809a]">
                <tr>
                  {[
                    "Booking ID",
                    "Component",
                    "Vendor",
                    "Travel Date",
                    "Payable",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((row) => (
                  <tr key={`selected-${paymentRowKey(row)}`} className="border-t border-[#edf1f6]">
                    <td className="px-3 py-3">{row.quoteId}</td>
                    <td className="px-3 py-3 capitalize">{row.componentType}</td>
                    <td className="px-3 py-3">{supplierName(row)}</td>
                    <td className="px-3 py-3">{row.routeDate || row.startDate || "-"}</td>
                    <td className="px-3 py-3 font-semibold">{money(row.payable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#e7edf5] bg-[#fbfcfe] px-4 py-3 text-sm">
            <span>{selectedRows.length} Tasks Selected</span>
            <strong>Total: {money(selectedTotal)}</strong>
          </div>
        </section>
      )}
<section className="mt-4 overflow-hidden rounded-lg border border-[#dbe4f1] bg-white shadow-sm">

  <div className="border-b border-[#e7edf5] p-4">
    <h2 className="font-bold">
      Payment records ({rows.length})
    </h2>
  </div>


  {/*
   * Horizontal + vertical scroll.
   */}
  <div className="max-h-[520px] overflow-auto">

    <table className="w-full min-w-[1080px] text-left text-xs">

      <thead className="sticky top-0 z-10 bg-[#f7f9fc] text-[#71809a]">

        <tr>

          <th className="px-3 py-3">
            <label className="flex items-center gap-2 whitespace-nowrap font-semibold">

              <input
                type="checkbox"
                checked={
                  allSelectedSupplierRowsSelected
                }
                onChange={
                  toggleSelectAll
                }
                disabled={
                  dueRows.length === 0
                }
                className="h-4 w-4"
              />

              Select All

            </label>
          </th>


          {[
            "Booking",
            "Type",
            "Supplier / Vendor",
            "Travel Date",
            "Selling",
            "Purchase",
            "Paid",
            "Balance",
            "Status",
            "Action",
          ].map(
            (heading) => (
              <th
                key={heading}
                className="px-3 py-3 font-semibold"
              >
                {heading}
              </th>
            ),
          )}

        </tr>

      </thead>


      <tbody>

        {rows.length === 0 ? (

          <tr>
            <td
              colSpan={11}
              className="px-3 py-10 text-center text-[#71809a]"
            >
              {loading
                ? "Loading payments..."
                : "No payment rows found."}
            </td>
          </tr>

        ) : (

          rows.map(
            (row) => {
              const balance =
                Number(
                  row.payable || 0,
                );


              return (
                <tr
                  key={
                    paymentRowKey(
                      row,
                    )
                  }
                  className="border-t border-[#edf1f6]"
                >

                  {/* Checkbox */}
                  <td className="px-3 py-3">

                    <input
                      type="checkbox"
                      checked={
                        selectedKeySet.has(
                          paymentRowKey(
                            row,
                          ),
                        )
                      }
                      disabled={
                        !isPayableRow(
                          row,
                        )
                      }
                      onChange={() =>
                        toggleRow(
                          row,
                        )
                      }
                      className="h-4 w-4"
                    />

                  </td>


                  <td className="px-3 py-3">
                    {row.quoteId}
                  </td>


                  <td className="px-3 py-3 capitalize">
                    {row.componentType}
                  </td>


                  <td className="px-3 py-3">
                    {supplierName(
                      row,
                    )}
                  </td>


                  <td className="px-3 py-3">
                    {row.routeDate ||
                      row.startDate ||
                      "-"}
                  </td>


                  <td className="px-3 py-3">
                    {money(
                      sellingAmount(
                        row,
                      ),
                    )}
                  </td>


                  <td className="px-3 py-3">
                    {money(
                      purchaseAmount(
                        row,
                      ),
                    )}
                  </td>


                  <td className="px-3 py-3">
                    {money(
                      row.payout,
                    )}
                  </td>


                  <td className="px-3 py-3 font-semibold">
                    {money(
                      balance,
                    )}
                  </td>


                  <td className="px-3 py-3 capitalize">
                    {row.status}
                  </td>


                  <td className="px-3 py-3">

                    {row.status === "due" &&
                      balance > 0 && (
                        <Button
                          size="sm"
                          onClick={() =>
                            setSelectedRow(
                              row,
                            )
                          }
                        >
                          Pay Now
                        </Button>
                      )}

                  </td>

                </tr>
              );
            },
          )

        )}

      </tbody>

    </table>

  </div>

</section>
{selectedRow && (
  <PayNowModal
    row={selectedRow}
    paymentModes={paymentModes}
    onClose={() => {
      setSelectedRow(null);
    }}
    onSuccess={() => {
      setSelectedRow(null);

      void load();
    }}
  />
)}


{bulkModalOpen &&
  selectedRows.length > 0 && (
    <BulkPayNowModal
      rows={selectedRows}
      paymentModes={paymentModes}
      onClose={() => {
        setBulkModalOpen(false);
      }}
      onSuccess={() => {
        setBulkModalOpen(false);

        setSelectedRows([]);

        setSelectionError("");

        void load();
      }}
    />
  )}


</main>
  );
}
