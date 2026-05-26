import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AutoSuggestSelect, AutoSuggestOption } from "@/components/AutoSuggestSelect";
import {
  locationsApi,
  type BetweenHotspotsFilterHotspot,
  type BetweenHotspotsFilterLocation,
  type BetweenHotspotsHotspotSummary,
  type BetweenHotspotsLocationContext,
  type BetweenHotspotsRow,
} from "@/services/locations";

const PAGE_SIZE = 50;

type Filters = {
  locationId: string;
  sourceHotspotId: string;
  destinationHotspotId: string;
  onlyUsable: boolean;
  search: string;
};

type BetweenHotspotsSummaryCardProps = {
  title: string;
  hotspot?: BetweenHotspotsHotspotSummary | null;
};

function toText(value: unknown, fallback = "—") {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text || fallback;
}

function formatNumber(value: unknown, decimals = 2) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return toText(value);
  return numberValue.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatInteger(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return toText(value);
  return Math.round(numberValue).toLocaleString("en-IN");
}

function routeFitBadgeClass(routeFitType: unknown) {
  switch (String(routeFitType || "").trim().toUpperCase()) {
    case "ON_ROUTE":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "MINOR_DETOUR":
      return "border-transparent bg-amber-100 text-amber-800";
    case "BACKTRACK":
      return "border-transparent bg-orange-100 text-orange-800";
    case "OFF_ROUTE":
      return "border-transparent bg-rose-100 text-rose-800";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

function routeFitLabel(routeFitType: unknown) {
  return String(routeFitType || "").replace(/_/g, " ").trim() || "Unknown";
}

function summaryValue(summary: BetweenHotspotsHotspotSummary | null | undefined, keys: string[]) {
  if (!summary) return "—";

  for (const key of keys) {
    const value = summary[key as keyof BetweenHotspotsHotspotSummary];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "—";
}

function normalizeHotspotSummary(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as BetweenHotspotsHotspotSummary;
  return {
    ...data,
    hotspot_name: summaryValue(data, ["hotspot_name", "hotspotName", "name"]),
  };
}

function getRowValue(row: BetweenHotspotsRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key as keyof BetweenHotspotsRow];
    if (value !== null && value !== undefined && String(value).trim()) {
      return value;
    }
  }

  return "";
}

function normalizeRow(row: BetweenHotspotsRow) {
  return {
    between_hotspot_id: getRowValue(row, ["between_hotspot_id", "betweenHotspotId", "id"]),
    between_hotspot_name: getRowValue(row, ["between_hotspot_name", "betweenHotspotName", "name"]),
    between_hotspot_location: getRowValue(row, ["between_hotspot_location", "betweenHotspotLocation", "location"]),
    route_fit_type: getRowValue(row, ["route_fit_type", "routeFitType"]),
    road_detour_km: getRowValue(row, ["road_detour_km", "roadDetourKm"]),
    road_detour_ratio: getRowValue(row, ["road_detour_ratio", "roadDetourRatio"]),
    candidate_distance_from_ab_route_meters: getRowValue(row, ["candidate_distance_from_ab_route_meters", "candidateDistanceFromAbRouteMeters"]),
    route_decision_reason: getRowValue(row, ["route_decision_reason", "routeDecisionReason"]),
  };
}

function toLocationOption(location: BetweenHotspotsFilterLocation): AutoSuggestOption {
  return {
    value: String(location.locationId),
    label: String(location.locationName || location.locationId),
  };
}

function toHotspotOption(hotspot: BetweenHotspotsFilterHotspot): AutoSuggestOption {
  return {
    value: String(hotspot.hotspotId),
    label: String(hotspot.hotspotName || hotspot.hotspotId),
  };
}

function SummaryCard({ title, hotspot }: BetweenHotspotsSummaryCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-1">
        <p className="text-lg font-semibold text-slate-900">{summaryValue(hotspot, ["hotspot_name", "hotspotName", "name"])} </p>
        <p className="text-sm text-slate-600">{summaryValue(hotspot, ["location", "source_location", "destination_location"])}</p>
        <p className="text-sm text-slate-600">{summaryValue(hotspot, ["city", "source_location_city", "destination_location_city"])}</p>
      </div>
    </div>
  );
}

function PaginationButtons({ total, page, pageSize, onPageChange }: { total: number; page: number; pageSize: number; onPageChange: (nextPage: number) => void; }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const items = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (page <= 3) {
      return [1, 2, 3, "...", totalPages];
    }

    if (page >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <Pagination>
      <PaginationContent className="flex-wrap justify-center">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(event) => {
              event.preventDefault();
              if (page > 1) onPageChange(page - 1);
            }}
            className={page <= 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {items.map((item, index) => {
          if (item === "...") {
            return (
              <PaginationItem key={`ellipsis-${index}`}>
                <span className="flex h-9 w-9 items-center justify-center text-slate-400">...</span>
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={item}>
              <PaginationLink
                href="#"
                isActive={item === page}
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(Number(item));
                }}
                className="min-w-9"
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(event) => {
              event.preventDefault();
              if (page < totalPages) onPageChange(page + 1);
            }}
            className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default function BetweenHotspotsPage() {
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [locationOptions, setLocationOptions] = useState<AutoSuggestOption[]>([]);
  const [sourceHotspotOptions, setSourceHotspotOptions] = useState<AutoSuggestOption[]>([]);
  const [destinationHotspotOptions, setDestinationHotspotOptions] = useState<AutoSuggestOption[]>([]);

  const [draftFilters, setDraftFilters] = useState<Filters>({
    locationId: "",
    sourceHotspotId: "",
    destinationHotspotId: "",
    onlyUsable: true,
    search: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters | null>(null);

  const [rows, setRows] = useState<BetweenHotspotsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceHotspot, setSourceHotspot] = useState<BetweenHotspotsHotspotSummary | null>(null);
  const [destinationHotspot, setDestinationHotspot] = useState<BetweenHotspotsHotspotSummary | null>(null);
  const [locationContext, setLocationContext] = useState<BetweenHotspotsLocationContext | null>(null);

  const pageSize = PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedLocationLabel = useMemo(
    () => locationOptions.find((option) => option.value === draftFilters.locationId)?.label || "selected route",
    [draftFilters.locationId, locationOptions]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      setFilterOptionsLoading(true);
      try {
        const response = await locationsApi.betweenHotspotsFilters({
          onlyUsable: draftFilters.onlyUsable,
        });

        if (cancelled) return;

        const nextLocationOptions = response.locations.map(toLocationOption);

        setLocationOptions(nextLocationOptions);

        setDraftFilters((prev) => {
          const validLocation = !prev.locationId || nextLocationOptions.some((option) => option.value === prev.locationId);

          if (validLocation) {
            return prev;
          }

          return {
            ...prev,
            locationId: validLocation ? prev.locationId : "",
            sourceHotspotId: "",
            destinationHotspotId: "",
          };
        });
      } catch (loadError) {
        if (cancelled) return;
        console.error("Failed to load between hotspots filter options:", loadError);
        setLocationOptions([]);
        setSourceHotspotOptions([]);
        setDestinationHotspotOptions([]);
        toast.error("Failed to load between hotspots filters");
      } finally {
        if (!cancelled) setFilterOptionsLoading(false);
      }
    }

    void loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, [draftFilters.onlyUsable]);

  useEffect(() => {
    let cancelled = false;

    async function loadRouteOptions() {
      if (!draftFilters.locationId) {
        setSourceHotspotOptions([]);
        setDestinationHotspotOptions([]);
        return;
      }

      setFilterOptionsLoading(true);

      try {
        const response = await locationsApi.betweenHotspotsFilters({
          locationId: Number(draftFilters.locationId),
          sourceHotspotId: draftFilters.sourceHotspotId ? Number(draftFilters.sourceHotspotId) : undefined,
          onlyUsable: draftFilters.onlyUsable,
        });

        if (cancelled) return;

        setSourceHotspotOptions(response.sourceHotspots.map(toHotspotOption));
        setDestinationHotspotOptions(response.destinationHotspots.map(toHotspotOption));

        setDraftFilters((prev) => {
          const validSource = !prev.sourceHotspotId || response.sourceHotspots.some((item) => String(item.hotspotId) === prev.sourceHotspotId);
          const validDestination = !prev.destinationHotspotId || response.destinationHotspots.some((item) => String(item.hotspotId) === prev.destinationHotspotId);

          if (validSource && validDestination) {
            return prev;
          }

          return {
            ...prev,
            sourceHotspotId: validSource ? prev.sourceHotspotId : "",
            destinationHotspotId: validDestination ? prev.destinationHotspotId : "",
          };
        });
      } catch (loadError) {
        if (cancelled) return;
        console.error("Failed to load hotspot route options:", loadError);
        setSourceHotspotOptions([]);
        setDestinationHotspotOptions([]);
      } finally {
        if (!cancelled) setFilterOptionsLoading(false);
      }
    }

    void loadRouteOptions();

    return () => {
      cancelled = true;
    };
  }, [draftFilters.locationId, draftFilters.onlyUsable, draftFilters.sourceHotspotId]);

  const fetchData = async (filters: Filters, targetPage: number) => {
    const sourceHotspotId = Number(filters.sourceHotspotId);
    const destinationHotspotId = Number(filters.destinationHotspotId);

    if (!Number.isFinite(sourceHotspotId) || !Number.isFinite(destinationHotspotId) || sourceHotspotId <= 0 || destinationHotspotId <= 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await locationsApi.betweenHotspots({
        locationId: filters.locationId ? Number(filters.locationId) : undefined,
        sourceHotspotId,
        destinationHotspotId,
        onlyUsable: filters.onlyUsable,
        search: filters.search.trim() || undefined,
        page: targetPage,
        pageSize,
      });

      setRows(Array.isArray(response.rows) ? response.rows : []);
      setTotal(Number(response.total || 0));
      setPage(Number(response.page || targetPage));
      setSourceHotspot(normalizeHotspotSummary(response.sourceHotspot));
      setDestinationHotspot(normalizeHotspotSummary(response.destinationHotspot));
      setLocationContext(response.locationContext || null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load between hotspots data";
      console.error(loadError);
      setRows([]);
      setTotal(0);
      setSourceHotspot(null);
      setDestinationHotspot(null);
      setLocationContext(null);
      setError(message);
      toast.error("Failed to load between hotspots data");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draftFilters.locationId.trim() || !draftFilters.sourceHotspotId.trim() || !draftFilters.destinationHotspotId.trim()) {
      setError("Location, Source Hotspot and Destination Hotspot are required.");
      return;
    }

    const nextFilters = {
      ...draftFilters,
      locationId: draftFilters.locationId.trim(),
      sourceHotspotId: draftFilters.sourceHotspotId.trim(),
      destinationHotspotId: draftFilters.destinationHotspotId.trim(),
      search: draftFilters.search.trim(),
    };

    setAppliedFilters(nextFilters);
    setPage(1);
  };

  useEffect(() => {
    if (!appliedFilters) return;
    void fetchData(appliedFilters, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page]);

  const handleReset = () => {
    setDraftFilters({
      locationId: "",
      sourceHotspotId: "",
      destinationHotspotId: "",
      onlyUsable: true,
      search: "",
    });
    setAppliedFilters(null);
    setRows([]);
    setTotal(0);
    setPage(1);
    setSourceHotspot(null);
    setDestinationHotspot(null);
    setLocationContext(null);
    setError(null);
  };

  const handleRefresh = () => {
    if (!appliedFilters) return;
    void fetchData(appliedFilters, page);
  };

  const emptyStateCopy = appliedFilters
    ? "No between-hotspot rows matched the current filters."
    : "Choose a valid location, then pick source and destination hotspots to load results.";

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Locations</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Between Hotspots</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Read-only hotspot route lookup with backend-driven filters and server-side pagination.
          </p>
        </div>

        <Button type="button" variant="outline" onClick={handleRefresh} disabled={!appliedFilters || loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <form onSubmit={handleApply} className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
            <AutoSuggestSelect
              mode="single"
              value={draftFilters.locationId}
              onChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  locationId: String(value || ""),
                  sourceHotspotId: "",
                  destinationHotspotId: "",
                }))
              }
              options={locationOptions}
              placeholder={
                filterOptionsLoading
                  ? "Loading locations..."
                  : locationOptions.length
                  ? "Select location"
                  : "No locations with between hotspots"
              }
              disabled={filterOptionsLoading || locationOptions.length === 0}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Source Hotspot</label>
            <AutoSuggestSelect
              mode="single"
              value={draftFilters.sourceHotspotId}
              onChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  sourceHotspotId: String(value || ""),
                  destinationHotspotId: "",
                }))
              }
              options={sourceHotspotOptions}
              placeholder={
                !draftFilters.locationId
                  ? "Select location first"
                  : filterOptionsLoading
                  ? "Loading source hotspots..."
                  : sourceHotspotOptions.length
                  ? "Select source hotspot"
                  : `No hotspots for ${selectedLocationLabel}`
              }
              disabled={filterOptionsLoading || !draftFilters.locationId || sourceHotspotOptions.length === 0}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Destination Hotspot</label>
            <AutoSuggestSelect
              mode="single"
              value={draftFilters.destinationHotspotId}
              onChange={(value) => setDraftFilters((prev) => ({ ...prev, destinationHotspotId: String(value || "") }))}
              options={destinationHotspotOptions}
              placeholder={
                !draftFilters.locationId
                  ? "Select location first"
                  : !draftFilters.sourceHotspotId
                  ? "Select source hotspot first"
                  : filterOptionsLoading
                  ? "Loading destination hotspots..."
                  : destinationHotspotOptions.length
                  ? "Select destination hotspot"
                  : "No valid destinations for this source"
              }
              disabled={
                filterOptionsLoading ||
                !draftFilters.locationId ||
                !draftFilters.sourceHotspotId ||
                destinationHotspotOptions.length === 0
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Filter rows"
                value={draftFilters.search}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-end gap-3">
            <label className="flex h-10 items-center gap-3 rounded-md border px-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draftFilters.onlyUsable}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    onlyUsable: event.target.checked,
                    sourceHotspotId: "",
                    destinationHotspotId: "",
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Only Usable
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Filter options come from the backend and the main query stays read-only.</p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handleReset} className="w-full sm:w-auto">
              Reset
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply
            </Button>
          </div>
        </div>
      </form>

      {sourceHotspot || destinationHotspot ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SummaryCard title="Source Hotspot" hotspot={sourceHotspot} />
          <SummaryCard title="Destination Hotspot" hotspot={destinationHotspot} />
        </div>
      ) : null}

      {locationContext ? (
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold text-slate-900">Location Context</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Source Location</p>
              <p className="mt-1 text-sm text-slate-900">{toText(locationContext.source_location)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Source Location City</p>
              <p className="mt-1 text-sm text-slate-900">{toText(locationContext.source_location_city)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Destination Location</p>
              <p className="mt-1 text-sm text-slate-900">{toText(locationContext.destination_location)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Destination Location City</p>
              <p className="mt-1 text-sm text-slate-900">{toText(locationContext.destination_location_city)}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-base font-semibold text-slate-900">Between hotspot rows</p>
            <p className="text-sm text-slate-500">
              {total > 0 ? `Showing ${Math.min((page - 1) * pageSize + 1, total)}-${Math.min(page * pageSize, total)} of ${total}` : emptyStateCopy}
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center px-4 py-16">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading between hotspots...
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center sm:px-6">
            <p className="text-base font-medium text-slate-900">No rows to display</p>
            <p className="mt-2 text-sm text-slate-500">{emptyStateCopy}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Between Hotspot ID</TableHead>
                    <TableHead>Between Hotspot Name</TableHead>
                    <TableHead>Between Hotspot Location</TableHead>
                    <TableHead>Route Fit Type</TableHead>
                    <TableHead className="text-right">Road Detour Km</TableHead>
                    <TableHead className="text-right">Road Detour Ratio</TableHead>
                    <TableHead className="text-right">Candidate Distance From AB Route</TableHead>
                    <TableHead>Route Decision Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => {
                    const normalized = normalizeRow(row);

                    return (
                      <TableRow key={`${normalized.between_hotspot_id}-${index}`}>
                        <TableCell className="font-medium text-slate-900">{toText(normalized.between_hotspot_id)}</TableCell>
                        <TableCell>{toText(normalized.between_hotspot_name)}</TableCell>
                        <TableCell>{toText(normalized.between_hotspot_location)}</TableCell>
                        <TableCell>
                          <Badge className={routeFitBadgeClass(normalized.route_fit_type)}>
                            {routeFitLabel(normalized.route_fit_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(normalized.road_detour_km)}</TableCell>
                        <TableCell className="text-right">{formatNumber(normalized.road_detour_ratio, 3)}</TableCell>
                        <TableCell className="text-right">{formatInteger(normalized.candidate_distance_from_ab_route_meters)}</TableCell>
                        <TableCell className="max-w-[360px] whitespace-normal text-slate-700">{toText(normalized.route_decision_reason)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {rows.map((row, index) => {
                const normalized = normalizeRow(row);

                return (
                  <div key={`${normalized.between_hotspot_id}-${index}`} className="rounded-xl border bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Between Hotspot ID</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{toText(normalized.between_hotspot_id)}</p>
                      </div>
                      <Badge className={routeFitBadgeClass(normalized.route_fit_type)}>{routeFitLabel(normalized.route_fit_type)}</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Name</p>
                        <p className="mt-1 text-sm text-slate-900">{toText(normalized.between_hotspot_name)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Location</p>
                        <p className="mt-1 text-sm text-slate-900">{toText(normalized.between_hotspot_location)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Road Detour Km</p>
                        <p className="mt-1 text-sm text-slate-900">{formatNumber(normalized.road_detour_km)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Road Detour Ratio</p>
                        <p className="mt-1 text-sm text-slate-900">{formatNumber(normalized.road_detour_ratio, 3)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Candidate Distance</p>
                        <p className="mt-1 text-sm text-slate-900">{formatInteger(normalized.candidate_distance_from_ab_route_meters)} m</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Route Decision Reason</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{toText(normalized.route_decision_reason)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="border-t px-4 py-4 sm:px-5">
          <PaginationButtons total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
