// REPLACE-WHOLE-FILE: src/pages/VehicleAvailability/VehicleAvailabilityPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import {
  assignVehicle,
  fetchAgents,
  fetchDriversForAssign,
  fetchVehicleAvailability,
  fetchVehiclesForAssign,
  fetchVehicleTypes,
  fetchVendors,
  fetchLocations,
  SimpleOption,
  VehicleAvailabilityCell,
  VehicleAvailabilityResponse,
  VehicleAvailabilityRow,
} from "@/services/vehicle-availability";
import { AddVehicleModal } from "./modals/AddVehicleModal";
import { AddDriverModal } from "./modals/AddDriverModal";


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

type SelectedCell = { row: VehicleAvailabilityRow; cell: VehicleAvailabilityCell } | null;

export default function VehicleAvailabilityPage() {
  const initialRange = useMemo(() => defaultMonthRange(), []);
  const today = useMemo(() => toYmd(new Date()), []);

  // filter UI
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [vendorId, setVendorId] = useState<number | "">("");
  const [vehicleTypeId, setVehicleTypeId] = useState<number | "">("");
  const [agentId, setAgentId] = useState<number | "">("");
  // Location filter is now string-based (derived from API routeSegments)
  const [locationId, setLocationId] = useState<string>("");

  // lookups
  const [vendors, setVendors] = useState<SimpleOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<SimpleOption[]>([]);
  const [agents, setAgents] = useState<SimpleOption[]>([]);
  const [locations, setLocations] = useState<string[]>([]);


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

  async function loadChart() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchVehicleAvailability({
      dateFrom,
      dateTo,
      vendorId: vendorId === "" ? undefined : vendorId,
      vehicleTypeId: vehicleTypeId === "" ? undefined : vehicleTypeId,
      agentId: agentId === "" ? undefined : agentId,
      locationLabel: locationId || undefined,
    });

    // 1) Build dynamic dropdown options from routeSegments, then MERGE with base list
    const derivedLocations = extractLocationsFromAvailability(res);
    setLocations(prev =>
      Array.from(new Set([...(prev || []), ...derivedLocations])).sort((x, y) => x.localeCompare(y)),
    );

    // 2) Keep a client-side fallback filter (backend already applies when locationLabel is sent)
    const loc = (locationId || "").trim();
    const rowsFilteredByLoc = loc ? res.rows.filter((r) => rowHasLocation(r, loc)) : res.rows;

    setData({ ...res, rows: rowsFilteredByLoc });
    } catch (e: any) {
      setError(e?.message || "Failed to load vehicle availability.");
      setData({ dates: [], rows: [] });
    } finally {
      setLoading(false);
    }
  }

  async function openAssignModal(row: VehicleAvailabilityRow, cell: VehicleAvailabilityCell) {
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

  const vehicleTypeOptionsForFilter = useMemo(() => {
    if (vendorId === "") return vehicleTypes;
    return data.rows
      .filter((r) => r.vendorId === Number(vendorId))
      .map((r) => ({ id: r.vehicleTypeId, label: r.vehicleTypeTitle || `Type #${r.vehicleTypeId}` }))
      .filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [vendorId, vehicleTypes, data.rows]);

  function handleClear() {
    const r = defaultMonthRange();
    setDateFrom(r.dateFrom);
    setDateTo(r.dateTo);
    setVendorId("");
    setVehicleTypeId("");
    setAgentId("");
    setLocationId("");
    setSearch("");
    setTimeout(() => loadChart(), 0);
  }

  useEffect(() => {
    loadLookups();
    loadChart();
    // also try to prefill with a small popular set (no query) at mount
    loadLocationsBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stickyHeaderClass = "sticky top-0 z-20 bg-white border-b border-slate-200";
  const stickyCol1 = "sticky left-0 z-10 bg-white border-r border-slate-200";
  const stickyCol2 = "sticky left-[210px] z-10 bg-white border-r border-slate-200";

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

        <div className="mx-4 my-4 rounded-lg border border-indigo-300 bg-transparent p-4">
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
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={vendorId === "" ? "" : String(vendorId)}
                onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Choose Vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Vehicle Type</label>
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={vehicleTypeId === "" ? "" : String(vehicleTypeId)}
                onChange={(e) =>
                  setVehicleTypeId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Choose Vehicle Types</option>
                {vehicleTypeOptionsForFilter.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Agent</label>
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={agentId === "" ? "" : String(agentId)}
                onChange={(e) => setAgentId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select Agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-700">Location</label>
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">Choose Location</option>
                {locations.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
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

      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
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
                    "min-w-[210px] border border-slate-300 bg-[#9b9b9b] p-2 text-left font-semibold text-white",
                  )}
                >
                  Vendor Name
                </th>
                <th
                  className={clsx(
                    stickyHeaderClass,
                    stickyCol2,
                    "min-w-[240px] border border-slate-300 bg-[#9b9b9b] p-2 text-left font-semibold text-white",
                  )}
                >
                  Vehicle Type
                </th>
                {data.dates.map((d) => (
                  <th
                    key={d}
                    className={clsx(
                      stickyHeaderClass,
                      "min-w-[190px] border border-slate-300 bg-[#9b9b9b] px-2 py-2 text-left font-semibold text-white",
                    )}
                  >
                    <div className="text-xs">{formatDisplayDate(d)}</div>
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
                  <td className={clsx(stickyCol1, "border border-slate-300 bg-[#fbf9ff] p-2 align-top")}>
                    <div className="text-sm font-medium text-slate-900">
                      {row.vendorName || `Vendor #${row.vendorId}`}
                    </div>
                  </td>

                  <td className={clsx(stickyCol2, "border border-slate-300 bg-[#fbf9ff] p-2 align-top")}>
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

                            {cell.routeSegments.length > 0 ? (
                              <div className="mb-2 space-y-1">
                                {cell.routeSegments.slice(0, 2).map((seg, idx) => (
                                  <div key={`${idx}-${seg.locationName}-${seg.nextVisitingLocation}`} className="text-xs text-slate-800">
                                    {seg.locationName} =&gt; {seg.nextVisitingLocation}
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="mb-1 text-xs text-slate-700">
                                  Driver - {cell.hasDriver ? "Assigned" : "Not Assigned"}
                                </div>
                                <span className={clsx(
                                  "inline-flex rounded px-2 py-[2px] text-[10px] font-semibold",
                                  cell.isVehicleAssigned ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700",
                                )}>
                                  {cell.isVehicleAssigned ? "Assigned" : "Unassigned"}
                                </span>
                              </div>

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

      {assignModalOpen && assignContext ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => {
            if (assigning) return;
            setAssignModalOpen(false);
            setAssignContext(null);
          }}
        >
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-base font-semibold text-slate-900">Assign Vehicle</div>
            <div className="mb-4 text-xs text-slate-600">
              {assignContext.cell.itineraryQuoteId || `Plan #${assignContext.cell.itineraryPlanId}`} • {assignContext.cell.date}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Vehicle</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={assignVehicleId === "" ? "" : String(assignVehicleId)}
                  onChange={(e) => setAssignVehicleId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose Vehicle</option>
                  {assignVehicleOptions.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-700">Driver (optional)</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={assignDriverId === "" ? "" : String(assignDriverId)}
                  onChange={(e) => setAssignDriverId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose Driver</option>
                  {assignDriverOptions.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                disabled={assigning}
                onClick={() => {
                  setAssignModalOpen(false);
                  setAssignContext(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={assigning}
                onClick={submitAssignVehicle}
              >
                {assigning ? "Saving..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AddVehicleModal
          open={addVehicleOpen}
          onClose={() => setAddVehicleOpen(false)}
          onCreated={() => {
            // refresh chart so the newly added vehicle can appear
            loadChart();
          }}
          vendors={vendors}
          vehicleTypes={vehicleTypes}
          defaultVendorId={vendorId}
          defaultVehicleTypeId={vehicleTypeId}
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
          defaultVendorId={vendorId}
          defaultVehicleTypeId={vehicleTypeId}
        />
    </div>
  );
}
