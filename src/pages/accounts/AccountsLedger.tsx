// FILE: src/pages/AccountsLedger.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { SharedDatePicker } from "@/components/SharedDatePicker";

// ✅ shadcn components (same as AccountsManager / LatestItinerary)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 🔌 Ledger service + types
import {
  fetchLedgerFromApi,
  fetchLedgerFilterOptions,
  exportLedgerExcel,
  ComponentType,
  LedgerOption,
  LedgerRow,
} from "@/services/accountsLedgerApi";

import {
  getAuthenticatedRoleId,
  getAuthenticatedUser,
} from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";

const formatINR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(v);

// ──────────────────────────────────────────────
// small utils
// ─────────────────────────────────────────────-
function formatToDDMMYYYY(date: Date | undefined) {
  if (!date) return "";
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseDDMMYYYY(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1])
    ? date
    : undefined;
}

function ddmmyyyyToIso(d: string): string {
  // "03/10/2025" -> "2025-10-03"
  if (!d) return "";
  const [day, month, year] = d.split("/");
  if (!day || !month || !year) return "";
  return `${year}-${month}-${day}`;
}

// ──────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────-
export const AccountsLedger: React.FC = () => {

  const authenticatedUser =
  getAuthenticatedUser();

const roleId =
  getAuthenticatedRoleId(
    authenticatedUser,
  );

const isVendor =
  roleId === USER_ROLES.VENDOR;
  // 👇 now all typed
  const [quoteId, setQuoteId] = useState<string>("");

  const [componentType, setComponentType] = useState<ComponentType>("vehicle");

  // we store both: real Date (for calendar) + string (DD/MM/YYYY) for button
  const [fromDateObj, setFromDateObj] = useState<Date | undefined>(
    new Date("2025-10-03")
  );
  const [toDateObj, setToDateObj] = useState<Date | undefined>(
    new Date("2025-11-02")
  );
  const [fromDate, setFromDate] = useState<string>("03/10/2025");
  const [toDate, setToDate] = useState<string>("02/11/2025");

  // conditional fields (selected values)
  const [guideName, setGuideName] =
  useState<string>("0");
const [hotspotName, setHotspotName] =
  useState<string>("0");
const [activityName, setActivityName] =
  useState<string>("0");
const [hotelName, setHotelName] =
  useState<string>("0");

const [branch, setBranch] =
  useState<string>("0");
const [vehicle, setVehicle] =
  useState<string>("0");
const [vehicleVendor, setVehicleVendor] =
  useState<string>("0");

const [agentName, setAgentName] =
  useState<string>("0");

  // DROPDOWN OPTIONS (dynamic, from backend)
 const defaultOptions: LedgerOption[] = [
  {
    id: 0,
    label: "All",
  },
];

const [guideOptions, setGuideOptions] =
  useState<LedgerOption[]>(defaultOptions);

const [hotspotOptions, setHotspotOptions] =
  useState<LedgerOption[]>(defaultOptions);

const [activityOptions, setActivityOptions] =
  useState<LedgerOption[]>(defaultOptions);

const [hotelOptions, setHotelOptions] =
  useState<LedgerOption[]>(defaultOptions);

const [branchOptions, setBranchOptions] =
  useState<LedgerOption[]>(defaultOptions);

const [vehicleOptions, setVehicleOptions] =
  useState<LedgerOption[]>(defaultOptions);

const [vendorOptions, setVendorOptions] =
  useState<LedgerOption[]>(defaultOptions);

const [agentOptions, setAgentOptions] =
  useState<LedgerOption[]>(defaultOptions);

  // fetched rows
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // infinite scroll
  const [visibleCount, setVisibleCount] = useState<number>(25);
  const listRef = useRef<HTMLDivElement | null>(null);

  // fetch ledger rows when filters change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchLedgerFromApi({
          quoteId,
          componentType,
          fromDate,
          toDate,
          guideName,
          hotspotName,
          activityName,
          hotelName,
          branch,
          vehicle,
          vehicleVendor,
          agentName,
        });
        if (!cancelled) {
          setRows(data);
          setVisibleCount(25);
        }
      } catch (err) {
        console.error("Error fetching ledger:", err);
        if (!cancelled) {
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    quoteId,
    componentType,
    fromDate,
    toDate,
    guideName,
    hotspotName,
    activityName,
    hotelName,
    branch,
    vehicle,
    vehicleVendor,
    agentName,
  ]);

  // fetch dynamic dropdown options (like PHP: based on current filters)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await fetchLedgerFilterOptions({
          quoteId,
          componentType,
          fromDate,
          toDate,
        });
        if (cancelled) return;

        setGuideOptions(opts.guides);
        setHotspotOptions(opts.hotspots);
        setActivityOptions(opts.activities);
        setHotelOptions(opts.hotels);
        setBranchOptions(opts.vehicleBranches);
        setVehicleOptions(opts.vehicles);
        setVendorOptions(opts.vendors);
        setAgentOptions(opts.agents);

        const hasOption = (
  options: LedgerOption[],
  value: string,
) =>
  options.some(
    (option) =>
      String(option.id) === value,
  );

if (!hasOption(opts.agents, agentName)) {
  setAgentName("0");
}

if (!hasOption(opts.guides, guideName)) {
  setGuideName("0");
}

if (!hasOption(opts.hotspots, hotspotName)) {
  setHotspotName("0");
}

if (
  !hasOption(
    opts.activities,
    activityName,
  )
) {
  setActivityName("0");
}

if (!hasOption(opts.hotels, hotelName)) {
  setHotelName("0");
}

if (
  !hasOption(
    opts.vehicleBranches,
    branch,
  )
) {
  setBranch("0");
}

if (!hasOption(opts.vehicles, vehicle)) {
  setVehicle("0");
}

if (isVendor) {
  const ownVendor =
    opts.vendors.find(
      (option) => option.id > 0,
    );

  setVehicleVendor(
    ownVendor
      ? String(ownVendor.id)
      : "0",
  );
} else if (
  !hasOption(
    opts.vendors,
    vehicleVendor,
  )
) {
  setVehicleVendor("0");
}
      } catch (err) {
        console.error("Error fetching ledger filter options:", err);
        // keep existing options if request fails
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId, componentType, fromDate, toDate]);

  const totals = useMemo(() => {
    const billed = rows.reduce((s, r) => s + r.totalBilled, 0);
    const received = rows.reduce((s, r) => s + r.totalReceived, 0);
    const receivable = rows.reduce((s, r) => s + r.totalReceivable, 0);
    const paid = rows.reduce((s, r) => s + r.totalPaid, 0);
    const balance = rows.reduce((s, r) => s + r.totalBalance, 0);
    return { billed, received, receivable, paid, balance };
  }, [rows]);

  // infinite scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) {
        setVisibleCount((prev) => Math.min(prev + 25, rows.length));
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [rows.length]);

  const handleClear = () => {
    setQuoteId("");
    setComponentType("vehicle");
    setFromDate("03/10/2025");
    setToDate("02/11/2025");
    setFromDateObj(new Date("2025-10-03"));
    setToDateObj(new Date("2025-11-02"));
    setGuideName("All");
    setHotspotName("All");
    setActivityName("All");
    setHotelName("All");
    setBranch("All");
    setVehicle("All");
    setVehicleVendor("All");
    setAgentName("All");
  };

  const handleExportExcel = async () => {
    try {
      await exportLedgerExcel(componentType, quoteId, fromDate, toDate);
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Failed to export Excel");
    }
  };

  const renderRightFieldRow1 = () => {
    switch (componentType) {
      case "vehicle":
        return (
          <div className="space-y-2">
            <Label className="text-sm text-[#4a4260]">Vendor</Label>
           <Select
  value={vehicleVendor}
  disabled={isVendor}
  onValueChange={(v) =>
    setVehicleVendor(v)
  }
>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {vendorOptions.map((v) => (
  <SelectItem
    key={v.id}
    value={String(v.id)}
  >
    {v.label}
  </SelectItem>
))}
              </SelectContent>
            </Select>
          </div>
        );
      case "agent":
        return (
          <div className="space-y-2">
            <Label className="text-sm text-[#4a4260]">Agent</Label>
            <Select value={agentName} onValueChange={(v) => setAgentName(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
               {agentOptions.map((a) => (
  <SelectItem
    key={a.id}
    value={String(a.id)}
  >
    {a.label}
  </SelectItem>
))}
              </SelectContent>
            </Select>
          </div>
        );
      case "guide":
        return (
          <div className="space-y-2">
            <Label className="text-sm text-[#4a4260]">Guide Name</Label>
            <Select value={guideName} onValueChange={(v) => setGuideName(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
               {guideOptions.map((g) => (
  <SelectItem
    key={g.id}
    value={String(g.id)}
  >
    {g.label}
  </SelectItem>
))}
              </SelectContent>
            </Select>
          </div>
        );
      case "hotspot":
        return (
          <div className="space-y-2">
            <Label className="text-sm text-[#4a4260]">Hotspot Name</Label>
            <Select value={hotspotName} onValueChange={(v) => setHotspotName(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
              {hotelOptions.map((h) => (
  <SelectItem
    key={h.id}
    value={String(h.id)}
  >
    {h.label}
  </SelectItem>
))}
              </SelectContent>
            </Select>
          </div>
        );
      case "activity":
        return (
          <div className="space-y-2">
            <Label className="text-sm text-[#4a4260]">Activity Name</Label>
            <Select value={activityName} onValueChange={(v) => setActivityName(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
             {activityOptions.map((h) => (
  <SelectItem
    key={h.id}
    value={String(h.id)}
  >
    {h.label}
  </SelectItem>
))}
              </SelectContent>
            </Select>
          </div>
        );
      case "hotel":
        return (
          <div className="space-y-2">
            <Label className="text-sm text-[#4a4260]">Hotel Name</Label>
            <Select value={hotelName} onValueChange={(v) => setHotelName(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
              {hotelOptions.map((h) => (
  <SelectItem
    key={h.id}
    value={String(h.id)}
  >
    {h.label}
  </SelectItem>
))}
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return <div />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fbeef8] p-4 md:p-6">
      {/* FILTER CARD */}
      <div className="bg-[#fefefe]/40 rounded-xl border border-[#f6dfff] mb-5">
        <div className="px-6 py-5">
          <p className="text-sm font-semibold text-[#4a4260] mb-4">FILTER</p>

          {/* ROW 1 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            {/* Quote ID */}
            <div className="space-y-2">
              <Label className="text-sm text-[#4a4260]">Quote ID</Label>
              <Input
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                placeholder="Enter the Quote ID"
                className="h-9"
              />
            </div>

            {/* Component Type */}
            <div className="space-y-2">
              <Label className="text-sm text-[#4a4260]">Component Type</Label>
            <Select
  value={componentType}
  disabled={isVendor}
  onValueChange={(v) =>
    setComponentType(
      v as ComponentType,
    )
  }
>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Component" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="hotspot">Hotspot</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <Label className="text-sm text-[#4a4260]">From Date</Label>
              <SharedDatePicker
                label="From Date"
                value={fromDate}
                placeholder="DD/MM/YYYY"
                triggerClassName="h-9 w-full"
                parseValue={parseDDMMYYYY}
                formatValue={formatToDDMMYYYY}
                onChange={(value) => {
                  setFromDate(value);
                  setFromDateObj(parseDDMMYYYY(value));
                }}
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <Label className="text-sm text-[#4a4260]">To Date</Label>
              <SharedDatePicker
                label="To Date"
                value={toDate}
                placeholder="DD/MM/YYYY"
                minDate={parseDDMMYYYY(fromDate)}
                defaultMonth={parseDDMMYYYY(fromDate)}
                triggerClassName="h-9 w-full"
                parseValue={parseDDMMYYYY}
                formatValue={formatToDDMMYYYY}
                onChange={(value) => {
                  setToDate(value);
                  setToDateObj(parseDDMMYYYY(value));
                }}
              />
            </div>

            {/* right dynamic field */}
            {renderRightFieldRow1()}
          </div>

          {/* ROW 2 — VEHICLE */}
          {componentType === "vehicle" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mt-4">
              {/* Branch */}
              <div className="space-y-2">
                <Label className="text-sm text-[#4a4260]">Branch</Label>
                <Select value={branch} onValueChange={(v) => setBranch(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                   {branchOptions.map((b) => (
  <SelectItem
    key={b.id}
    value={String(b.id)}
  >
    {b.label}
  </SelectItem>
))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle */}
              <div className="space-y-2">
                <Label className="text-sm text-[#4a4260]">Vehicle</Label>
                <Select value={vehicle} onValueChange={(v) => setVehicle(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleOptions.map((val) => (
  <SelectItem
    key={val.id}
    value={String(val.id)}
  >
    {val.label}
  </SelectItem>
))}
                  </SelectContent>
                </Select>
              </div>

              {/* spacer */}
              <div className="hidden md:block md:col-span-2" />

              {/* Clear */}
              <div className="flex md:justify-end">
                <Button
                  onClick={handleClear}
                  className="h-9 px-6 bg-[#f057b8] hover:bg-[#df43a6] text-white text-sm font-medium"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* NON vehicle clear */}
          {componentType !== "vehicle" && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleClear}
                className="h-9 px-6 bg-[#f057b8] hover:bg-[#df43a6] text-white text-sm font-medium"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Billed</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totals.billed)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Received</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totals.received)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Receivable</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totals.receivable)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Paid</p>
          <p className="text-xl font-semibold text-[#3d3551]">
            {formatINR(totals.paid)}
          </p>
        </div>
        <div className="bg-white rounded-md shadow-sm py-4 px-5">
          <p className="text-sm text-[#8a7da5] mb-1">Total Balance</p>
          <p className="text-xl font-semibold text-[#10a037]">
            {formatINR(totals.balance)}
          </p>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white/70 rounded-xl border border-[#f6dfff]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <p className="text-sm font-semibold text-[#4a4260]">
            {componentType === "agent" && "List of Agent"}
            {componentType === "vehicle" && "List of Vehicle"}
            {componentType === "hotel" && "List of Hotel"}
            {componentType === "guide" && "List of Guide"}
            {componentType === "hotspot" && "List of Hotspot"}
            {componentType === "activity" && "List of Activity"}
            {componentType === "all" && "List of All Components"}
          </p>
          <Button
            onClick={handleExportExcel}
            className="h-9 px-4 gap-2 rounded-md bg-[#e5fff1] border border-[#b7f7d9] text-[#0f9c34] text-sm flex items-center"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        <div
          ref={listRef}
          className="max-h-[460px] overflow-y-auto border-t border-[#f3e0ff]"
        >
          <table className="min-w-full text-sm">
            <thead className="bg-[#fbf2ff] sticky top-0 z-10">
              <tr>
                <th className="text-left px-6 py-3 text-xs text-[#4a4260]">
                  BOOKING ID
                </th>
                <th className="text-left px-3 py-3 text-xs text-[#4a4260]">
                  AGENT NAME
                </th>
                <th className="text-right px-3 py-3 text-xs text-[#4a4260]">
                  TOTAL BILLED
                </th>
                <th className="text-right px-3 py-3 text-xs text-[#4a4260]">
                  TOTAL RECEIVED
                </th>
                <th className="text-right px-3 py-3 text-xs text-[#4a4260]">
                  TOTAL RECEIVABLE
                </th>
                <th className="text-right px-3 py-3 text-xs text-[#4a4260]">
                  TOTAL PAID
                </th>
                <th className="text-right px-3 py-3 text-xs text-[#4a4260]">
                  TOTAL BALANCE
                </th>
                <th className="text-left px-3 py-3 text-xs text-[#4a4260]">
                  GUEST
                </th>
                <th className="text-left px-3 py-3 text-xs text-[#4a4260]">
                  ARRIVAL
                </th>
                <th className="text-left px-3 py-3 text-xs text-[#4a4260]">
                  START DATE
                </th>
                <th className="text-left px-3 py-3 text-xs text-[#4a4260]">
                  END DATE
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-xs">
                    Loading records…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-16 text-[#f4008f] text-sm"
                  >
                    No data Found
                  </td>
                </tr>
              ) : (
                rows.slice(0, visibleCount).map((row) => (
                  <tr key={row.id} className="hover:bg-[#fff7ff]">
                    <td className="px-6 py-2 text-[#7032c8] font-medium">
                      {row.bookingId}
                    </td>
                    <td className="px-3 py-2 text-[#4a4260]">
                      {row.agentName}
                    </td>
                    <td className="px-3 py-2 text-right text-[#4a4260]">
                      {formatINR(row.totalBilled)}
                    </td>
                    <td className="px-3 py-2 text-right text-[#4a4260]">
                      {formatINR(row.totalReceived)}
                    </td>
                    <td className="px-3 py-2 text-right text-[#4a4260]">
                      {formatINR(row.totalReceivable)}
                    </td>
                    <td className="px-3 py-2 text-right text-[#4a4260]">
                      {formatINR(row.totalPaid)}
                    </td>
                    <td className="px-3 py-2 text-right text-[#4a4260]">
                      {formatINR(row.totalBalance)}
                    </td>
                    <td className="px-3 py-2 text-[#4a4260]">{row.guest}</td>
                    <td className="px-3 py-2 text-[#4a4260]">{row.arrival}</td>
                    <td className="px-3 py-2 text-[#4a4260]">
                      {row.startDate}
                    </td>
                    <td className="px-3 py-2 text-[#4a4260]">{row.endDate}</td>
                  </tr>
                ))
              )}

              {!loading &&
                rows.length > 0 &&
                visibleCount < rows.length && (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-xs">
                      Loading more…
                    </td>
                  </tr>
                )}

              {!loading &&
                rows.length > 0 &&
                visibleCount >= rows.length && (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-xs">
                      All rows loaded
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="py-4 text-center text-xs text-[#a593c7]">
          DVI Holidays @ 2025
        </div>
      </div>
    </div>
  );
};
