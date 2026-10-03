import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AutoSuggestSelect } from "@/components/AutoSuggestSelect";
import { locationsApi } from "@/services/locations";
import { loadTollRoute, parseTollCharge, saveTollRoutes, type TollRouteEditor } from "./tollChargeBatch";
import { toast } from "sonner";

const MAX_ROUTES = 5;

export default function TollChargePage() {
  const [options, setOptions] = useState({ sources: [] as string[], destinations: [] as string[] });
  const [sources, setSources] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [routes, setRoutes] = useState<TollRouteEditor[]>([]);
  const [activeTollIndex, setActiveTollIndex] = useState(0);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const busy = loading || saving;
  const hasEdits = routes.some((route) => route.dirty);
  const validSelection = sources.length > 0 && sources.length <= MAX_ROUTES && sources.length === destinations.length;
  const pending = routes.filter((route) => route.locationId !== null && !route.loadError &&
    route.rows.length > 0 && route.saveState !== "saved");
  const invalidAmounts = pending.some((route) => route.rows.some((row) => parseTollCharge(row.charge) === null));
  const sourceOptions = useMemo(() => options.sources.map((value) => ({ value, label: value })), [options.sources]);
  const destinationOptions = useMemo(() => options.destinations.map((value) => ({ value, label: value })), [options.destinations]);

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);
    setOptionsError("");
    locationsApi.dropdowns().then((data) => {
      if (active) setOptions({ sources: data.sources || [], destinations: data.destinations || [] });
    }).catch(() => {
      if (active) setOptionsError("Unable to load location choices. Please retry.");
    }).finally(() => {
      if (active) setLoadingOptions(false);
    });
    return () => { active = false; };
  }, [optionsAttempt]);

  useEffect(() => {
    if (!hasEdits) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasEdits]);

  function canDiscard() {
    return !hasEdits || window.confirm("Discard the unsaved toll changes and continue?");
  }

  function changeSelection(side: "source" | "destination", value: string | string[]) {
    if (inFlight.current) return;
    const next = Array.from(new Set(
      (Array.isArray(value) ? value : value ? [value] : [])
        .map((item) => item.trim()).filter(Boolean),
    ));
    if (next.length > MAX_ROUTES) {
      toast.warning("Choose at most five locations on each side.");
      return;
    }
    if (!canDiscard()) return;
    if (side === "source") {
      setSources(next);
      if (!next.length) setDestinations([]);
    } else {
      setDestinations(next);
    }
    setRoutes([]);
    setActiveTollIndex(0);
  }

  async function handleGetInfo() {
    if (inFlight.current) return;
    if (!validSelection) {
      toast.warning("Choose the same number of source and destination locations, from one to five.");
      return;
    }
    if (!canDiscard()) return;
    inFlight.current = true;
    setLoading(true);
    setRoutes([]);
    setActiveTollIndex(0);
    try {
      const loaded = await Promise.all(sources.map((source, index) =>
        loadTollRoute({ source, destination: destinations[index] }, locationsApi),
      ));
      setRoutes(loaded);
      const failed = loaded.filter((route) => route.loadError).length;
      if (failed) {
        toast.warning(`${failed} route(s) could not load. See the separate route messages.`);
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  function updateCharge(routeIndex: number, rowIndex: number, charge: string) {
    if (inFlight.current) return;
    setRoutes((current) => current.map((route, index) => index !== routeIndex ? route : {
      ...route,
      dirty: true,
      saveState: "idle",
      saveError: "",
      rows: route.rows.map((row, index) => index === rowIndex ? { ...row, charge } : row),
    }));
  }

  async function handleSave() {
    if (inFlight.current || !pending.length) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const updated = await saveTollRoutes(routes, locationsApi);
      setRoutes(updated);
      const failed = updated.filter((route) => route.saveState === "error").length;
      const saved = updated.filter((route) => route.saveState === "saved").length;
      const skipped = updated.length - saved - failed;
      if (failed || skipped) {
        toast.warning(`${saved} route(s) saved; ${failed} failed; ${skipped} unavailable. Review the messages below.`);
      } else {
        toast.success(`Toll charges updated for all ${saved} route(s).`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update toll charges.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function handleClear() {
    if (inFlight.current || !canDiscard()) return;
    setSources([]);
    setDestinations([]);
    setRoutes([]);
    setActiveTollIndex(0);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Toll Charge</h1>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] gap-4">
          <div className="min-w-0">
            <div className="text-xs mb-1">
              Source Locations * ({sources.length}/{MAX_ROUTES})
            </div>
            <AutoSuggestSelect
              mode="multi"
              value={sources}
              onChange={(value) => changeSelection("source", value)}
              options={sourceOptions}
              maxSelected={MAX_ROUTES}
              showSelectedChipsInTrigger
              placeholder="Choose up to 5 source locations"
              disabled={busy || loadingOptions || !!optionsError}
            />
          </div>

          <div className="min-w-0">
            <div className="text-xs mb-1">
              Destination Locations * ({destinations.length}/{MAX_ROUTES})
            </div>
            <AutoSuggestSelect
              mode="multi"
              value={destinations}
              onChange={(value) => changeSelection("destination", value)}
              options={destinationOptions}
              maxSelected={MAX_ROUTES}
              showSelectedChipsInTrigger
              placeholder="Choose up to 5 destination locations"
              disabled={busy || loadingOptions || !!optionsError || !sources.length}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={handleGetInfo}
              disabled={busy || loadingOptions || !!optionsError || !validSelection}
            >
              {loading ? "Loading..." : "Get Info"}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={busy}>
              Clear
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Selections are paired in order: source 1 to destination 1, source 2 to destination 2, and so on.
        </p>

        {loadingOptions && (
          <p role="status" className="text-sm">Loading locations...</p>
        )}

        {optionsError && (
          <div role="alert" className="flex items-center gap-3 text-sm text-red-600">
            <span>{optionsError}</span>
            <Button
              variant="outline"
              onClick={() => setOptionsAttempt((value) => value + 1)}
            >
              Retry
            </Button>
          </div>
        )}

        {Math.max(sources.length, destinations.length) > 0 && (
          <div className="rounded-lg border border-purple-200 overflow-hidden">
            <div className="bg-purple-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-primary">
                Selected Route Pairs
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Each row below is one separate route.
                Select a destination for every source before clicking Get Info.
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-20">Route</TableHead>
                    <TableHead>
                      Source Location ({sources.length}/5 selected)
                    </TableHead>
                    <TableHead>
                      Destination Location ({destinations.length}/5 selected)
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {Array.from(
                    { length: Math.max(sources.length, destinations.length) },
                    (_, index) => (
                      <TableRow key={index} className="align-top">
                        <TableCell className="font-semibold text-primary">
                          {index + 1}
                        </TableCell>

                        <TableCell className="w-[43%] whitespace-normal">
                          <div className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 break-words">
                            {sources[index] || (
                              <span className="text-amber-700">
                                Source not selected
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="w-[43%] whitespace-normal">
                          <div
                            className={
                              destinations[index]
                                ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 break-words"
                                : "rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2"
                            }
                          >
                            {destinations[index] || (
                              <span className="text-amber-700">
                                Destination not selected
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {!!sources.length && sources.length !== destinations.length && (
          <p role="status" className="text-sm text-amber-700">
            Choose {sources.length} destination location(s) to match your{" "}
            {sources.length} source location(s).
          </p>
        )}
      </div>

      {!routes.length && (
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h2 className="text-lg font-semibold text-primary">Vehicle Toll Details</h2>
          <p role="status" className="text-sm text-muted-foreground">
            {loading
              ? "Loading toll charges for the selected routes..."
              : "Select your route pairs, then click Get Info to load separate toll tables."}
          </p>
        </div>
      )}

      {!!routes.length && (
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-primary">
              Select Toll Route
            </h2>
            <span className="text-sm text-muted-foreground">
              Showing Toll {activeTollIndex + 1} of {routes.length}
            </span>
          </div>

          <div
            role="group"
            aria-label="Choose toll route"
            className="flex flex-wrap gap-2"
          >
            {routes.map((route, index) => {
              const needsAttention =
                !!route.loadError ||
                route.saveState === "error" ||
                route.rows.some((row) => parseTollCharge(row.charge) === null);

              return (
                <Button
                  key={JSON.stringify([route.source, route.destination])}
                  type="button"
                  variant={activeTollIndex === index ? "default" : "outline"}
                  aria-pressed={activeTollIndex === index}
                  aria-controls={`toll-panel-${index}`}
                  title={`${route.source} to ${route.destination}`}
                  disabled={busy}
                  onClick={() => setActiveTollIndex(index)}
                  className="min-w-[90px] gap-2"
                >
                  Toll {index + 1}
                  {needsAttention ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                      Check
                    </span>
                  ) : route.saveState === "saved" ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-800">
                      Saved
                    </span>
                  ) : route.dirty ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                      Edited
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Click a Toll button to view or edit that route.
            Your changes remain when switching routes.
            Use Update Toll Charges below to save all routes.
          </p>
        </div>
      )}

      {routes.map((route, routeIndex) => (
        <section
          id={`toll-panel-${routeIndex}`}
          hidden={routeIndex !== activeTollIndex}
          key={JSON.stringify([route.source, route.destination])}
          className="bg-white rounded-lg border p-4 space-y-4"
          aria-labelledby={`toll-route-${routeIndex}`}
        >
          <h2
            id={`toll-route-${routeIndex}`}
            className="text-lg font-semibold text-primary"
          >
            Vehicle Toll Details - Route {routeIndex + 1}
          </h2>

          <p className="text-sm">{route.source} to {route.destination}</p>

          {route.loadError ? (
            <p role="alert" className="text-sm text-red-600">
              {route.loadError} This route will not be updated.
            </p>
          ) : !route.rows.length ? (
            <p className="text-sm text-amber-700">
              No active vehicle types returned. This route will not be updated.
            </p>
          ) : (
            <div className="rounded-md border max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.NO</TableHead>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Toll Charge</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {route.rows.map((row, rowIndex) => {
                    const invalid = parseTollCharge(row.charge) === null;
                    return (
                      <TableRow key={row.vehicle_type_id}>
                        <TableCell>{rowIndex + 1}</TableCell>
                        <TableCell>{row.vehicle_type_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={row.charge}
                            disabled={busy}
                            aria-label={`Route ${routeIndex + 1} ${row.vehicle_type_name} toll charge`}
                            aria-invalid={invalid}
                            onChange={(event) =>
                              updateCharge(routeIndex, rowIndex, event.target.value)
                            }
                          />
                          {invalid && (
                            <p className="mt-1 text-xs text-red-600">
                              Enter zero or a positive number.
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {route.saveState === "saved" && (
            <p role="status" className="text-sm text-green-700">
              Toll charges saved for this route.
            </p>
          )}

          {route.saveState === "error" && (
            <p role="alert" className="text-sm text-red-600">
              Update failed: {route.saveError} Your entered values are retained.
              Click Update Toll Charges to retry.
            </p>
          )}

          {route.dirty && route.saveState !== "error" && (
            <p className="text-sm text-amber-700">Unsaved toll changes.</p>
          )}
        </section>
      ))}

      {!!routes.length && (
        <div className="bg-white rounded-lg border p-4 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            {saving
              ? "Updating route tolls. Please wait..."
              : `${routes.filter((route) => route.saveState === "saved").length} of ${routes.length} routes saved.`}
            {!saving && invalidAmounts && " Correct the highlighted amounts before saving."}
          </p>

          <Button
            onClick={handleSave}
            disabled={busy || !pending.length || invalidAmounts}
          >
            {saving ? "Updating..." : "Update Toll Charges"}
          </Button>
        </div>
      )}
    </div>
  );
}
