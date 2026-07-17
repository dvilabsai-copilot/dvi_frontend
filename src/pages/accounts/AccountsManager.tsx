// src/pages/AccountsManager.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Calendar as CalendarIcon } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import {
  fetchAccountsList,
  fetchAccountsSummary,
  fetchAgents,
  fetchPaymentModes,
  searchQuotes,
  exportAccountsManagerExcel,
} from "@/services/accountsManagerApi";
import type {
  AccountsRow,
  AccountsSummary,
  AccountsFilters,
  AgentOption,
  PaymentModeOption,
  AccountsComponentType,
} from "@/services/accountsManagerApi";
import { PayNowModal } from "./PayNowModal";
import { AccountsSectionTable } from "./AccountsSectionTable";
import { formatINR, SECTION_CONFIG, type SectionKey, toNumber } from "./accountsManagerUtils";

function formatToDDMMYYYY(date: Date | undefined) {
  if (!date) return "";
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export const AccountsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "due">("all");
  const [quoteIdFilter, setQuoteIdFilter] = useState("");
  const [componentType, setComponentType] = useState<
    "all" | AccountsComponentType
  >("all");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromDateObj, setFromDateObj] = useState<Date | undefined>(undefined);
  const [toDateObj, setToDateObj] = useState<Date | undefined>(undefined);

  const [agent, setAgent] = useState("");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<AccountsRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);

  const [quoteSearchTerm, setQuoteSearchTerm] = useState("");
  const [quoteSuggestions, setQuoteSuggestions] = useState<string[]>([]);

  const [visibleCount, setVisibleCount] = useState(20);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [payNowOpen, setPayNowOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AccountsRow | null>(null);

  // LOOKUPS
  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      try {
        const [agentsData, paymentModesData] = await Promise.all([
          fetchAgents(),
          fetchPaymentModes(),
        ]);
        if (cancelled) return;
        setAgents(agentsData);
        setPaymentModes(paymentModesData);
      } catch (err) {
        console.error("Failed to load agents / payment modes:", err);
      }
    }

    loadLookups();
    return () => {
      cancelled = true;
    };
  }, []);

  // QUOTE AUTOCOMPLETE
  useEffect(() => {
    if (!quoteSearchTerm.trim()) {
      setQuoteSuggestions([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        const result = await searchQuotes(quoteSearchTerm.trim());
        setQuoteSuggestions(result.map((q) => q.quoteId));
      } catch (err) {
        console.error("Quote search failed:", err);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [quoteSearchTerm]);

  // MAIN DATA FETCH
  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setLoading(true);
      try {
        const filters: AccountsFilters = {
          status: activeTab,
          quoteId: quoteIdFilter || undefined,
          componentType: componentType === "all" ? undefined : componentType,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          agent: agent || undefined,
          search: search || undefined,
        };

        const [listData, summaryData] = await Promise.all([
          fetchAccountsList(filters),
          fetchAccountsSummary(filters),
        ]);

        if (isCancelled) return;
        setRows(listData);
        setSummary(summaryData);
        setVisibleCount(20);
      } catch (err) {
        console.error("Failed to fetch accounts manager data:", err);
        if (!isCancelled) {
          setRows([]);
          setSummary(null);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, quoteIdFilter, componentType, fromDate, toDate, agent, search]);

  const filteredRows = useMemo(() => rows, [rows]);

  // TOTALS (using helper toNumber to keep TS + runtime happy even if API sends strings)
  const rowTotalBilled = filteredRows.reduce(
    (s, r) => s + toNumber(r.amount),
    0,
  );
  const rowTotalReceived = filteredRows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + toNumber(r.payout), 0);
  const rowTotalReceivable = filteredRows
    .filter((r) => r.status === "due")
    .reduce((s, r) => s + toNumber(r.payable), 0);
  const rowTotalPayout = filteredRows.reduce(
    (s, r) => s + toNumber(r.payout),
    0,
  );
  const rowTotalPayable = filteredRows.reduce(
    (s, r) => s + toNumber(r.payable),
    0,
  );
  const rowTotalProfit = rowTotalReceived - rowTotalPayable;

  const totalBilled = summary?.totalPayable ?? rowTotalBilled;
  const totalPayout = summary?.totalPaid ?? rowTotalPayout;
  const totalPayable = summary?.totalBalance ?? rowTotalPayable;

  const totalReceived = rowTotalReceived;
  const totalReceivable = rowTotalReceivable;
  const totalProfit = rowTotalProfit;

  // VISIBLE (INFINITE SCROLL)
  const visibleRows = filteredRows.slice(0, visibleCount);
  const visibleAmount = visibleRows.reduce(
    (s, r) => s + toNumber(r.amount),
    0,
  );
  const visiblePayout = visibleRows.reduce(
    (s, r) => s + toNumber(r.payout),
    0,
  );
  const visiblePayable = visibleRows.reduce(
    (s, r) => s + toNumber(r.payable),
    0,
  );
  const visibleProfit = visiblePayout - visiblePayable;
  const isAllLoaded = visibleCount >= filteredRows.length;

  const groupedVisibleRows = useMemo(() => {
    // one array per section type, including "flight"
    const base: Record<SectionKey, AccountsRow[]> = {
      guide: [],
      hotspot: [],
      activity: [],
      hotel: [],
      vehicle: [],
      flight: [],
    };

    for (const row of visibleRows) {
      const section = SECTION_CONFIG.find(({ type }) => type === row.componentType)?.type;
      if (section) base[section].push(row);
    }

    return base;
  }, [visibleRows]);

  // SECTION RENDERER – HOTEL HAS FULL 15 HEADERS LIKE PHP

  // INFINITE SCROLL
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        setVisibleCount((prev) =>
          Math.min(prev + 20, filteredRows.length || prev),
        );
      }
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, [filteredRows.length]);

  const clearFilters = () => {
    setQuoteIdFilter("");
    setQuoteSearchTerm("");
    setQuoteSuggestions([]);
    setComponentType("all");
    setFromDate("");
    setToDate("");
    setFromDateObj(undefined);
    setToDateObj(undefined);
    setAgent("");
  };

  const handleOpenPayNow = (row: AccountsRow) => {
    setSelectedRow(row);
    setPayNowOpen(true);
  };

  const handleClosePayNow = () => {
    setPayNowOpen(false);
    setSelectedRow(null);
  };

  const handlePaySuccess = async () => {
    setPayNowOpen(false);
    setSelectedRow(null);

    try {
      setLoading(true);
      const filters: AccountsFilters = {
        status: activeTab,
        quoteId: quoteIdFilter || undefined,
        componentType: componentType === "all" ? undefined : componentType,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        agent: agent || undefined,
        search: search || undefined,
      };
      const [listData, summaryData] = await Promise.all([
        fetchAccountsList(filters),
        fetchAccountsSummary(filters),
      ]);
      setRows(listData);
      setSummary(summaryData);
      setVisibleCount(20);
    } catch (err) {
      console.error("Failed to reload after payment:", err);
    } finally {
      setLoading(false);
    }
  };

    // EXPORT CURRENT FILTERED ROWS TO CSV (EXCEL-COMPATIBLE)
  const handleExport = () => {
    if (!filteredRows || filteredRows.length === 0) {
      // nothing to export
      return;
    }

    // Helper to safely escape CSV fields
    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const str = String(value).replace(/\r\n|\n|\r/g, " "); // remove newlines
      if (/[",]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Header row – includes hotel-style columns + generic fields
    const headers = [
      "Component Type",
      "Quote ID",
      "Status",
      "Component / Hotel Name",
      "Agent",
      "Amount",
      "Payout",
      "Payable",
      "Receivable From Agent Amount",
      "Receivable From Agent Name",
      "Inhand Amount",
      "Margin Amount",
      "Tax Amount",
      "Date",
      "Guest",
      "Room Count",
      "Arrival Start Date",
      "Destination End Date",
      "Start Date",
      "End Date",
      "Route Date",
      "Header ID",
      "Vendor ID",
      "Vehicle ID",
    ];

    const lines: string[] = [];
    lines.push(headers.map(escapeCsv).join(","));

    filteredRows.forEach((row) => {
      const r = row;

      const receivableFromAgentAmount =
        r.receivableFromAgentAmount ?? r.agentReceivable ?? 0;
      const receivableFromAgentName = r.receivableFromAgentName ?? r.agent ?? "";
      const inhandAmount = r.inhandAmount ?? 0;
      const marginAmount = r.marginAmount ?? 0;
      const taxAmount = r.taxAmount ?? 0;
      const date = r.routeDate || r.transactionDate || r.date || "";
      const guest = r.guestName ?? r.guest ?? "";
      const roomCount = r.roomCount ?? "";
      const arrivalStart =
        r.arrivalStart ?? r.arrivalStartDate ?? r.startDate ?? "";
      const destinationEnd =
        r.destinationEnd ?? r.destinationEndDate ?? r.endDate ?? "";

      const startDate = r.startDate ?? "";
      const endDate = r.endDate ?? "";
      const routeDate = r.routeDate ?? "";

      const headerId = r.headerId ?? "";
      const vendorId = r.vendorId ?? "";
      const vehicleId = r.vehicleId ?? "";

      const rowValues = [
        row.componentType ?? "",
        row.quoteId ?? "",
        row.status ?? "",
        row.hotelName ?? "", // for non-hotel components this will still be filled if backend sends name here
        row.agent ?? "",
        row.amount ?? 0,
        row.payout ?? 0,
        row.payable ?? 0,
        receivableFromAgentAmount,
        receivableFromAgentName,
        inhandAmount,
        marginAmount,
        taxAmount,
        date,
        guest,
        roomCount,
        arrivalStart,
        destinationEnd,
        startDate,
        endDate,
        routeDate,
        headerId,
        vendorId,
        vehicleId,
      ];

      lines.push(rowValues.map(escapeCsv).join(","));
    });

    const csvContent = "\uFEFF" + lines.join("\r\n"); // BOM for Excel

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const filename = `accounts_all_ledger_${yyyy}_${mm}_${dd}_${hh}_${mi}_${ss}.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    try {
      const filters: AccountsFilters = {
        status: activeTab,
        quoteId: quoteIdFilter || undefined,
        componentType: componentType === "all" ? undefined : componentType,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        agent: agent || undefined,
        search: search || undefined,
      };
      await exportAccountsManagerExcel(filters);
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Failed to export Excel");
    }
  };

  return (
    <div className="w-full max-w-full bg-[#fbeef8] min-h-screen p-4 md:p-6">
      <h1 className="text-lg md:text-xl font-semibold text-[#4a4260] mb-4">
        Payout List
      </h1>

      {/* TABS */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-10 py-2 rounded-full border ${
            activeTab === "all"
              ? "bg-white text-[#4a4260] shadow-sm"
              : "bg-transparent border-transparent text-[#6a6181]"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab("paid")}
          className={`px-10 py-2 rounded-full border ${
            activeTab === "paid"
              ? "bg-white text-[#4a4260] shadow-sm"
              : "bg-transparent border-transparent text-[#6a6181]"
          }`}
        >
          Paid
        </button>
        <button
          onClick={() => setActiveTab("due")}
          className={`px-10 py-2 rounded-full border ${
            activeTab === "due"
              ? "bg-white text-[#4a4260] shadow-sm"
              : "bg-transparent border-transparent text-[#6a6181]"
          }`}
        >
          Due
        </button>
      </div>


   {/* FILTER BAR */}
<Card className="shadow-none border-none mb-4 bg-white/70">
  <CardContent className="pt-6 pb-5">
    <p className="text-sm font-semibold text-[#4a4260] mb-4">FILTER</p>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="space-y-2 lg:col-span-3">
        <Label className="text-sm text-[#4a4260]">Quote ID</Label>
        <Input
          placeholder="Enter the Quote ID"
          value={quoteIdFilter}
          onChange={(e) => {
            const value = e.target.value;
            setQuoteIdFilter(value);
            setQuoteSearchTerm(value);
          }}
          className="h-10"
        />
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label className="text-sm text-[#4a4260]">Component Type</Label>
        <Select
          value={componentType}
          onValueChange={(v) =>
            setComponentType(v as "all" | AccountsComponentType)
          }
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="flight">Flight</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="guide">Guide</SelectItem>
            <SelectItem value="hotspot">Hotspot</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label className="text-sm text-[#4a4260]">From Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`h-10 w-full justify-start px-1 text-left text-sm font-normal ${
                !fromDate ? "text-muted-foreground" : ""
              }`}
            >
              <CalendarIcon className="mr-0.5 h-4 w-4" />
              {fromDate || "DD/MM/YYYY"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDateObj}
              onSelect={(date) => {
                setFromDateObj(date ?? undefined);
                setFromDate(formatToDDMMYYYY(date ?? undefined));
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label className="text-sm text-[#4a4260]">To Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`h-10 w-full justify-start px-1 text-left text-sm font-normal ${
                  !toDate ? "text-muted-foreground" : ""
                }`}
            >
              <CalendarIcon className="mr-0.5 h-4 w-4" />
              {toDate || "DD/MM/YYYY"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={toDateObj}
              onSelect={(date) => {
                setToDateObj(date ?? undefined);
                setToDate(formatToDDMMYYYY(date ?? undefined));
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2 lg:col-span-3">
        <Label className="text-sm text-[#4a4260]">Agent</Label>
        <Select
          value={agent || "__all"}
          onValueChange={(v) => setAgent(v === "__all" ? "" : v)}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.name}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="lg:col-span-12 flex justify-end gap-3">
        <Button
          type="button"
          onClick={clearFilters}
          className="h-10 bg-[#f057b8] px-6 text-white hover:bg-[#e348aa]"
        >
          Clear
        </Button>

        <Button
          type="button"
          onClick={handleExportExcel}
          className="flex h-10 items-center gap-2 bg-[#0f9c34] px-6 text-white hover:bg-[#0d8a2e]"
        >
          <Download className="h-4 w-4" />
          Excel
        </Button>
      </div>
    </div>
  </CardContent>
</Card>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Billed</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totalBilled)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Received</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totalReceived)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Receivable</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totalReceivable)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Payout</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totalPayout)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Payable</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totalPayable)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Profit</p>
          <p className="text-xl font-semibold text-[#10a037]">
            {formatINR(totalProfit)}
          </p>
        </div>
      </div>

      {/* LIST CARD */}
      <Card className="shadow-none border-none bg-white">
        <CardContent className="pt-6 pb-0">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
            <p className="text-sm font-semibold text-[#4a4260]">
              List of Accounts Details
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48"
              />
              <Button
                variant="outline"
                className="h-9 px-4 gap-2 bg-[#e5fff1] border-[#b7f7d9] text-[#0f9c34]"
                onClick={handleExport}
                disabled={filteredRows.length === 0}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>

        {/* SCROLL TABLE */}
        <div
          ref={scrollRef}
          className="max-h-[460px] overflow-y-auto overflow-x-auto border-t border-[#f3e0ff]"
        >
          <Table
            id="all_accountsmanager_list"
            className="min-w-[2000px]" // wide enough for 15 hotel columns
          >
            {/* Initial loading state */}
            {loading && visibleRows.length === 0 && (
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={15}
                    className="text-center py-6 text-xs"
                  >
                    Loading records…
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {/* No records */}
            {!loading && visibleRows.length === 0 && (
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={15}
                    className="text-center py-6 text-xs"
                  >
                    No records found
                  </TableCell>
                </TableRow>
              </TableBody>
            )}

            {/* Sections by component type */}
            {!loading && visibleRows.length > 0 && (
              <>
                {(componentType === "all"
                  ? SECTION_CONFIG
                  : SECTION_CONFIG.filter(
                      (s) => s.type === (componentType as SectionKey),
                    )
                ).map((section) => (
                  <AccountsSectionTable
                    key={section.type}
                    type={section.type}
                    label={section.label}
                    rowsForType={groupedVisibleRows[section.type]}
                    onOpenPayNow={handleOpenPayNow}
                  />
                ))}

                {/* Bottom loader / completion row */}
                <TableBody>
                  {visibleCount < filteredRows.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={15}
                        className="text-center py-4 text-xs"
                      >
                        Loading more…
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={15}
                        className="text-center py-4 text-xs"
                      >
                        All rows loaded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </>
            )}
          </Table>
        </div>

        {/* BOTTOM RUNNING TOTAL BAR */}
        <div className="w-full overflow-x-auto border-t border-[#f3e0ff] bg-white">
          <div className="min-w-max flex gap-6 px-6 py-3 items-center text-sm">
            <div className="text-[#4a4260] whitespace-nowrap">
              Total Amount{" "}
              <span className="font-semibold">
                ({formatINR(visibleAmount)})
              </span>
            </div>
            <div className="text-[#4a4260] whitespace-nowrap">
              Total Payout{" "}
              <span className="font-semibold">
                ({formatINR(visiblePayout)})
              </span>
            </div>
            <div className="text-[#4a4260] whitespace-nowrap">
              Total Payable{" "}
              <span className="font-semibold">
                ({formatINR(visiblePayable)})
              </span>
            </div>
            <div className={cnProfit(isAllLoaded, visibleProfit)}>
              {formatINR(visibleProfit)}{" "}
              {isAllLoaded ? "(Final Profit)" : "(Running Profit)"}
            </div>
          </div>
        </div>

        <div className="py-4 text-center text-xs text-[#a593c7]">
          DVI Holidays @ 2025
        </div>
      </Card>

      {/* PAY NOW MODAL */}
      {payNowOpen && selectedRow && (
        <PayNowModal
          row={selectedRow}
          paymentModes={paymentModes}
          onClose={handleClosePayNow}
          onSuccess={handlePaySuccess}
        />
      )}
    </div>
  );
};

function cnProfit(allLoaded: boolean, _value: number) {
  if (allLoaded) {
    return "text-[#10a037] font-semibold whitespace-nowrap";
  }
  return "text-[#6f97ff] font-semibold whitespace-nowrap";
}
