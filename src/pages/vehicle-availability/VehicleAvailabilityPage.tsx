// REPLACE-WHOLE-FILE: src/pages/VehicleAvailability/VehicleAvailabilityPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import AutoSuggestSelect from "@/components/AutoSuggestSelect";
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

type ChipOption = { value: string; label: string };

function ChipMultiSelect({
  options,
  values,
  onChange,
  placeholder,
}: {
  options: ChipOption[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleOutside = (e: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setFocusedIndex(0);
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  const selectedSet = useMemo(() => new Set(values.map(String)), [values]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return options.filter((opt) => {
      if (selectedSet.has(String(opt.value))) return false;
      if (!term) return true;
      return (
        String(opt.label).toLowerCase().includes(term) ||
        String(opt.value).toLowerCase().includes(term)
      );
    });
  }, [options, query, selectedSet]);

  useEffect(() => {
    if (focusedIndex >= filtered.length) {
      setFocusedIndex(filtered.length > 0 ? filtered.length - 1 : 0);
    }
  }, [filtered.length, focusedIndex]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.max(rect.width, 280);
      const openBelow = window.innerHeight - rect.bottom > 220;
      const top = openBelow ? rect.bottom + 6 : Math.max(8, rect.top - 280 - 6);

      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        top,
        width,
        zIndex: 10000,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function addValue(value: string) {
    const next = String(value);
    if (!next || selectedSet.has(next)) return;
    onChange([...values, next]);
    setQuery("");
    setOpen(true);
    setFocusedIndex(0);
  }

  function removeValue(value: string) {
    onChange(values.filter((item) => String(item) !== String(value)));
    setOpen(true);
    setFocusedIndex(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !query.trim() && values.length > 0) {
      e.preventDefault();
      removeValue(values[values.length - 1]);
      return;
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (open && filtered[focusedIndex]) {
        addValue(filtered[focusedIndex].value);
      } else if (query.trim()) {
        addValue(query.trim());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setFocusedIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setFocusedIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className="min-h-11 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus-within:ring-1 focus-within:ring-purple-400"
        onClick={() => setOpen(true)}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {values.length === 0 ? (
            <span className="px-1 py-1 text-slate-400">{placeholder}</span>
          ) : null}
          {values.map((value) => {
            const option = options.find((item) => String(item.value) === String(value));
            return (
              <span
                key={String(value)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs text-slate-700"
              >
                <span className="max-w-[160px] truncate">{option?.label ?? value}</span>
                <button
                  type="button"
                  className="leading-none text-slate-500 hover:text-slate-800"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeValue(String(value));
                  }}
                  aria-label={`Remove ${option?.label ?? value}`}
                >
                  ×
                </button>
              </span>
            );
          })}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setFocusedIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="min-w-[90px] flex-1 border-0 bg-transparent px-1 py-1 outline-none"
            placeholder={values.length === 0 ? "" : ""}
          />
        </div>
      </div>

      {open
        ? createPortal(
          <div
            ref={dropdownRef}
            className="max-h-56 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg"
            style={dropdownStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
          ) : (
            filtered.map((option, idx) => (
              <button
                key={option.value}
                type="button"
                className={[
                  "block w-full px-3 py-2 text-left text-sm",
                  idx === focusedIndex ? "bg-purple-50 text-purple-700" : "bg-white text-slate-700",
                ].join(" ")}
                onMouseEnter={() => setFocusedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addValue(option.value);
                }}
              >
                {option.label}
              </button>
              ))
          )}
          </div>,
          document.body
        )
        : null}
    </div>
  );
}

type SelectedCell = { row: VehicleAvailabilityRow; cell: VehicleAvailabilityCell } | null;

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
