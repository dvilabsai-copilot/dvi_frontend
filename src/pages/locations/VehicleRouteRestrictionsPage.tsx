import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Edit3, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  RouteOption,
  VehicleOption,
  VehicleRouteRestriction,
  VehicleRouteRestrictionPayload,
  vehicleRouteRestrictionsApi,
} from "../../services/vehicleRouteRestrictions";

type FormState = VehicleRouteRestrictionPayload & {
  vehicleTypeIds: number[];
  startLocalTime: string | null;
  endLocalTime: string | null;
  ghatName: string;
  roadNumber: string;
  detectionRadiusMetres: number;
  forwardEntryName: string;
  forwardEntryLatitude: string;
  forwardEntryLongitude: string;
  forwardExitName: string;
  forwardExitLatitude: string;
  forwardExitLongitude: string;
  reverseEntryName: string;
  reverseEntryLatitude: string;
  reverseEntryLongitude: string;
  reverseExitName: string;
  reverseExitLatitude: string;
  reverseExitLongitude: string;
  sourceReference?: string | null;
};

const emptyForm: FormState = {
  ruleCode: "",
  title: "",
  locationId: 0,
  direction: "FORWARD",
  restrictionAction: "BLOCK",
  isAllDay: false,
  appliesToAllVehicleTypes: false,
  startLocalTime: "18:00:00",
  endLocalTime: "23:59:59",
  timezoneName: "Asia/Kolkata",
  priority: 100,
  enforcementMode: "ENFORCE",
  vehicleTypeIds: [],
  ghatName: "",
  roadNumber: "",
  detectionRadiusMetres: 700,
  forwardEntryName: "",
  forwardEntryLatitude: "",
  forwardEntryLongitude: "",
  forwardExitName: "",
  forwardExitLatitude: "",
  forwardExitLongitude: "",
  reverseEntryName: "",
  reverseEntryLatitude: "",
  reverseEntryLongitude: "",
  reverseExitName: "",
  reverseExitLatitude: "",
  reverseExitLongitude: "",
};

type GeofencePoint = { name: string; latitude: number; longitude: number };
type SourceReference = {
  ghatName?: string;
  roadNumber?: string;
  road?: string;
  detectionRadiusMetres?: number;
  forwardDirection?: { route?: string; entry?: Record<string, unknown>; exit?: Record<string, unknown> };
  reverseDirection?: { route?: string; entry?: Record<string, unknown>; exit?: Record<string, unknown> };
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function numberOrNull(value: string): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validCoordinate(value: string, kind: "latitude" | "longitude"): boolean {
  const number = numberOrNull(value);
  return number !== null && number >= (kind === "latitude" ? -90 : -180) && number <= (kind === "latitude" ? 90 : 180);
}

function buildSourceReference(form: FormState, route?: RouteOption): string | null {
  const hasCoordinates = [
    form.forwardEntryLatitude, form.forwardEntryLongitude, form.forwardExitLatitude, form.forwardExitLongitude,
    form.reverseEntryLatitude, form.reverseEntryLongitude, form.reverseExitLatitude, form.reverseExitLongitude,
  ].some((value) => value.trim() !== "");
  if (!form.ghatName.trim() && !form.roadNumber.trim() && !hasCoordinates) return null;

  const point = (name: string, latitude: string, longitude: string): GeofencePoint | null => {
    const lat = numberOrNull(latitude);
    const lng = numberOrNull(longitude);
    if (lat === null || lng === null) return null;
    return { name: name.trim() || "Operational boundary", latitude: lat, longitude: lng };
  };
  const forwardEntry = point(form.forwardEntryName, form.forwardEntryLatitude, form.forwardEntryLongitude);
  const forwardExit = point(form.forwardExitName, form.forwardExitLatitude, form.forwardExitLongitude);
  const reverseEntry = point(form.reverseEntryName, form.reverseEntryLatitude, form.reverseEntryLongitude);
  const reverseExit = point(form.reverseExitName, form.reverseExitLatitude, form.reverseExitLongitude);
  let previous: SourceReference | null = null;
  try { previous = form.sourceReference ? JSON.parse(form.sourceReference) as SourceReference : null; } catch { previous = null; }
  const forwardRoute = route ? `${route.source_location} to ${route.destination_location}` : previous?.forwardDirection?.route;
  const reverseRoute = route ? `${route.destination_location} to ${route.source_location}` : previous?.reverseDirection?.route;
  return JSON.stringify({
    restrictionType: "route_segment_time",
    ghatName: form.ghatName.trim() || null,
    roadNumber: form.roadNumber.trim() || null,
    detectionRadiusMetres: form.detectionRadiusMetres || 700,
    forwardDirection: { ...(forwardRoute ? { route: forwardRoute } : {}), entry: forwardEntry, exit: forwardExit },
    reverseDirection: { ...(reverseRoute ? { route: reverseRoute } : {}), entry: reverseEntry, exit: reverseExit },
    sourceNotes: "Operational geofence supplied for route restriction timing checks.",
  });
}

function parseSourceReference(value: string | null | undefined): Partial<FormState> {
  if (!value) return {};
  try {
    const source = JSON.parse(value);
    const forward = source?.forwardDirection || {};
    const reverse = source?.reverseDirection || {};
    const point = (key: "forwardEntry" | "forwardExit" | "reverseEntry" | "reverseExit", item: Record<string, unknown> | undefined) => ({
      [`${key}Name`]: String(item?.name || ""),
      [`${key}Latitude`]: item?.latitude === undefined ? "" : String(item.latitude),
      [`${key}Longitude`]: item?.longitude === undefined ? "" : String(item.longitude),
    });
    return {
      ghatName: String(source?.ghatName || ""),
      roadNumber: String(source?.roadNumber || source?.road || ""),
      detectionRadiusMetres: Number(source?.detectionRadiusMetres || 700),
      ...point("forwardEntry", forward.entry), ...point("forwardExit", forward.exit),
      ...point("reverseEntry", reverse.entry), ...point("reverseExit", reverse.exit),
    } as Partial<FormState>;
  } catch {
    return {};
  }
}

function formatTimeValue(value: unknown): string {
  const raw = String(value ?? "");
  const isoMatch = raw.match(/T(\d{2}:\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];
  const timeMatch = raw.match(/\b(\d{2}:\d{2}:\d{2})\b/);
  return timeMatch?.[1] || "";
}

function normalizeTimeInput(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 6);
  if (!digits) return null;
  const padded = digits.padEnd(6, "0");
  const hours = Math.min(23, Number(padded.slice(0, 2)) || 0);
  const minutes = Math.min(59, Number(padded.slice(2, 4)) || 0);
  const seconds = Math.min(59, Number(padded.slice(4, 6)) || 0);
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function routeLabel(route: RouteOption): string {
  return `${route.source_location} → ${route.destination_location}`;
}

export default function VehicleRouteRestrictionsPage() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [rules, setRules] = useState<VehicleRouteRestriction[]>([]);
  const [routeSearch, setRouteSearch] = useState("");
  const [routePage, setRoutePage] = useState(1);
  const [routeTotal, setRouteTotal] = useState(0);
  const [routeHasNextPage, setRouteHasNextPage] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedRoute = useMemo(
    () => routes.find((route) => Number(route.location_ID) === Number(form.locationId)),
    [form.locationId, routes],
  );

  async function loadRoutes(search: string, page: number) {
    setRouteLoading(true);
    try {
      const response = await vehicleRouteRestrictionsApi.routes({ search, page, limit: 50 });
      setRoutes(response.items || []);
      setRoutePage(response.page || page);
      setRouteTotal(response.total || 0);
      setRouteHasNextPage(Boolean(response.hasNextPage));
    } catch (error: unknown) {
      setRoutes([]);
      setRouteTotal(0);
      setRouteHasNextPage(false);
      toast.error(errorMessage(error, "Unable to load routes"));
    } finally {
      setRouteLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [vehicleRows, ruleRows] = await Promise.all([
        vehicleRouteRestrictionsApi.vehicles(),
        vehicleRouteRestrictionsApi.list(),
      ]);
      setVehicles(vehicleRows || []);
      setRules(ruleRows || []);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Unable to load restriction data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRoutes(routeSearch, 1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [routeSearch]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleVehicle(vehicleTypeId: number) {
    setForm((current) => ({
      ...current,
      vehicleTypeIds: current.vehicleTypeIds.includes(vehicleTypeId)
        ? current.vehicleTypeIds.filter((id) => id !== vehicleTypeId)
        : [...current.vehicleTypeIds, vehicleTypeId],
    }));
  }

  function reset() {
    setForm({ ...emptyForm, vehicleTypeIds: [] });
    setEditingId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.ruleCode.trim() || !form.title.trim() || !form.locationId || (!form.appliesToAllVehicleTypes && !form.vehicleTypeIds.length)) {
      toast.error("Enter the rule details, choose a route, and select vehicle types or enable all vehicle types");
      return;
    }
    const geofenceCoordinates = [
      form.forwardEntryLatitude, form.forwardEntryLongitude, form.forwardExitLatitude, form.forwardExitLongitude,
      form.reverseEntryLatitude, form.reverseEntryLongitude, form.reverseExitLatitude, form.reverseExitLongitude,
    ].some((value) => value.trim() !== "");
    const latitudeValues = [form.forwardEntryLatitude, form.forwardExitLatitude, form.reverseEntryLatitude, form.reverseExitLatitude];
    const longitudeValues = [form.forwardEntryLongitude, form.forwardExitLongitude, form.reverseEntryLongitude, form.reverseExitLongitude];
    if (geofenceCoordinates && [...latitudeValues, ...longitudeValues].some((value) => numberOrNull(value) === null)) {
      toast.error("Enter valid latitude and longitude values for every geofence point");
      return;
    }
    if (latitudeValues.some((value) => value.trim() && !validCoordinate(value, "latitude")) || longitudeValues.some((value) => value.trim() && !validCoordinate(value, "longitude"))) {
      toast.error("Latitude and longitude values must be within valid geographic ranges");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, sourceReference: buildSourceReference(form, selectedRoute) };
      if (editingId !== null) {
        await vehicleRouteRestrictionsApi.update(editingId, payload);
        toast.success("Restriction updated");
      } else {
        await vehicleRouteRestrictionsApi.create(payload);
        toast.success("Restriction created");
      }
      reset();
      await load();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Unable to save restriction"));
    } finally {
      setSaving(false);
    }
  }

  async function edit(rule: VehicleRouteRestriction) {
    const locationId = Number(rule.location_id);
    const geofence = parseSourceReference(rule.source_reference);
    setEditingId(rule.route_vehicle_restriction_id);
    setForm({
      ...emptyForm,
      ruleCode: rule.rule_code,
      title: rule.title,
      locationId,
      direction: rule.direction,
      isAllDay: Boolean(rule.is_all_day),
      appliesToAllVehicleTypes: Boolean(rule.applies_to_all_vehicle_types),
      startLocalTime: rule.start_local_time ? formatTimeValue(rule.start_local_time) : null,
      endLocalTime: rule.end_local_time ? formatTimeValue(rule.end_local_time) : null,
      priority: rule.priority,
      enforcementMode: rule.enforcement_mode,
      vehicleTypeIds: (rule.vehicle_types || []).map((item) => Number(item.vehicle_type_id)),
      sourceReference: rule.source_reference || null,
      ...geofence,
    });
    setRouteSearch(String(locationId));
    await loadRoutes(String(locationId), 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function disable(rule: VehicleRouteRestriction) {
    if (!window.confirm(`Disable restriction ${rule.rule_code}?`)) return;
    try {
      await vehicleRouteRestrictionsApi.remove(rule.route_vehicle_restriction_id);
      toast.success("Restriction disabled");
      await load();
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Unable to disable restriction"));
    }
  }

  return (
    <div className="space-y-6 bg-[#fbf8fe] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#d64ab7]">Location rules</p>
          <h1 className="text-2xl font-bold text-[#4f4766]">Vehicle Route Restrictions</h1>
          <p className="mt-1 text-sm text-[#8e88a1]">
            Restrict stored route segments by vehicle class and local time. Use All vehicle types for road closures.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={reset}>
          <Plus className="mr-2 h-4 w-4" />
          New rule
        </Button>
      </div>

      <Card className="border-[#eadff6] bg-white shadow-[0_10px_30px_rgba(137,88,166,0.06)]">
        <CardHeader>
          <CardTitle className="text-[#d64ab7]">{editingId !== null ? "Edit restriction" : "Create restriction"}</CardTitle>
          <CardDescription>
            Use a stored route, vehicle classes, and local time. Enable All vehicle types when the closure applies to every vehicle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={submit}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="restriction-rule-code">Rule code</Label>
                <Input id="restriction-rule-code" value={form.ruleCode} onChange={(event) => update("ruleCode", event.target.value)} placeholder="OOTY_GHAT_AFTER_18" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="restriction-title">Title</Label>
                <Input id="restriction-title" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Ghat Road after 6 PM" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="route-search">Route filter</Label>
                <Input id="route-search" value={routeSearch} onChange={(event) => setRouteSearch(event.target.value)} placeholder="Search source, destination, or route ID" />
                <p className="text-xs text-muted-foreground">
                  {routeTotal.toLocaleString()} matches · page {routePage} · 50 routes per page
                </p>
              </div>
              <div className="space-y-2">
                <Label>Route</Label>
                <Select value={form.locationId ? String(form.locationId) : undefined} onValueChange={(value) => update("locationId", Number(value))}>
                  <SelectTrigger aria-label="Route">
                    <SelectValue placeholder={routeLoading ? "Loading routes..." : "Select a route"} />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={String(route.location_ID)} value={String(route.location_ID)}>
                        {routeLabel(route)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="truncate text-xs text-muted-foreground" title={selectedRoute ? routeLabel(selectedRoute) : undefined}>
                  {selectedRoute ? `Selected: ${routeLabel(selectedRoute)}` : "Choose a stored route"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#eadff6] bg-[#fbf8fe] p-3">
              <p className="text-xs text-[#8e88a1]">Use pagination to keep the route dropdown fast on the full route catalogue.</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={routeLoading || routePage <= 1} onClick={() => void loadRoutes(routeSearch, routePage - 1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={routeLoading || !routeHasNextPage} onClick={() => void loadRoutes(routeSearch, routePage + 1)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={(value: FormState["direction"]) => update("direction", value)}>
                  <SelectTrigger aria-label="Direction"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORWARD">Forward only</SelectItem>
                    <SelectItem value="REVERSE">Reverse only</SelectItem>
                    <SelectItem value="BOTH">Both directions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="restriction-priority">Priority</Label>
                <Input id="restriction-priority" type="number" min="1" value={form.priority} onChange={(event) => update("priority", Number(event.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Enforcement</Label>
                <Select value={form.enforcementMode} onValueChange={(value: FormState["enforcementMode"]) => update("enforcementMode", value)}>
                  <SelectTrigger aria-label="Enforcement"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENFORCE">Enforce</SelectItem>
                    <SelectItem value="SHADOW">Shadow only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex h-10 w-full items-center gap-2 rounded-md border border-[#eadff6] px-3 text-sm text-[#4f4766]">
                  <input type="checkbox" className="h-4 w-4 accent-[#d64ab7]" checked={form.isAllDay} onChange={(event) => update("isAllDay", event.target.checked)} />
                  All day restriction
                </label>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-[#eadff6] bg-[#fbf8fe] p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-medium text-[#4f4766]">Ghat / forest geofence</p>
                  <p className="text-xs text-muted-foreground">Optional operational boundaries. A route must cross the entry and exit geofences in order before timing is applied.</p>
                </div>
                <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(180px,1fr)_140px]">
                  <Input aria-label="Ghat name" value={form.ghatName} onChange={(event) => update("ghatName", event.target.value)} placeholder="Kallar-Coonoor Ghat Road" />
                  <Input aria-label="Road number" value={form.roadNumber} onChange={(event) => update("roadNumber", event.target.value)} placeholder="NH 181" />
                </div>
              </div>
              <div className="flex items-center gap-3 sm:max-w-xs">
                <Label htmlFor="geofence-radius">Radius (metres)</Label>
                <Input id="geofence-radius" type="number" min="50" max="5000" value={form.detectionRadiusMetres} onChange={(event) => update("detectionRadiusMetres", Number(event.target.value) || 700)} />
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {([
                  ["Forward direction", "forwardEntry", "forwardExit"],
                  ["Reverse direction", "reverseEntry", "reverseExit"],
                ] as const).map(([label, entryKey, exitKey]) => (
                  <div key={label} className="space-y-3 rounded-md border border-[#eadff6] bg-white p-3">
                    <p className="text-sm font-medium text-[#4f4766]">{label}</p>
                    {[['Entry', entryKey], ['Exit', exitKey]].map(([pointLabel, key]) => {
                      const pointKey = key as "forwardEntry" | "forwardExit" | "reverseEntry" | "reverseExit";
                      return <div key={pointKey} className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_1fr_1fr]">
                        <Input aria-label={`${label} ${pointLabel} name`} value={form[`${pointKey}Name`]} onChange={(event) => update(`${pointKey}Name`, event.target.value)} placeholder={`${pointLabel} name`} />
                        <Input aria-label={`${label} ${pointLabel} latitude`} value={form[`${pointKey}Latitude`]} onChange={(event) => update(`${pointKey}Latitude`, event.target.value)} placeholder="Latitude" inputMode="decimal" />
                        <Input aria-label={`${label} ${pointLabel} longitude`} value={form[`${pointKey}Longitude`]} onChange={(event) => update(`${pointKey}Longitude`, event.target.value)} placeholder="Longitude" inputMode="decimal" />
                      </div>;
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-[#eadff6] bg-[#fbf8fe] p-4">
                <div>
                  <p className="font-medium text-[#4f4766]">Local time window</p>
                  <p className="text-xs text-muted-foreground">Times are stored as local wall-clock values.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="restriction-start-time">Starts</Label>
                    <Input id="restriction-start-time" type="text" inputMode="numeric" placeholder="18:00:00" maxLength={8} disabled={form.isAllDay} value={form.startLocalTime || ""} onChange={(event) => update("startLocalTime", normalizeTimeInput(event.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restriction-end-time">Ends</Label>
                    <Input id="restriction-end-time" type="text" inputMode="numeric" placeholder="23:59:59" maxLength={8} disabled={form.isAllDay} value={form.endLocalTime || ""} onChange={(event) => update("endLocalTime", normalizeTimeInput(event.target.value))} />
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border border-[#eadff6] bg-[#fbf8fe] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#4f4766]">Vehicle types</p>
                    <p className="text-xs text-muted-foreground">Choose vehicle classes, or use this for a closure that applies to every vehicle.</p>
                  </div>
                  <Badge variant="secondary">{form.appliesToAllVehicleTypes ? "All vehicle types" : `${form.vehicleTypeIds.length} selected`}</Badge>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#eadff6] bg-white px-3 py-2 text-sm text-[#4f4766]">
                  <input type="checkbox" className="h-4 w-4 accent-[#d64ab7]" checked={form.appliesToAllVehicleTypes} onChange={(event) => update("appliesToAllVehicleTypes", event.target.checked)} />
                  All vehicle types
                </label>
                <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {vehicles.map((vehicle) => (
                    <label key={vehicle.vehicle_type_id} className={`flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm ${form.appliesToAllVehicleTypes ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#eadff6] hover:bg-white"}`}>
                      <input type="checkbox" className="h-4 w-4 accent-[#d64ab7]" disabled={form.appliesToAllVehicleTypes} checked={form.vehicleTypeIds.includes(vehicle.vehicle_type_id)} onChange={() => toggleVehicle(vehicle.vehicle_type_id)} />
                      <span className="truncate">{vehicle.vehicle_type_title || `Vehicle ${vehicle.vehicle_type_id}`}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#eadff6] pt-5">
              {editingId !== null && <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>}
              <Button type="submit" disabled={saving || loading}>
                {saving ? "Saving..." : editingId !== null ? "Update restriction" : "Create restriction"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[#eadff6] bg-white shadow-[0_10px_30px_rgba(137,88,166,0.06)]">
        <CardHeader>
          <CardTitle className="text-[#4f4766]">Configured restrictions</CardTitle>
          <CardDescription>Active rules are evaluated when itinerary routes and times are persisted.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-[#eadff6]">
            <Table>
              <TableHeader className="bg-[#fbf8fe]">
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle types</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading restrictions...</TableCell></TableRow>
                ) : rules.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No restrictions configured.</TableCell></TableRow>
                ) : rules.map((rule) => {
                  const start = formatTimeValue(rule.start_local_time);
                  const end = formatTimeValue(rule.end_local_time);
                  return (
                    <TableRow key={String(rule.route_vehicle_restriction_id)}>
                      <TableCell>
                        <div className="font-medium text-[#4f4766]">{rule.rule_code}</div>
                        <div className="max-w-xs truncate text-xs text-muted-foreground" title={rule.title}>{rule.title}</div>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm">Route #{String(rule.location_id)}</TableCell>
                      <TableCell className="text-sm">{rule.applies_to_all_vehicle_types ? "All vehicle types" : `${rule.vehicle_types?.length || 0} type(s)`}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{rule.is_all_day ? "All day" : `${start || "--"} – ${end || "--"}`}</TableCell>
                      <TableCell>
                        <Badge className={rule.enforcement_mode === "ENFORCE" ? "border-transparent bg-[#fce4f5] text-[#c02678]" : "border-transparent bg-[#eee7ff] text-[#6d28d9]"}>
                          {rule.enforcement_mode === "ENFORCE" ? "Enforce" : "Shadow"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => void edit(rule)} aria-label={`Edit ${rule.rule_code}`}>
                            <Edit3 className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => void disable(rule)} aria-label={`Disable ${rule.rule_code}`}>
                            <Trash2 className="mr-1 h-4 w-4" /> Disable
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
