// REPLACE-WHOLE-FILE: src/pages/VehicleAvailability/VehicleAvailabilityPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Ban, Pencil, Share2 } from "lucide-react";
import AutoSuggestSelect from "@/components/AutoSuggestSelect";
import {
  assignVehicle,
  blockVehicleAvailability,
  fetchAgents,
  fetchDriversForAssign,
  fetchVehicleAvailability,
  fetchVehiclesForAssign,
  fetchVehicleTypes,
  fetchVendorVehicleTypes,
  fetchVendors,
  fetchLocations,
  SimpleOption,
  VehicleAvailabilityCell,
  VehicleAvailabilityResponse,
  VehicleAvailabilityRow,
} from "@/services/vehicle-availability";
import { AddVehicleModal } from "./modals/AddVehicleModal";
import { AddDriverModal } from "./modals/AddDriverModal";
import {
  VehicleAvailabilityActionModals,
  type SelectedCell,
} from "./components/VehicleAvailabilityActionModals";


function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function toYmd(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { dateFrom: toYmd(first), dateTo: toYmd(last) };
}

function includeOptionIfMissing(options: SimpleOption[], id: number, fallbackLabel: string): SimpleOption[] {
  if (options.some((o) => Number(o.id) === Number(id))) return options;
  return [{ id, label: fallbackLabel }, ...options];
}


export default function VehicleAvailabilityPage() {
  const initialRange = useMemo(() => defaultMonthRange(), []);
  const today = useMemo(() => toYmd(new Date()), []);

  // filter UI
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [vendorIds, setVendorIds] = useState<number[]>([]);
  const [vehicleTypeIds, setVehicleTypeIds] = useState<number[]>([]);
  const [agentIds, setAgentIds] = useState<number[]>([]);
  // Location filter is now string-based (derived from API routeSegments)
  const [locationLabels, setLocationLabels] = useState<string[]>([]);

  // lookups
  const [vendors, setVendors] = useState<SimpleOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<SimpleOption[]>([]);
  const [agents, setAgents] = useState<SimpleOption[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [vendorVehicleTypesForFilter, setVendorVehicleTypesForFilter] = useState<SimpleOption[]>([]);


  // chart
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<VehicleAvailabilityResponse>({ dates: [], rows: [] });

  // search
  const [search, setSearch] = useState("");
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addDriverOpen, setAddDriverOpen] = useState(false);

const [assigning, setAssigning] = useState(false);
const [assignModalOpen, setAssignModalOpen] = useState(false);

const [blocking, setBlocking] = useState(false);
const [blockModalOpen, setBlockModalOpen] = useState(false);
const [blockContext, setBlockContext] = useState<SelectedCell>(null);
const [blockReason, setBlockReason] = useState("");
  const [assignContext, setAssignContext] = useState<SelectedCell>(null);
  const [assignVehicleId, setAssignVehicleId] = useState<number | "">("");
  const [assignDriverId, setAssignDriverId] = useState<number | "">("");
  const [assignVehicleOptions, setAssignVehicleOptions] = useState<SimpleOption[]>([]);
  const [assignDriverOptions, setAssignDriverOptions] = useState<SimpleOption[]>([]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter((r) => {
      const s =
        `${r.vendorName} ${r.vendorId} ${r.vehicleTypeTitle} ${r.vehicleTypeId} ${r.registrationNumber} ${r.vehicleId}`.toLowerCase();
      return s.includes(q);
    });
  }, [data.rows, search]);

    async function loadLocationsBase(q?: string) {
    try {
      const opts = await fetchLocations(q); // [{ id, label }]
      const labels = (opts || []).map(o => o.label).filter(Boolean);
      setLocations(prev =>
        Array.from(new Set([...(prev || []), ...labels])).sort((a, b) => a.localeCompare(b)),
      );
    } catch {
      // keep silent; locations are optional
    }
  }

  function extractLocationsFromAvailability(res: VehicleAvailabilityResponse): string[] {
  const set = new Set<string>();

  for (const row of res.rows || []) {
    for (const cell of row.cells || []) {
      for (const seg of cell.routeSegments || []) {
        const a = (seg.locationName || "").trim();
        const b = (seg.nextVisitingLocation || "").trim();
        if (a) set.add(a);
        if (b) set.add(b);
      }
    }
  }

  return Array.from(set).sort((x, y) => x.localeCompare(y));
}

function rowHasLocation(row: VehicleAvailabilityRow, location: string): boolean {
  const needle = location.trim().toLowerCase();
  if (!needle) return true;

  for (const cell of row.cells || []) {
    for (const seg of cell.routeSegments || []) {
      if ((seg.locationName || "").trim().toLowerCase() === needle) return true;
      if ((seg.nextVisitingLocation || "").trim().toLowerCase() === needle) return true;
    }
  }
  return false;
}

   async function loadLookups() {
    setError("");
    try {
      const [v, vt, a] = await Promise.all([fetchVendors(), fetchVehicleTypes(), fetchAgents()]);
      setVendors(v);
      setVehicleTypes(vt);
      setAgents(a);

      // clear then prefill a base set of locations from backend
      setLocations([]);
      await loadLocationsBase(); // fills from arrival/departure labels even if chart has zero rows
    } catch (e: any) {
      setError(e?.message || "Failed to load dropdown data.");
      setVendors([]);
      setVehicleTypes([]);
      setAgents([]);
      setLocations([]);
    }
  }

  async function loadChart(override?: {
    dateFrom?: string;
    dateTo?: string;
    vendorIds?: number[];
    vehicleTypeIds?: number[];
    agentIds?: number[];
    locationLabels?: string[];
  }) {
    const nextDateFrom = override?.dateFrom ?? dateFrom;
    const nextDateTo = override?.dateTo ?? dateTo;
    const nextVendorIds = override?.vendorIds ?? vendorIds;
    const nextVehicleTypeIds = override?.vehicleTypeIds ?? vehicleTypeIds;
    const nextAgentIds = override?.agentIds ?? agentIds;
    const nextLocationLabels = override?.locationLabels ?? locationLabels;

    setLoading(true);
    setError("");
    try {
      const res = await fetchVehicleAvailability({
        dateFrom: nextDateFrom,
        dateTo: nextDateTo,
        vendorIds: nextVendorIds.length > 0 ? nextVendorIds : undefined,
        vehicleTypeIds: nextVehicleTypeIds.length > 0 ? nextVehicleTypeIds : undefined,
        agentIds: nextAgentIds.length > 0 ? nextAgentIds : undefined,
        locationLabels: nextLocationLabels.length > 0 ? nextLocationLabels : undefined,
      });

    // 1) Build dynamic dropdown options from routeSegments, then MERGE with base list
    const derivedLocations = extractLocationsFromAvailability(res);
    setLocations(prev =>
      Array.from(new Set([...(prev || []), ...derivedLocations])).sort((x, y) => x.localeCompare(y)),
    );

    // 2) Keep a client-side fallback filter for exact route-label parity.
    const rowsFilteredByLoc =
      nextLocationLabels.length > 0
        ? res.rows.filter((r) => nextLocationLabels.some((label) => rowHasLocation(r, label)))
        : res.rows;

    setData({ ...res, rows: rowsFilteredByLoc });
    } catch (e: any) {
      setError(e?.message || "Failed to load vehicle availability.");
      setData({ dates: [], rows: [] });
    } finally {
      setLoading(false);
    }
  }

 async function handleShareLink(cell: VehicleAvailabilityCell) {
  const driverAssignmentId = Number(cell.driverAssignmentId || 0);

  if (!driverAssignmentId) {
    setError("Driver assignment ID is missing.");
    return;
  }

 const shareUrl =
  `${window.location.origin}/daily-moment/driver/${driverAssignmentId}`;

  try {
    await navigator.clipboard.writeText(shareUrl);
    window.alert("Driver Daily Moment link copied successfully.");
  } catch {
    window.prompt("Copy Driver Daily Moment link:", shareUrl);
  }
}

  function openBlockModal(
    row: VehicleAvailabilityRow,
    cell: VehicleAvailabilityCell,
  ) {
    setBlockContext({ row, cell });
    setBlockReason("");
    setBlockModalOpen(true);
  }

  async function submitBlockVehicle() {
    if (!blockContext) return;

    try {
      setBlocking(true);
      setError("");

      await blockVehicleAvailability({
        vehicleId: blockContext.row.vehicleId,
        dateFrom: blockContext.cell.date,
        dateTo: blockContext.cell.date,
        reason: blockReason.trim() || undefined,
      });

      setBlockModalOpen(false);
      setBlockContext(null);
      setBlockReason("");

      await loadChart();
    } catch (e: any) {
      setError(e?.message || "Failed to block vehicle.");
    } finally {
      setBlocking(false);
    }
  }

  async function openAssignModal(
    row: VehicleAvailabilityRow,
    cell: VehicleAvailabilityCell
  ) {
    if (!cell.itineraryPlanId) return;
    const existingVehicleId = cell.isVehicleAssigned ? cell.assignedVehicleId : null;
    const existingDriverId = cell.hasDriver ? cell.driverId : null;

    setAssignContext({ row, cell });
    setAssignVehicleId(existingVehicleId ?? "");
    setAssignDriverId(existingDriverId ?? "");
    setAssignVehicleOptions([]);
    setAssignDriverOptions([]);
    setAssignModalOpen(true);

    try {
      const [vehicles, drivers] = await Promise.all([
        fetchVehiclesForAssign(row.vendorId, row.vehicleTypeId),
        fetchDriversForAssign(row.vendorId, row.vehicleTypeId, cell.itineraryPlanId),
      ]);
      let vehicleOptions = vehicles || [];
      let driverOptions = drivers || [];

      if (existingVehicleId) {
        vehicleOptions = includeOptionIfMissing(vehicleOptions, existingVehicleId, row.registrationNumber || `Vehicle #${existingVehicleId}`);
      }
      if (existingDriverId) {
        driverOptions = includeOptionIfMissing(driverOptions, existingDriverId, `Driver #${existingDriverId}`);
      }

      setAssignVehicleOptions(vehicleOptions);
      setAssignDriverOptions(driverOptions);
    } catch (e: any) {
      setError(e?.message || "Failed to load assign options.");
    }
  }

  async function submitAssignVehicle() {
    if (!assignContext?.cell.itineraryPlanId) return;
    if (assignVehicleId === "") {
      setError("Please choose a vehicle to assign.");
      return;
    }

    try {
      setAssigning(true);
      await assignVehicle({
        itineraryPlanId: assignContext.cell.itineraryPlanId,
        vendor_id: assignContext.row.vendorId,
        vehicle_type_id: assignContext.row.vehicleTypeId,
        vehicle_id: Number(assignVehicleId),
        driver_id: assignDriverId === "" ? null : Number(assignDriverId),
      });
      setAssignModalOpen(false);
      setAssignContext(null);
      await loadChart();
    } catch (e: any) {
      setError(e?.message || "Failed to assign vehicle.");
    } finally {
      setAssigning(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function loadVendorVehicleTypeOptions() {
      if (vendorIds.length === 0) {
        setVendorVehicleTypesForFilter(vehicleTypes);
        return;
      }

      try {
        const opts = await fetchVendorVehicleTypes(vendorIds);
        if (!alive) return;
        setVendorVehicleTypesForFilter(opts || []);
      } catch {
        if (!alive) return;
        setVendorVehicleTypesForFilter(
          data.rows
            .filter((row) => vendorIds.includes(row.vendorId))
            .map((row) => ({ id: row.vehicleTypeId, label: row.vehicleTypeTitle || `Type #${row.vehicleTypeId}` }))
            .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx)
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      }
    }

    loadVendorVehicleTypeOptions();
    return () => {
      alive = false;
    };
  }, [vendorIds, vehicleTypes, data.rows]);

  const vehicleTypeOptionsForFilter = useMemo(() => {
    if (vendorIds.length === 0) return vehicleTypes;
    if (vendorVehicleTypesForFilter.length > 0) return vendorVehicleTypesForFilter;
    return data.rows
      .filter((r) => vendorIds.includes(r.vendorId))
      .map((r) => ({ id: r.vehicleTypeId, label: r.vehicleTypeTitle || `Type #${r.vehicleTypeId}` }))
      .filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vendorIds, vehicleTypes, vendorVehicleTypesForFilter, data.rows]);

  useEffect(() => {
    if (vehicleTypeIds.length === 0) return;
    const allowed = new Set(
      vehicleTypeOptionsForFilter.map((option) => Number(option.id)).filter((id) => Number.isFinite(id) && id > 0),
    );
    const next = vehicleTypeIds.filter((id) => allowed.has(Number(id)));
    if (next.length !== vehicleTypeIds.length) {
      setVehicleTypeIds(next);
    }
  }, [vehicleTypeIds, vehicleTypeOptionsForFilter]);

  function handleClear() {
    const r = defaultMonthRange();
    setDateFrom(r.dateFrom);
    setDateTo(r.dateTo);
    setVendorIds([]);
    setVehicleTypeIds([]);
    setAgentIds([]);
    setLocationLabels([]);
    setSearch("");
    loadChart({
      dateFrom: r.dateFrom,
      dateTo: r.dateTo,
      vendorIds: [],
      vehicleTypeIds: [],
      agentIds: [],
      locationLabels: [],
    });
  }

  useEffect(() => {
    loadLookups();
    loadChart();
    // also try to prefill with a small popular set (no query) at mount
    loadLocationsBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const stickyHeaderClass = "sticky top-0 z-30 border border-slate-300 bg-[#9b9b9b] text-white";
const stickyCol1 = "sticky left-0 z-40 min-w-[160px] w-[160px] border-r border-slate-300";
const stickyCol2 = "sticky left-[160px] z-40 min-w-[180px] w-[180px] border-r border-slate-300";
  function formatDisplayDate(ymd: string) {
    const d = new Date(`${ymd}T00:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate().toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${month} ${day},${year}`;
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-end">
        <span className="text-sm text-slate-500">Legacy PHP UI parity mode</span>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h5 className="text-base font-semibold text-slate-800">List of Vehicle Availability</h5>
        </div>

        <div className="relative z-[200] mx-4 my-4 rounded-lg border border-indigo-300 bg-transparent p-4">
          <h5 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Filter</h5>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Date from</label>
              <input
                type="date"
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Date To</label>
              <input
                type="date"
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Vendor</label>
              <AutoSuggestSelect
                mode="multi"
                value={vendorIds.map(String)}
                options={vendors.map((v) => ({ value: String(v.id), label: v.label }))}
                onChange={(next) =>
                  setVendorIds(
                    (next as string[])
                      .map((value) => Number(value))
                      .filter((id) => Number.isFinite(id) && id > 0),
                  )
                }
                placeholder="Choose Vendor"
                stackingZIndex={120}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Vehicle Type</label>
              <AutoSuggestSelect
                mode="multi"
                value={vehicleTypeIds.map(String)}
                options={vehicleTypeOptionsForFilter.map((v) => ({ value: String(v.id), label: v.label }))}
                onChange={(next) =>
                  setVehicleTypeIds(
                    (next as string[])
                      .map((value) => Number(value))
                      .filter((id) => Number.isFinite(id) && id > 0),
                  )
                }
                placeholder="Choose Vehicle Types"
                stackingZIndex={120}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Agent</label>
              <AutoSuggestSelect
                mode="multi"
                value={agentIds.map(String)}
                options={agents.map((a) => ({ value: String(a.id), label: a.label }))}
                onChange={(next) =>
                  setAgentIds(
                    (next as string[])
                      .map((value) => Number(value))
                      .filter((id) => Number.isFinite(id) && id > 0),
                  )
                }
                placeholder="Select Agent"
                stackingZIndex={120}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Location</label>
              <AutoSuggestSelect
                mode="multi"
                value={locationLabels}
                options={locations.map((label) => ({ value: label, label }))}
                onChange={(next) =>
                  setLocationLabels((next as string[]).filter((label) => label.trim().length > 0))
                }
                placeholder="Choose Location"
                stackingZIndex={120}
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                className="h-11 w-[120px] rounded-md bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                onClick={() => {
                  loadChart();
                }}
                disabled={loading}
                type="button"
              >
                {loading ? "Loading..." : "Apply"}
              </button>

              <button
                className="h-11 w-[120px] rounded-md bg-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-400"
                onClick={handleClear}
                type="button"
                disabled={loading}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-0 mb-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-semibold text-slate-900">
            Vehicle Availability Chart
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-md border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
              type="button"
              onClick={() => setAddDriverOpen(true)}
            >
              + Add Driver
            </button>
            <button
              className="rounded-md border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
              type="button"
              onClick={() => setAddVehicleOpen(true)}
            >
              + Add Vehicle
            </button>

            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-700">Search:</div>
              <input
                className="h-9 w-[220px] rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder=""
              />
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {/* Chart Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="max-h-[75vh] overflow-auto">
          <table className="min-w-max border-collapse text-sm">
            <thead>
              <tr>

<th
 className={clsx(
  stickyHeaderClass,
  stickyCol1,
  "z-50 min-w-[160px] w-[160px] bg-[#9b9b9b] p-3 text-left text-sm font-semibold text-white",
)}
>
  Vendor
</th>

<th
  className={clsx(
    stickyHeaderClass,
    stickyCol2,
      "z-50 min-w-[180px] w-[180px] bg-[#9b9b9b] p-3 text-left text-sm font-semibold text-white",
  )}
>
  Vehicle Type
</th>

{data.dates.map((d) => (
  <th
    key={d}
    className={clsx(
      stickyHeaderClass,
      "min-w-[140px] p-3 text-left text-sm font-semibold",
    )}
  >
    {formatDisplayDate(d)}
  </th>
))}

                  
              
              </tr>
            </thead>

            <tbody>
              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + data.dates.length}
                    className="p-4 text-center text-slate-600"
                  >
                    No vehicle availability data for this range.
                  </td>
                </tr>
              ) : null}

              {filteredRows.map((row) => (
                <tr key={`${row.vendorId}-${row.vehicleTypeId}-${row.vehicleId}`}>
                  <td className={clsx(stickyCol1, "border border-slate-300 bg-[#fbf9ff] p-3 align-top")}>
                    <div className="text-sm font-medium text-slate-900">
                      {row.vendorName || `Vendor #${row.vendorId}`}
                    </div>
                  </td>

                 <td className={clsx(stickyCol2, "border border-slate-300 bg-[#fbf9ff] p-3 align-top")}>
                    <div className="text-sm font-medium text-slate-900">
                      {row.vehicleTypeTitle?.trim()
                        ? row.vehicleTypeTitle
                        : `Type #${row.vehicleTypeId}`}
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-blue-700">{row.registrationNumber}</span>
                    </div>
                  </td>

                  {row.cells.map((cell) => {
                    const inTrip = Boolean(cell.isWithinTrip && cell.itineraryPlanId);
                    const bg = !inTrip
                      ? "bg-white"
                      : cell.isStart
                      ? "bg-[#e0d7fa96]"
                      : cell.isEnd
                      ? "bg-[#dffbdf]"
                      : "bg-[#faebd794]";

                    const todayRing = cell.date === today ? "ring-1 ring-slate-500" : "";

                    return (
                      <td
                        key={`${row.vehicleId}-${cell.date}`}
                        className={clsx("border border-slate-300 px-2 py-2 align-top", bg)}
                      >
                        {!cell.itineraryPlanId ? null : (
                          <div className={clsx("rounded p-1", todayRing)}>
                            {!cell.isVehicleAssigned ? (
                              <button
                                type="button"
                                className="mb-2 rounded bg-green-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-green-700"
                                onClick={() => openAssignModal(row, cell)}
                              >
                                + Assign Vehicle
                              </button>
                            ) : null}

                            <h6 className="mb-1 text-xs font-semibold text-blue-700">
                              {cell.itineraryQuoteId || `CQ-PLAN-${cell.itineraryPlanId}`}
                              {cell.isStart ? " • Start" : cell.isEnd ? " • End" : ""}
                            </h6>

                            {(cell.customerLabel || cell.hotelName || cell.tripStartLabel || cell.tripEndLabel) ? (
                              <div className="mb-2 space-y-0.5 text-[11px] text-slate-700">
                                {cell.customerLabel ? (
                                  <div className="font-medium text-slate-900">{cell.customerLabel}</div>
                                ) : null}
                                {cell.customerContactNo ? (
                                  <div>Contact: {cell.customerContactNo}</div>
                                ) : null}
                                {cell.hotelName ? <div>Hotel: {cell.hotelName}</div> : null}
                                {(cell.tripStartLabel || cell.tripStartTime || cell.tripEndLabel || cell.tripEndTime) ? (
                                  <div>
                                    {cell.tripStartLabel || cell.tripStartTime || "Start"}
                                    {cell.tripStartTime ? ` | ${cell.tripStartTime}` : ""}
                                    {(cell.tripEndLabel || cell.tripEndTime) ? ` → ${cell.tripEndLabel || ""}${cell.tripEndTime ? ` | ${cell.tripEndTime}` : ""}` : ""}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {cell.routeSegments.length > 0 ? (
                              <div className="mb-2 space-y-1">
                                {cell.routeSegments.slice(0, 2).map((seg, idx) => (
                                  <div key={`${idx}-${seg.locationName}-${seg.nextVisitingLocation}`} className="text-xs text-slate-800">
                                    {seg.locationName} =&gt; {seg.nextVisitingLocation}
                                  </div>
                                ))}
                              </div>
                            ) : null}

                     <div>
  <div className="mb-1 text-xs text-slate-700">
    Driver - {cell.hasDriver ? "Assigned" : "Not Assigned"}
  </div>

  <div className="flex flex-wrap items-center gap-2">
    <span
      className={clsx(
        "inline-flex rounded px-2 py-[4px] text-[10px] font-semibold",
        cell.isVehicleAssigned
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-100 text-slate-700",
      )}
    >
      {cell.isVehicleAssigned ? "Assigned" : "Unassigned"}
    </span>

    {cell.isVehicleAssigned && cell.hasDriver ? (
      <button
        type="button"
        onClick={() => handleShareLink(cell)}
        className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-purple-600 to-pink-500 px-2 py-[4px] text-[10px] font-semibold text-white hover:opacity-90"
        title="Copy driver daily moment link"
      >
        <Share2 size={12} />
        Share Link
      </button>
    ) : null}

    {cell.isVehicleAssigned ? (
      <button
        type="button"
        onClick={() => openBlockModal(row, cell)}
        className="inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-[4px] text-[10px] font-semibold text-white hover:bg-amber-600"
        title="Block vehicle for this date"
      >
        <Ban size={12} />
        Block
      </button>
    ) : null}

    {cell.isVehicleAssigned ? (
      <button
        type="button"
        className="rounded p-1 text-slate-600 hover:bg-slate-100"
        onClick={() => openAssignModal(row, cell)}
        title="Edit assignment"
      >
        <Pencil size={14} />
      </button>
    ) : null}
  </div>
</div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <VehicleAvailabilityActionModals
        assignModalOpen={assignModalOpen}
        setAssignModalOpen={setAssignModalOpen}
        assignContext={assignContext}
        setAssignContext={setAssignContext}
        assigning={assigning}
        assignVehicleId={assignVehicleId}
        setAssignVehicleId={setAssignVehicleId}
        assignDriverId={assignDriverId}
        setAssignDriverId={setAssignDriverId}
        assignVehicleOptions={assignVehicleOptions}
        assignDriverOptions={assignDriverOptions}
        submitAssignVehicle={submitAssignVehicle}
        blockModalOpen={blockModalOpen}
        setBlockModalOpen={setBlockModalOpen}
        blockContext={blockContext}
        setBlockContext={setBlockContext}
        blocking={blocking}
        blockReason={blockReason}
        setBlockReason={setBlockReason}
        submitBlockVehicle={submitBlockVehicle}
      />

      <AddVehicleModal
        open={addVehicleOpen}
          onClose={() => setAddVehicleOpen(false)}
          onCreated={() => {
            // refresh chart so the newly added vehicle can appear
            loadChart();
          }}
          vendors={vendors}
          vehicleTypes={vehicleTypes}
          defaultVendorId={vendorIds[0] ?? ""}
          defaultVehicleTypeId={vehicleTypeIds[0] ?? ""}
        />

        <AddDriverModal
          open={addDriverOpen}
          onClose={() => setAddDriverOpen(false)}
          onCreated={() => {
            // optional refresh; harmless
            loadChart();
          }}
          vendors={vendors}
          vehicleTypes={vehicleTypes}
          defaultVendorId={vendorIds[0] ?? ""}
          defaultVehicleTypeId={vehicleTypeIds[0] ?? ""}
        />
    </div>
  );
}
