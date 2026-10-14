
import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type AccountsFilters,
  type AccountsRow,
  type AccountsSummary,
  type AccountsComponentType,
  type PaymentModeOption,
} from "@/services/accountsManagerApi";

import {
  fetchLedgerFilterOptions,
  fetchLedgerFromApi,
  type LedgerOption,
  type LedgerRow,
} from "@/services/accountsLedgerApi";

import { PayNowModal } from "./PayNowModal";
import { BulkPayNowModal } from "./BulkPayNowModal";

const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const rowKey = (row: AccountsRow) =>
  `${row.componentType}:${row.headerId}:${row.id}`;

const supplierName = (row: AccountsRow) =>
  String(row.vendorName || row.hotelName || "-").trim();

const supplierKey = (row: AccountsRow) => {
  const id = Number(row.vendorId || 0);

  return id > 0
    ? `${row.componentType}:id:${id}`
    : `${row.componentType}:name:${supplierName(row).toLowerCase()}`;
};

const isDue = (row: AccountsRow) =>
  row.status === "due" && Number(row.payable || 0) > 0;

export function AccountsVendorBills() {
  const navigate = useNavigate();

  const [quoteId, setQuoteId] = useState("");
  const [componentType, setComponentType] =
    useState<AccountsComponentType>("all");
  const [status, setStatus] =
    useState<"all" | "paid" | "due">("all");

  const [vendor, setVendor] = useState("all");
  const [agent, setAgent] = useState("all");

  const [vendors, setVendors] = useState<LedgerOption[]>([]);
  const [agents, setAgents] = useState<LedgerOption[]>([]);

  const [rows, setRows] = useState<AccountsRow[]>([]);
  const [summary, setSummary] =
    useState<AccountsSummary | null>(null);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);

  const [paymentModes, setPaymentModes] =
    useState<PaymentModeOption[]>([]);

  const [selectedRow, setSelectedRow] =
    useState<AccountsRow | null>(null);
  const [selectedRows, setSelectedRows] =
    useState<AccountsRow[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const [selectionError, setSelectionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    setSelectionError("");
    setSelectedRows([]);
    setBulkModalOpen(false);

    const vendorName =
      vendors.find((item) => String(item.id) === vendor)?.label || "";

    const agentName =
      agents.find((item) => String(item.id) === agent)?.label || "";

    const filters: AccountsFilters = {
      quoteId: quoteId.trim() || undefined,
      componentType,
      status,
      search: vendorName || undefined,
      agent: agentName || undefined,
    };

    try {
      const [accounts, totals, ledger] = await Promise.all([
        fetchAccountsList(filters),
        fetchAccountsSummary(filters),
        fetchLedgerFromApi({
          quoteId: quoteId.trim(),
          componentType,
          fromDate: "",
          toDate: "",
          guideName: "",
          hotspotName: "",
          activityName: "",
          hotelName: "",
          branch: "",
          vehicle: "",
          vehicleVendor: vendor === "all" ? "" : vendor,
          agentName: agent === "all" ? "" : agent,
        }),
      ]);

      setRows(accounts);
      setSummary(totals);
      setLedgerRows(ledger);
    } catch (cause) {
      setRows([]);
      setSummary(null);
      setLedgerRows([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load vendor bills.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      fetchPaymentModes().then(setPaymentModes),
      fetchLedgerFilterOptions({
        quoteId: "",
        componentType: "all",
        fromDate: "",
        toDate: "",
      }).then((options) => {
        setVendors(options.vendors);
        setAgents(options.agents);
      }),
    ]).catch(() => undefined);

    void load();
    // Initial load only. Filter changes are applied by Search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRow = (row: AccountsRow) => {
    if (!isDue(row)) return;

    const key = rowKey(row);

    if (selectedRows.some((item) => rowKey(item) === key)) {
      setSelectedRows((current) =>
        current.filter((item) => rowKey(item) !== key),
      );
      setSelectionError("");
      return;
    }

    if (
      selectedRows.length > 0 &&
      supplierKey(row) !== supplierKey(selectedRows[0])
    ) {
      setSelectionError(
        "Bulk payment tasks must belong to the same vendor and component type.",
      );
      return;
    }

    if (selectedRows.length >= 100) {
      setSelectionError(
        "A maximum of 100 payment tasks can be selected.",
      );
      return;
    }

    setSelectedRows((current) => [...current, row]);
    setSelectionError("");
  };

  const toggleSelectAll = () => {
    const dueRows = rows.filter(isDue);

    if (!dueRows.length) return;

    if (selectedRows.length > 0) {
      const group = supplierKey(selectedRows[0]);
      const matching = dueRows.filter(
        (row) => supplierKey(row) === group,
      );

      const alreadySelected = matching.every((row) =>
        selectedRows.some((item) => rowKey(item) === rowKey(row)),
      );

      if (alreadySelected) {
        setSelectedRows([]);
        setSelectionError("");
        return;
      }

      if (matching.length > 100) {
        setSelectionError(
          "This supplier has more than 100 tasks. Select up to 100 manually.",
        );
        return;
      }

      setSelectedRows(matching);
      setSelectionError("");
      return;
    }

    const groups = new Set(dueRows.map(supplierKey));

    if (groups.size > 1) {
      setSelectionError(
        "Select one vendor task first. Select All will then select due tasks for that vendor.",
      );
      return;
    }

    if (dueRows.length > 100) {
      setSelectionError(
        "Select up to 100 tasks for one payment.",
      );
      return;
    }

    setSelectedRows(dueRows);
    setSelectionError("");
  };

  const handlePaymentSuccess = () => {
    setSelectedRow(null);
    setSelectedRows([]);
    setBulkModalOpen(false);
    setSelectionError("");
    void load();
  };

  const totalSelected = selectedRows.reduce(
    (total, row) => total + Number(row.payable || 0),
    0,
  );

  return (
    <main className="min-h-screen bg-[#f5f8fc] p-4 text-[#17233d] md:p-6">
      <section className="rounded-lg border border-[#dbe4f1] bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Vendor Bills</h1>
        <p className="mt-1 text-sm text-[#71809a]">
          Find supplier payments across bookings, vendors and agents.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Input
            value={quoteId}
            onChange={(event) => setQuoteId(event.target.value)}
            placeholder="Booking / Quote ID"
          />

          <Select value={vendor} onValueChange={setVendor}>
            <SelectTrigger>
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors
                .filter((item) => item.id > 0)
                .map((item) => (
                  <SelectItem
                    key={item.id}
                    value={String(item.id)}
                  >
                    {item.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={agent} onValueChange={setAgent}>
            <SelectTrigger>
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents
                .filter((item) => item.id > 0)
                .map((item) => (
                  <SelectItem
                    key={item.id}
                    value={String(item.id)}
                  >
                    {item.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select
            value={componentType}
            onValueChange={(value) =>
              setComponentType(value as AccountsComponentType)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Component" />
            </SelectTrigger>
            <SelectContent>
              {[
                "all",
                "hotel",
                "vehicle",
                "guide",
                "hotspot",
                "activity",
              ].map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "all" ? "All Components" : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as typeof status)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="due">Due</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Button
            disabled={loading}
            onClick={() => void load()}
            className="bg-[#245bea] hover:bg-[#1749c5]"
          >
            <Search className="mr-2 h-4 w-4" />
            {loading ? "Loading..." : "Search"}
          </Button>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mt-4 grid gap-3 md:grid-cols-4">
        {(
          [
            ["Total Payable", summary?.totalPayable],
            ["Total Paid", summary?.totalPaid],
            ["Outstanding", summary?.totalBalance],
            ["Rows", summary?.rowCount],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[#dbe4f1] bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-[#71809a]">{label}</p>
            <p className="mt-2 text-xl font-bold">
              {label === "Rows"
                ? Number(value || 0)
                : money(value)}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-lg border border-[#dbe4f1] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-bold">
              Vendor Payable Records ({rows.length})
            </h2>
            <p className="text-xs text-[#71809a]">
              {ledgerRows.length} ledger records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={loading || rows.every((row) => !isDue(row))}
              onClick={toggleSelectAll}
            >
              Select All for Vendor
            </Button>

            <Button
              disabled={loading || selectedRows.length === 0}
              onClick={() => setBulkModalOpen(true)}
            >
              Bulk Pay ({selectedRows.length})
            </Button>
          </div>
        </div>

        {selectionError && (
          <p className="mx-4 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {selectionError}
          </p>
        )}

        {selectedRows.length > 0 && (
          <div className="mx-4 mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            {selectedRows.length} tasks selected for{" "}
            <strong>{supplierName(selectedRows[0])}</strong>.
            {" "}Total outstanding:{" "}
            <strong>{money(totalSelected)}</strong>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="bg-[#f7f9fc] text-[#71809a]">
              <tr>
                {[
                  "Select",
                  "#",
                  "Booking",
                  "Type",
                  "Vendor / Supplier",
                  "Agent",
                  "Service Date",
                  "Payable",
                  "Paid",
                  "Balance",
                  "Status",
                  "Action",
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
                    colSpan={12}
                    className="px-3 py-10 text-center text-[#71809a]"
                  >
                    {loading
                      ? "Loading vendor bills..."
                      : "No matching vendor bills found."}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={rowKey(row)}
                    className="border-t border-[#edf1f6]"
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select payment task ${row.quoteId}`}
                        disabled={!isDue(row)}
                        checked={selectedRows.some(
                          (item) => rowKey(item) === rowKey(row),
                        )}
                        onChange={() => toggleRow(row)}
                      />
                    </td>

                    <td className="px-3 py-3">{index + 1}</td>
                    <td className="px-3 py-3">{row.quoteId}</td>
                    <td className="px-3 py-3 capitalize">
                      {row.componentType}
                    </td>
                    <td className="px-3 py-3">
                      {supplierName(row)}
                    </td>
                    <td className="px-3 py-3">
                      {row.agent || "-"}
                    </td>
                    <td className="px-3 py-3">
                      {row.routeDate || row.startDate || "-"}
                    </td>
                    <td className="px-3 py-3">
                      {money(row.payable)}
                    </td>
                    <td className="px-3 py-3">
                      {money(row.payout)}
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      {money(row.payable)}
                    </td>
                    <td className="px-3 py-3 capitalize">
                      {row.status}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(
                              `/accounts-ledgers?quoteId=${encodeURIComponent(
                                row.quoteId,
                              )}&componentType=${row.componentType}`,
                            )
                          }
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Ledger
                        </Button>

                        {isDue(row) && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedRow(row)}
                          >
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRow && (
        <PayNowModal
          row={selectedRow}
          paymentModes={paymentModes}
          onClose={() => setSelectedRow(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {bulkModalOpen && selectedRows.length > 0 && (
        <BulkPayNowModal
          rows={selectedRows}
          paymentModes={paymentModes}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </main>
  );
}
