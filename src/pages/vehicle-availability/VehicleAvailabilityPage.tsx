// REPLACE-WHOLE-FILE: src/pages/VehicleAvailability/VehicleAvailabilityPage.tsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Ban, CheckCircle2, Pencil, Share2, X } from "lucide-react";
import { Link } from "react-router-dom";
import AutoSuggestSelect from "@/components/AutoSuggestSelect";
import { SharedDatePicker } from "@/components/SharedDatePicker";
import { isValid, parseISO } from "date-fns";
import {
  assignVehicle,
  blockVehicleAvailability,
  fetchAgents,
fetchAllocationDrivers,
fetchVehicleAvailability,
fetchAvailabilityPeriods,
fetchAllocationVehicles,
type AllocationVehicle,
 fetchVehicleTypes,
fetchVendors,
  fetchLocations,
  SimpleOption,
  VehicleAvailabilityCell,
  VehicleAvailabilityResponse,
  VehicleAvailabilityRow,
} from "@/services/vehicle-availability";
import { AddVehicleModal } from "./modals/AddVehicleModal";

import {
  TransportAvailabilityModal,
  availabilityLabels,
  availabilityColors,
  periodIncludesDate,
  formatPeriodTime,
} from "./components/TransportAvailabilityModal";
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

function parseYmd(value: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function normalizeVehicleTypeName(value?: string | null): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function groupVehicleRows(
  rows: VehicleAvailabilityRow[],
): VehicleAvailabilityRow[][] {
  const groups =
    new Map<string, VehicleAvailabilityRow[]>();

  for (const row of rows) {
    const registration = (
      row.registrationNumber ?? ""
    )
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "");

    const key = registration
      ? `registration:${registration}`
      : `vehicle:${row.vehicleId}`;

    const existing = groups.get(key) ?? [];

    existing.push(row);

    groups.set(key, existing);
  }

  return Array.from(groups.values());
}

function defaultMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { dateFrom: toYmd(first), dateTo: toYmd(last) };
}

async function readCurrentCalendarAssignment(
  row: VehicleAvailabilityRow,
  cell: VehicleAvailabilityCell,
) {
  const planId = Number(cell.itineraryPlanId);

  if (
    !Number.isSafeInteger(planId) ||
    planId <= 0 ||
    !cell.isVehicleAssigned ||
    Number(cell.assignedVehicleId) !==
      Number(row.vehicleId)
  ) {
    throw new Error(
      "No valid vehicle assignment found.",
    );
  }

  const vehicles =
    await fetchAllocationVehicles(planId);

  const matches = vehicles.filter(
    vehicle =>
      vehicle.isAssignedToCurrent &&
      Number(vehicle.vehicleId) ===
        Number(row.vehicleId) &&
      Number(vehicle.vendorId) ===
        Number(row.vendorId),
  );

  if (matches.length !== 1) {
    throw new Error(
      "Current vehicle assignment could not be verified. Refresh the chart.",
    );
  }

  const currentVehicle = matches[0] as
    AllocationVehicle & {
      assignmentVerified?: boolean;
      driverId?: number | null;
      driverAssignmentId?: number | null;
    };

  if (
    currentVehicle.assignmentVerified !== true ||
    Number(currentVehicle.driverId ?? 0) !==
      Number(cell.driverId ?? 0) ||
    Number(currentVehicle.driverAssignmentId ?? 0) !==
      Number(cell.driverAssignmentId ?? 0)
  ) {
    throw new Error(
      "Vehicle or driver assignment has changed. Refresh the chart.",
    );
  }

  return {
    vehicles,
    currentVehicle,
  };
}


export default function VehicleAvailabilityPage() {
  const initialRange = useMemo(() => defaultMonthRange(), []);
  const today = useMemo(() => toYmd(new Date()), []);

  // filter UI
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [vendorIds, setVendorIds] = useState<number[]>([]);
 const [vehicleTypeLabels, setVehicleTypeLabels] =
  useState<string[]>([]);
const [agentIds, setAgentIds] = useState<number[]>([]);

const [locationLabels, setLocationLabels] =
  useState<string[]>([]);

const appliedChartFilters = useRef({
  dateFrom,
  dateTo,
  vendorIds,
  vehicleTypeLabels,
  agentIds,
  locationLabels,
});

const chartRequestId = useRef(0);
const pendingChartRefresh = useRef(false);

  // lookups
  const [vendors, setVendors] = useState<SimpleOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<SimpleOption[]>([]);
  const [agents, setAgents] = useState<SimpleOption[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
 const [vehicleTypeOptionsForFilter, setVehicleTypeOptionsForFilter] =
  useState<Array<{
    value: string;
    label: string;
  }>>([]);


  // chart
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<VehicleAvailabilityResponse>({ dates: [], rows: [] });

  // search
  const [search, setSearch] = useState("");
const [addVehicleOpen, setAddVehicleOpen] = useState(false);
const [addDriverOpen, setAddDriverOpen] = useState(false);
const [shareCopiedVisible, setShareCopiedVisible] = useState(false);

const [
  manageAvailabilityOpen,
  setManageAvailabilityOpen,
] = useState(false);

const [assigning, setAssigning] = useState(false);
const [assignModalOpen, setAssignModalOpen] = useState(false);

const [blocking, setBlocking] = useState(false);
const [blockModalOpen, setBlockModalOpen] = useState(false);
const [blockContext, setBlockContext] = useState<SelectedCell>(null);
const [blockReason, setBlockReason] = useState("");
  const [assignContext, setAssignContext] = useState<SelectedCell>(null);
  const [assignVehicleId, setAssignVehicleId] = useState<number | "">("");
  const [assignDriverId, setAssignDriverId] = useState<number | "">("");
const [assignVehicleOptions, setAssignVehicleOptions] =
  useState<SimpleOption[]>([]);

const [assignDriverOptions, setAssignDriverOptions] =
  useState<SimpleOption[]>([]);

const [allocationVehicles, setAllocationVehicles] =
  useState<AllocationVehicle[]>([]);

const filteredRows = useMemo(() => {
  const q = search.trim().toLowerCase();

  if (!q) return data.rows;

  return groupVehicleRows(data.rows)
    .filter(group =>
      group.some(row => {
        const searchableText = [
          row.vendorName,
          row.vendorId,
          row.vehicleTypeTitle,
          row.vehicleTypeId,
          row.registrationNumber,
          row.vehicleId,
          ...row.cells.flatMap(cell => [
            cell.driverName,
            cell.driverMobile,
          ]),
        ]
          .filter(value => value != null)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(q);
      }),
    )
    .flat();
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
  vehicleTypeLabels?: string[];
  agentIds?: number[];
  locationLabels?: string[];
}) {
const nextDateFrom =
  override?.dateFrom ?? dateFrom;

const nextDateTo =
  override?.dateTo ?? dateTo;

const nextVendorIds =
  override?.vendorIds ?? vendorIds;

const nextVehicleTypeLabels =
  override?.vehicleTypeLabels ?? vehicleTypeLabels;

const nextAgentIds =
  override?.agentIds ?? agentIds;

const nextLocationLabels =
  override?.locationLabels ?? locationLabels;

if (
  !parseYmd(nextDateFrom) ||
  !parseYmd(nextDateTo) ||
  nextDateFrom > nextDateTo
) {
  setError("Please select a valid date range.");
  return;
}

appliedChartFilters.current = {
  dateFrom: nextDateFrom,
  dateTo: nextDateTo,
  vendorIds: nextVendorIds,
  vehicleTypeLabels: nextVehicleTypeLabels,
  agentIds: nextAgentIds,
  locationLabels: nextLocationLabels,
};

const requestId = ++chartRequestId.current;

setLoading(true);
setError("");

try {
const [chartResult, periodResult] =
  await Promise.allSettled([
    fetchVehicleAvailability({
      dateFrom: nextDateFrom,
      dateTo: nextDateTo,

      vendorIds: nextVendorIds.length > 0
        ? nextVendorIds
        : undefined,

      agentIds: nextAgentIds.length > 0
        ? nextAgentIds
        : undefined,

      locationLabels: nextLocationLabels.length > 0
        ? nextLocationLabels
        : undefined,
    }),

    fetchAvailabilityPeriods(
      nextDateFrom,
      nextDateTo,
    ),
  ]);

if (requestId !== chartRequestId.current) {
  return;
}

if (chartResult.status === "rejected") {
  throw chartResult.reason;
}

const res = chartResult.value;

const periods =
  periodResult.status === "fulfilled" &&
  Array.isArray(periodResult.value)
    ? periodResult.value
    : undefined;

if (requestId !== chartRequestId.current) {
  return;
}

const typeOptions = new Map<string, string>();

for (const row of res.rows) {
  const label = (row.vehicleTypeTitle ?? "")
    .trim()
    .replace(/\s+/g, " ");

  const value = normalizeVehicleTypeName(label);

  if (!value) continue;

  if (!typeOptions.has(value)) {
    typeOptions.set(value, label);
  }
}

if (
  nextLocationLabels.length === 0 ||
  res.rows.length > 0
) {
  setVehicleTypeOptionsForFilter(
    Array.from(
      typeOptions,
      ([value, label]) => ({
        value,
        label,
      }),
    ).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
  );
}

const derivedLocations =
  extractLocationsFromAvailability(res);
    setLocations(prev =>
      Array.from(new Set([...(prev || []), ...derivedLocations])).sort((x, y) => x.localeCompare(y)),
    );

    // 2) Keep a client-side fallback filter for exact route-label parity.
const selectedVehicleTypes = new Set(
  nextVehicleTypeLabels.map(
    normalizeVehicleTypeName,
  ),
);

const filteredChartRows = groupVehicleRows(res.rows)
  .filter(group =>
    group.some(row => {
      const matchesVehicleType =
        selectedVehicleTypes.size === 0 ||
        selectedVehicleTypes.has(
          normalizeVehicleTypeName(
            row.vehicleTypeTitle,
          ),
        );

      const matchesLocation =
        nextLocationLabels.length === 0 ||
        nextLocationLabels.some(
          label => rowHasLocation(row, label),
        );

      return matchesVehicleType && matchesLocation;
    }),
  )
  .flat();

setData({
  ...res,
  rows: filteredChartRows,
  periods,
});

if (periods === undefined) {
  setError(
    "Maintenance, reservations and driver leave could not be verified.",
  );
}
} catch (error) {
  if (requestId === chartRequestId.current) {
    setError(
      error instanceof Error
        ? error.message
        : "Failed to load vehicle availability.",
    );

    setData({ dates: [], rows: [] });
  }
} finally {
  if (requestId === chartRequestId.current) {
    setLoading(false);
  }
}
}

function refreshChart() {
  return loadChart(
    appliedChartFilters.current,
  );
}

async function handleShareLink(cell: VehicleAvailabilityCell) {
  const driverAssignmentId = Number(cell.driverAssignmentId || 0);

  if (!driverAssignmentId) {
    setError("Driver assignment ID is missing.");
    return;
  }

  const shareUrl =
    `${window.location.origin}/daily-moment/driver/${driverAssignmentId}`;

  const message = `Check out this link: ${shareUrl}`;

  const whatsappUrl =
    `whatsapp://send?text=${encodeURIComponent(message)}`;

  try {
    await navigator.clipboard.writeText(shareUrl);

    // B2B success popup
    setShareCopiedVisible(true);

    window.setTimeout(() => {
      setShareCopiedVisible(false);
    }, 3000);
  } catch {
    // WhatsApp should still open even if clipboard permission fails
  }

  // Small delay so success popup becomes visible before WhatsApp opens
  window.setTimeout(() => {
    window.location.href = whatsappUrl;
  }, 300);
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

await refreshChart();
    } catch (e: any) {
      setError(e?.message || "Failed to block vehicle.");
    } finally {
      setBlocking(false);
    }
  }

async function openAssignModal(
  row: VehicleAvailabilityRow,
  cell: VehicleAvailabilityCell,
) {
  if (!cell.itineraryPlanId || assigning) return;

  setError("");
  setAssigning(true);

  setAssignContext({ row, cell });
  setAssignVehicleId("");
  setAssignDriverId("");
  setAssignVehicleOptions([]);
  setAssignDriverOptions([]);
  setAllocationVehicles([]);

  try {
const {
  vehicles,
  currentVehicle,
} = await readCurrentCalendarAssignment(
  row,
  cell,
);

    const sameGroup = vehicles.filter(
      (vehicle) =>
        vehicle.vendorId === currentVehicle.vendorId &&
        vehicle.vendorVehicleTypeId ===
          currentVehicle.vendorVehicleTypeId,
    );

    const assignedInGroup = sameGroup.filter(
      (vehicle) => vehicle.isAssignedToCurrent,
    );

    if (assignedInGroup.length !== 1) {
      throw new Error(
        "Multiple vehicle assignments require individual allocation.",
      );
    }

    const availableVehicles = sameGroup.filter(
      (vehicle) =>
        vehicle.isAvailable === true,
    );

    const drivers = await fetchAllocationDrivers(
      cell.itineraryPlanId,
      currentVehicle.vendorId,
      currentVehicle.vendorVehicleTypeId,
    );

    const availableDrivers = drivers.filter(
      (driver) =>
        driver.isAvailable === true &&
        Number(driver.driverId) > 0,
    );

const currentDriverId = Number(
  currentVehicle.driverId ?? 0,
);

    setAllocationVehicles(availableVehicles);

    setAssignVehicleOptions(
      availableVehicles.map((vehicle) => ({
        id: vehicle.vehicleId,
        label:
          `${vehicle.registrationNumber}` +
          `${vehicle.vendorName ? ` · ${vehicle.vendorName}` : ""}` +
          `${vehicle.isAssignedToCurrent ? " (Assigned)" : ""}`,
      })),
    );

    setAssignDriverOptions(
      availableDrivers.map((driver) => ({
        id: driver.driverId,
        label: driver.mobile
          ? `${driver.name} — ${driver.mobile}`
          : driver.name,
      })),
    );

setAssignVehicleId(
  currentVehicle.vehicleId,
);

    setAssignDriverId(
      currentDriverId > 0
        ? currentDriverId
        : "",
    );

    setAssignModalOpen(true);
  } catch (e: any) {
    setAssignModalOpen(false);
    setAssignContext(null);

    setError(
      e?.message ||
      "Failed to load available vehicles and drivers.",
    );
  } finally {
    setAssigning(false);
  }
}

async function submitAssignVehicle() {
  if (!assignContext?.cell.itineraryPlanId || assigning) {
    return;
  }

  const selectedVehicle = allocationVehicles.find(
    (vehicle) =>
      Number(vehicle.vehicleId) === Number(assignVehicleId) &&
      vehicle.isAvailable === true,
  );

  if (!selectedVehicle) {
    setError("Please choose an available vehicle.");
    return;
  }

  if (
    assignDriverId !== "" &&
    !assignDriverOptions.some(
      (driver) =>
        Number(driver.id) === Number(assignDriverId),
    )
  ) {
    setError("Please choose an available driver.");
    return;
  }

try {
  setAssigning(true);
  setError("");

  const {
    vehicles: latestVehicles,
    currentVehicle,
  } = await readCurrentCalendarAssignment(
    assignContext.row,
    assignContext.cell,
  );

  const currentGroup = latestVehicles.filter(
    vehicle =>
      vehicle.isAssignedToCurrent &&
      vehicle.vendorId === currentVehicle.vendorId &&
      vehicle.vendorVehicleTypeId ===
        currentVehicle.vendorVehicleTypeId,
  );

  if (currentGroup.length !== 1) {
    throw new Error(
      "Multiple active assignments require individual allocation.",
    );
  }

  const latestVehicle = latestVehicles.find(
    vehicle =>
      Number(vehicle.vehicleId) ===
        Number(assignVehicleId) &&
      vehicle.vendorId === currentVehicle.vendorId &&
      vehicle.vendorVehicleTypeId ===
        currentVehicle.vendorVehicleTypeId &&
      vehicle.isAvailable === true,
  );

  if (!latestVehicle) {
    throw new Error(
      "Selected vehicle is no longer available.",
    );
  }

  const nextDriverId =
    assignDriverId === ""
      ? null
      : Number(assignDriverId);

  if (nextDriverId !== null) {
    const latestDrivers =
      await fetchAllocationDrivers(
        assignContext.cell.itineraryPlanId,
        latestVehicle.vendorId,
        latestVehicle.vendorVehicleTypeId,
      );

    const driverAvailable = latestDrivers.some(
      driver =>
        Number(driver.driverId) === nextDriverId &&
        driver.isAvailable === true,
    );

    if (!driverAvailable) {
      throw new Error(
        "Selected driver is no longer available.",
      );
    }
  }

  const result = await assignVehicle({
    itineraryPlanId:
      assignContext.cell.itineraryPlanId,

    vendor_id: latestVehicle.vendorId,

    vehicle_type_id:
      latestVehicle.vendorVehicleTypeId,

    vehicle_id: latestVehicle.vehicleId,

    driver_id: nextDriverId,
  });

    if (result?.success !== true) {
      throw new Error(
        result?.message ||
        "Assignment could not be saved.",
      );
    }

    setAssignModalOpen(false);
    setAssignContext(null);

    setAssignVehicleOptions([]);
    setAssignDriverOptions([]);
    setAllocationVehicles([]);

  try {
  window.localStorage.setItem(
    "dvi:transport-assignment-changed",
    JSON.stringify({
      itineraryPlanId:
        assignContext.cell.itineraryPlanId,

      timestamp: Date.now(),
    }),
  );
} catch {
  // Database save remains valid.
}

await refreshChart();

} catch (error) {
  setAssignModalOpen(false);
  setAssignContext(null);

setAssignVehicleOptions([]);
setAssignDriverOptions([]);
setAllocationVehicles([]);

await refreshChart();

  setError(
    error instanceof Error
      ? error.message
      : "Failed to update vehicle and driver.",
  );
} finally {
  setAssigning(false);
}
}

const defaultModalVehicleTypeId = useMemo(() => {
  if (vehicleTypeLabels.length !== 1) {
    return "";
  }

  const matches = vehicleTypes.filter(
    option =>
      normalizeVehicleTypeName(option.label) ===
      vehicleTypeLabels[0],
  );

  return matches.length === 1
    ? matches[0].id
    : "";
}, [vehicleTypeLabels, vehicleTypes]);

  function handleClear() {
    const r = defaultMonthRange();
    setDateFrom(r.dateFrom);
    setDateTo(r.dateTo);
    setVendorIds([]);
    setVehicleTypeLabels([]);
    setAgentIds([]);
    setLocationLabels([]);
    setSearch("");
    loadChart({
      dateFrom: r.dateFrom,
      dateTo: r.dateTo,
      vendorIds: [],
      vehicleTypeLabels: [],
      agentIds: [],
      locationLabels: [],
    });
  }

useEffect(() => {
  loadLookups();
  loadChart();
  loadLocationsBase();

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
const busy =
  assignModalOpen ||
  assigning ||
  blockModalOpen ||
  blocking ||
  manageAvailabilityOpen;

  const refreshAssignments = () => {
    if (busy) {
      pendingChartRefresh.current = true;
      return;
    }

    pendingChartRefresh.current = false;

    void refreshChart();
  };

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key ===
      "dvi:transport-assignment-changed"
    ) {
      refreshAssignments();
    }
  };

  if (!busy && pendingChartRefresh.current) {
    refreshAssignments();
  }

  window.addEventListener(
    "storage",
    handleStorage,
  );

  window.addEventListener(
    "focus",
    refreshAssignments,
  );

  return () => {
    window.removeEventListener(
      "storage",
      handleStorage,
    );

    window.removeEventListener(
      "focus",
      refreshAssignments,
    );
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  assignModalOpen,
  assigning,
  blockModalOpen,
  blocking,
  manageAvailabilityOpen,
]);

const stickyHeaderClass = "sticky top-0 z-30 border border-slate-300 bg-[#9b9b9b] text-white";

const stickyCol2 = "sticky left-0 z-40 min-w-[160px] w-[160px] border-r border-slate-300";
  function formatDisplayDate(ymd: string) {
    const d = new Date(`${ymd}T00:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate().toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${month} ${day},${year}`;
  }

return (
  <div className="w-full min-w-0 px-0 py-3">

    {/* B2B SHARE LINK SUCCESS POPUP */}
    {shareCopiedVisible ? (
      <div className="fixed left-1/2 top-[14px] z-[9999] w-[min(795px,calc(100vw-32px))] -translate-x-1/2">
        <div className="flex min-h-[68px] items-center rounded-[7px] bg-[#50a854] px-[32px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <CheckCircle2
            className="mr-[18px] h-[31px] w-[31px] shrink-0"
            strokeWidth={2}
          />

          <span className="flex-1 text-[20px] font-medium">
            Share Link copied successfully!
          </span>

          <button
            type="button"
            onClick={() => setShareCopiedVisible(false)}
            className="ml-[18px] flex h-[32px] w-[32px] items-center justify-center rounded text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-[23px] w-[23px]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    ) : null}

<div className="mb-2 rounded-lg border border-slate-200 bg-white">
  <div className="border-b border-slate-200 px-3 py-1.5">
    <h5 className="text-sm font-semibold text-slate-800">
      List of Vehicle Availability
    </h5>
  </div>

  <div className="relative z-[200] px-3 py-2">
    <div className="grid grid-cols-1 items-end gap-x-2.5 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <label className="text-xs font-medium text-slate-700">Start Date</label>
              <SharedDatePicker
                label="Start Date"
                value={dateFrom}
                placeholder="Start Date"
                triggerClassName="h-8 w-full text-xs"
                parseValue={parseYmd}
                formatValue={toYmd}
                onChange={(value) => {
                  setDateFrom(value);
                  if (dateTo && dateTo < value) setDateTo("");
                }}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-0.5">
              <label className="text-xs font-medium text-slate-700">End Date</label>
              <SharedDatePicker
                label="End Date"
                value={dateTo}
                placeholder="End Date"
                minDate={parseYmd(dateFrom)}
                defaultMonth={parseYmd(dateFrom)}
                triggerClassName="h-8 w-full text-xs"
                parseValue={parseYmd}
                formatValue={toYmd}
                onChange={setDateTo}
              />
            </div>

    <div className="flex min-w-0 flex-col gap-0.5 [&>div>button]:!h-auto [&>div>button]:!min-h-8 [&>div>button]:!py-1 [&>div>button]:!text-xs">
  <label className="text-xs font-medium text-slate-700">
    Vehicle Type
  </label>

  <AutoSuggestSelect
    mode="multi"
    value={vehicleTypeLabels}
    options={vehicleTypeOptionsForFilter}
    onChange={(next) =>
      setVehicleTypeLabels(
        Array.isArray(next)
          ? next
          : next
            ? [next]
            : [],
      )
    }
    placeholder="Choose Vehicle Types"
    noResultsMessage="No registered vehicle types found"
    stackingZIndex={120}
  />
</div>

            <div className="flex min-w-0 flex-col gap-0.5 [&>div>button]:!h-auto [&>div>button]:!min-h-8 [&>div>button]:!py-1 [&>div>button]:!text-xs">
              <label className="text-xs font-medium text-slate-700">Agent</label>
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

            <div className="flex min-w-0 flex-col gap-0.5 [&>div>button]:!h-auto [&>div>button]:!min-h-8 [&>div>button]:!py-1 [&>div>button]:!text-xs">
              <label className="text-xs font-medium text-slate-700">Location</label>
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

         <div className="flex min-w-0 items-end gap-1.5">
  <button
    className="h-8 min-w-0 flex-1 rounded-md bg-slate-900 px-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
    onClick={() => {
      loadChart();
    }}
    disabled={loading}
    type="button"
  >
    {loading ? "Loading..." : "Apply"}
  </button>

  <button
   className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-100 px-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60"
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

<div className="relative z-0 mb-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="text-base font-semibold text-slate-900">
      Vehicle Availability Chart
    </div>

    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <button
              className="h-8 rounded-md border border-purple-200 bg-purple-50 px-2.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
              type="button"
              onClick={() => setAddDriverOpen(true)}
            >
              + Add Driver
            </button>
            <button
              className="h-8 rounded-md border border-purple-200 bg-purple-50 px-2.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
              type="button"
              onClick={() => setAddVehicleOpen(true)}
            >
              + Add Vehicle
            </button>

          <button
  type="button"
  onClick={() =>
    setManageAvailabilityOpen(true)
  }
  className="h-8 rounded-md border border-purple-200 bg-purple-50 px-2.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
>
  Manage Availability
</button>

<div className="flex items-center gap-2">
  <div className="text-xs text-slate-700">Search:</div>
              <input
                className="h-8 w-full max-w-[180px] rounded-md border border-slate-300 bg-white px-2 text-xs"
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

    <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] leading-tight text-slate-600">

<div className="flex items-center gap-1.5">
  <span className="h-3 w-3 rounded-full bg-green-400" />
  Available* — no recorded vehicle restriction
</div>

<div className="flex items-center gap-1.5">
  <span className="h-3 w-3 rounded-full bg-amber-400" />
  Registration conflict
</div>

<div className="flex items-center gap-1.5">
  <span className="h-3 w-3 rounded-full bg-blue-600" />
  Confirmed Booking
</div>

<div className="flex items-center gap-1.5">
  <span className="h-3 w-3 rounded-full bg-slate-600" />
  Maintenance
</div>

<div className="flex items-center gap-1.5">
  <span className="h-3 w-3 rounded-full bg-amber-500" />
  Reserved
</div>

<div className="flex items-center gap-1.5">
  <span className="h-3 w-3 rounded-full bg-purple-600" />
  Driver Leave
</div>

<div className="flex items-center gap-1.5">
  <span className="h-3 w-3 rounded-full bg-red-500" />
  Blocked
</div>

  <div className="flex items-center gap-1.5">
    <span className="h-3 w-3 rounded-full bg-slate-300" />
    Availability not verified
  </div>

</div>

{/* Chart Table */}
<div className="rounded-xl border border-slate-200 bg-white">
        <div className="max-h-[75vh] overflow-auto">
          <table className="min-w-max border-collapse text-sm">
            <thead>
              <tr>


<th
  className={clsx(
    stickyHeaderClass,
    stickyCol2,
      "z-50 bg-[#9b9b9b] px-2 py-2 text-left text-xs font-semibold text-white",
  )}
>
  Vehicle Type
</th>

{data.dates.map((d) => (
  <th
    key={d}
    className={clsx(
      stickyHeaderClass,
      "min-w-[120px] px-2 py-2 text-left text-xs font-semibold",
    )}
  >
    {formatDisplayDate(d)}
  </th>
))}

                  
              
              </tr>
            </thead>

           <tbody>

  {data.periods?.some(
    period =>
      period.active &&
      period.kind === "driver_leave",
  ) ? (
    <tr>
      <td
        className={clsx(
          stickyCol2,
          "border border-slate-300 bg-purple-50 p-3 align-top",
        )}
      >
        <div className="text-sm font-semibold text-purple-800">
          Driver Leave
        </div>

        <div className="text-[11px] text-slate-500">
          Driver Availability
        </div>
      </td>

      {data.dates.map(date => (
        <td
          key={`driver-leave-${date}`}
          className="border border-slate-300 p-1.5 align-top"
        >
          <div className="space-y-2">
            {data.periods
              ?.filter(
                period =>
                  period.active &&
                  period.kind === "driver_leave" &&
                  periodIncludesDate(period, date),
              )
              .map(period => (
                <div
                  key={period.id}
                  className="rounded bg-purple-100 p-2 text-xs text-purple-800"
                >
                  <div className="font-semibold">
                    {period.driverName ||
                      "Driver name unavailable"}
                  </div>

                  {period.driverMobile ? (
                    <div className="mt-1">
                      {period.driverMobile}
                    </div>
                  ) : null}

                  <div className="mt-1 font-medium">
                    On Leave
                  </div>

                  <div className="mt-1 text-[10px]">
                    {formatPeriodTime(period.startsAt)}
                    {" → "}
                    {formatPeriodTime(period.endsAt)}
                  </div>
                </div>
              ))}
          </div>
        </td>
      ))}
    </tr>
  ) : null}

  {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + data.dates.length}
                    className="p-4 text-center text-slate-600"
                  >
                    No vehicle availability data for this range.
                  </td>
                </tr>
              ) : null}

            {groupVehicleRows(filteredRows).map((group) => {
  const row = group[0];

  const hasRegistrationConflict =
    group.length > 1 ||
    group.some(
      vehicle => vehicle.registrationConflict,
    );

  const vehicleTypes = Array.from(
    new Set(
      group
        .map(vehicle =>
          vehicle.vehicleTypeTitle?.trim() ?? "",
        )
        .filter(Boolean),
    ),
  );

const groupVehicleIds = new Set(
  group.map(vehicle => vehicle.vehicleId),
);

const registrationKeys = new Set(
  group
    .map(vehicle =>
      (vehicle.registrationNumber ?? "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, ""),
    )
    .filter(Boolean),
);

const vehiclePeriods = (
  data.periods ?? []
).filter(
  period =>
    period.active &&
    period.kind !== "driver_leave" &&
    (
      groupVehicleIds.has(period.resourceId) ||
      (
        !!period.vehicleKey &&
        registrationKeys.has(period.vehicleKey)
      )
    ),
);

  return (
    <tr key={`vehicle-group-${row.vehicleId}`}>
<td
  className={clsx(
    stickyCol2,
    "border border-slate-300 bg-[#fbf9ff] px-1.5 py-0.5 align-middle",
  )}
>
  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 leading-tight">
    <span className="text-xs font-medium text-slate-900">
      {vehicleTypes.length === 0
        ? "Vehicle type not verified"
        : vehicleTypes.length === 1
          ? vehicleTypes[0]
          : "Vehicle type conflict"}
    </span>

<span className="text-[10px] font-medium leading-tight text-blue-700">
  {row.registrationNumber}
</span>
  </div>

  {hasRegistrationConflict ? (
    <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-[11px] leading-tight text-amber-800">
      {row.registrationNumber
        ? "Duplicate registration — verify vehicle master"
        : "Registration number missing"}

      {vehicleTypes.length > 1 ? (
        <div className="mt-1">
          {vehicleTypes.join(" / ")}
        </div>
      ) : null}
    </div>
  ) : null}
</td>

{data.dates.map((date) => {
  const entries = group.flatMap(vehicle =>
    vehicle.cells
      .filter(cell => cell.date === date)
      .map(cell => ({
        row: vehicle,
        cell,
      })),
  );

  const bookedEntries = entries.filter(
    entry => Boolean(entry.cell.itineraryPlanId),
  );

const periodsForDate = vehiclePeriods.filter(
  period =>
    periodIncludesDate(period, date),
);

const visibleEntries = bookedEntries.length
  ? bookedEntries
  : periodsForDate.length > 0
    ? []
    : entries.slice(0, 1);

  return (
    <td
      key={`${row.vehicleId}-${date}`}
      className={clsx(
        "border border-slate-300 p-1",
        bookedEntries.length > 0 || periodsForDate.length > 0
          ? "align-top"
          : "align-middle",
        hasRegistrationConflict
          ? "bg-amber-50"
          : "bg-white",
      )}
    >
<div className="space-y-1">

  {periodsForDate.map(period => (
    <div
      key={`restriction-${period.id}`}
      className={clsx(
        "rounded px-2 py-2 text-center text-xs",
        availabilityColors[period.kind],
      )}
    >
      <div className="font-semibold">
        {availabilityLabels[period.kind]}
      </div>

      <div className="mt-1 text-[10px] leading-relaxed">
        {formatPeriodTime(period.startsAt)}
        {" → "}
        {formatPeriodTime(period.endsAt)}
      </div>

      <div className="mt-1">
        {period.reason}
      </div>
    </div>
  ))}

  {visibleEntries.length === 0 &&
  periodsForDate.length === 0 ? (
    <div className="text-xs text-slate-500">
      Availability not verified
    </div>
  ) : null}

        {visibleEntries.map(({ row, cell }) => {
          const inTrip = Boolean(
            cell.isWithinTrip &&
            cell.itineraryPlanId &&
            cell.isVehicleAssigned
          );

const hasBookingFilters =
  appliedChartFilters.current.agentIds.length > 0 ||
  appliedChartFilters.current.locationLabels.length > 0;

const noAssignedTrip =
  !cell.itineraryPlanId &&
  !hasBookingFilters &&
  !hasRegistrationConflict &&
  group.every(
    vehicle => vehicle.registrationConflict === false,
  ) &&
  Array.isArray(data.periods) &&
  periodsForDate.length === 0 &&
  !loading;

const bg = inTrip
  ? "bg-blue-100"
  : noAssignedTrip
    ? "bg-green-50"
    : "bg-slate-50";

                    const todayRing = cell.date === today ? "ring-1 ring-slate-500" : "";

               return (
<div
  key={`${row.vehicleId}-${cell.date}-${cell.itineraryPlanId ?? "empty"}`}
  className={clsx(
    "rounded",
    cell.itineraryPlanId ? "p-1" : "p-0",
    bg,
  )}
>
                        {!cell.itineraryPlanId ? (
  <div
 className={clsx(
  "flex min-h-[18px] items-center justify-center rounded px-1 py-0.5 text-center text-[10px] font-medium leading-tight",
  hasRegistrationConflict
    ? "bg-amber-100 text-amber-800"
    : noAssignedTrip
      ? "bg-green-100 text-green-700"
      : "bg-slate-100 text-slate-500",
)}
    title={
      noAssignedTrip
        ? "No assigned trip, maintenance, reservation or vehicle block recorded for this date."
        : "Full availability has not been verified."
    }
  >
{hasRegistrationConflict
  ? "Verify registration"
  : loading
    ? "Checking..."
    : noAssignedTrip
      ? "Available*"
      : "Not verified"}
  </div>
) : (
<div
  className={clsx(
    "min-w-[200px] rounded p-1",
    todayRing,
  )}
>                    {!cell.isVehicleAssigned ? (
                              <button
                                type="button"
                                className="mb-2 rounded bg-green-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-green-700"
                                onClick={() => openAssignModal(row, cell)}
                              >
                                + Assign Vehicle
                              </button>
                            ) : null}

<div className="mb-1 flex flex-wrap items-center justify-between gap-1">

{cell.itineraryQuoteId?.trim() ? (
  <Link
    to={`/itinerary-details/${encodeURIComponent(
      cell.itineraryQuoteId.trim(),
    )}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-[11px] font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
    title="Open confirmed itinerary"
  >
    {cell.itineraryQuoteId}
  </Link>
) : (
  <span className="text-[11px] font-semibold text-slate-500">
    Booking ID unavailable
  </span>
)}

  {inTrip ? (
    <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
      {cell.isStart && cell.isEnd
        ? "Start / End"
        : cell.isStart
          ? "Start"
          : cell.isEnd
            ? "End"
            : "On Trip"}
    </span>
  ) : null}

</div>

<div className="mb-1 flex min-w-0 items-center gap-1 text-[11px] leading-tight text-slate-700">

  <span
    className="min-w-0 truncate font-semibold text-slate-900"
    title={cell.customerName || "Guest name unavailable"}
  >
    {cell.customerName || "Guest name unavailable"}
  </span>

  {cell.customerContactNo?.trim() ? (
    <>
      <span className="shrink-0 text-slate-400">-</span>

      <span className="shrink-0 text-slate-600">
        {cell.customerContactNo.trim()}
      </span>
    </>
  ) : null}

</div>

<div className="mb-1 space-y-0.5 text-[11px] leading-tight">

  {/* Actual route for this calendar date */}
  {cell.routeSegments.length > 0 ? (
    cell.routeSegments.map((segment, index) => {
      const source =
        segment.locationName?.trim() ?? "";

      const destination =
        segment.nextVisitingLocation?.trim() ?? "";

      const location =
        source &&
        destination &&
        source.toLowerCase() !==
          destination.toLowerCase()
          ? `${source} → ${destination}`
          : source || destination;

      if (!location) return null;

      return (
        <div
          key={`${cell.date}-${index}-${source}-${destination}`}
          className="font-medium text-slate-800"
        >
          {!source && cell.isEnd
            ? `Drop: ${location}`
            : location}
        </div>
      );
    })
  ) : (
    <div className="text-slate-500">
      Location not recorded
    </div>
  )}

  {/* Actual hotel for this itinerary date */}
  {cell.hotelName?.trim() ? (
    <div className="text-slate-700">
      <span className="font-semibold">
        Hotel:
      </span>
      {" "}
      {cell.hotelName.trim()}
    </div>
  ) : null}

  {/* Pickup time only on the first day */}
  {cell.isStart && cell.tripStartTime ? (
    <div className="text-slate-600">
      <span className="font-medium">
        Pickup:
      </span>
      {" "}
      {cell.tripStartTime}
    </div>
  ) : null}

  {/* Drop time only on the final day */}
  {cell.isEnd && cell.tripEndTime ? (
    <div className="text-slate-600">
      <span className="font-medium">
        Drop time:
      </span>
      {" "}
      {cell.tripEndTime}
    </div>
  ) : null}

</div>

                     <div>
<div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-tight text-slate-700">
  <span>
    <span className="font-semibold">Driver:</span>
    {" "}
    {cell.hasDriver
      ? cell.driverName?.trim() ||
        "Driver name unavailable"
      : "Not assigned"}
  </span>

  {cell.hasDriver ? (
    cell.driverMobile?.trim() ? (
      <span className="font-medium text-blue-700">
        {cell.driverMobile.trim()}
      </span>
    ) : (
      <span className="text-slate-500">
        Mobile not recorded
      </span>
    )
  ) : null}
</div>

  <div className="flex flex-wrap items-center gap-1.5">
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
       title="Share driver daily moment link"
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
                          </div>
        );
      })}
    </div>
  </td>
);
})}
                 </tr>
  );
})}
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

{manageAvailabilityOpen ? (
  <TransportAvailabilityModal
    periods={data.periods}
    onClose={() =>
      setManageAvailabilityOpen(false)
    }
    onChanged={refreshChart}
  />
) : null}

<AddVehicleModal
  open={addVehicleOpen}
  onClose={() => setAddVehicleOpen(false)}
  onCreated={() => {
    void refreshChart();
  }}
  vendors={vendors}
  vehicleTypes={vehicleTypes}
  defaultVendorId={vendorIds[0] ?? ""}
  defaultVehicleTypeId={defaultModalVehicleTypeId}
/>

<AddDriverModal
  open={addDriverOpen}
  onClose={() => setAddDriverOpen(false)}
  onCreated={() => {
    void refreshChart();
  }}
  vendors={vendors}
  vehicleTypes={vehicleTypes}
  defaultVendorId={vendorIds[0] ?? ""}
  defaultVehicleTypeId={defaultModalVehicleTypeId}
/>
    </div>
  );
}
