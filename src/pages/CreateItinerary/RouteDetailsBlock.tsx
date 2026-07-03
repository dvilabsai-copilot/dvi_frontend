// FILE: src/pages/CreateItinerary/RouteDetailsBlock.tsx

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AutoSuggestSelect,
  type AutoSuggestOption,
} from "@/components/AutoSuggestSelect";
import { LocationOption } from "@/services/itineraryDropdownsMock";
import { locationsApi } from "@/services/locations";

type ViaRouteItem = {
  itinerary_via_location_ID: number;
  itinerary_via_location_name: string;
};

type RouteDetailRow = {
  id: number;
  day: number;
  date: string;
  source: string;
  next: string;
  via: string;
  via_routes?: ViaRouteItem[];
  no_of_km?: number | string;
  directVisit: "Yes" | "No";
};

type ValidationErrors = {
  [key: string]: string;
};

type RouteDetailsBlockProps = {
  routeDetails: RouteDetailRow[];
  setRouteDetails: React.Dispatch<React.SetStateAction<RouteDetailRow[]>>;
  locations: LocationOption[];

  // optional hooks from parent
  onOpenViaRoutes?: (row: RouteDetailRow) => void;
  onRefreshRouteDistance?: (row: RouteDetailRow) => Promise<number | string>;
  onDeleteDay?: () => void;
  onDeleteRouteDay?: (deleteIdx: number) => void;
  addDay?: () => void;

  // optional validation from parent
  validationErrors?: ValidationErrors;

  // Departure location to lock last row's Next Destination
  departureLocation?: string;

  // Hide Intercity KM only where needed
  hideIntercityKm?: boolean;
};

async function fetchStoredDestinationLocations(
  source: string,
  options?: {
    dayNo?: number;
    totalNoOfDays?: number;
    departureLocation?: string;
  }
): Promise<LocationOption[]> {
  const data = await locationsApi.list({
    itineraryMode: true,
    type: "destination",
    source,
    dayNo: options?.dayNo,
    totalNoOfDays: options?.totalNoOfDays,
    departureLocation: options?.departureLocation,
  });

  return (data?.rows || [])
    .map((row, index) => {
      const name = String(row.destination_location || "").trim();
      return {
        id: index + 1,
        name,
      };
    })
    .filter((item) => item.name);
}
export const RouteDetailsBlock = ({
  routeDetails,
  setRouteDetails,
  locations,
  onOpenViaRoutes,
  onRefreshRouteDistance,
  onDeleteDay,
  onDeleteRouteDay,
  addDay,
  validationErrors,
  departureLocation,
  hideIntercityKm = false,
}: RouteDetailsBlockProps) => {
  const sanitizeOptions = (options: AutoSuggestOption[]): AutoSuggestOption[] => {
    const seen = new Set<string>();
    return options
      .map((opt) => ({
        value: String(opt.value || "").trim(),
        label: String(opt.label || opt.value || "").trim(),
      }))
      .filter((opt) => {
        if (!opt.value) return false;
        if (seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      });
  };

  // Global fallback options (like PHP selectize list)
  const globalLocationOptions: AutoSuggestOption[] = sanitizeOptions(
    locations.map((loc) => ({
      value: loc.name,
      label: loc.name,
    }))
  );

  // Find the departure location object from locations array
  const departureLocationObj = departureLocation
    ? locations.find((loc) => loc.name === departureLocation)
    : null;

  // Row-specific NEXT DESTINATION options (per source)
  const [destinationOptionsMap, setDestinationOptionsMap] = useState<
    Record<number, AutoSuggestOption[]>
  >({});
  const [loadedSources, setLoadedSources] = useState<Record<number, string>>(
    {}
  );

  // After adding a day: focus previous last day's "Next Destination"
  const [focusNextIdx, setFocusNextIdx] = useState<number | null>(null);

  // Refs for Next Destination Select trigger buttons
  const nextDestinationRefs = useRef<Array<{ focus: () => void } | null>>([]);
  const addDayButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (focusNextIdx === null) return;

    const t = window.setTimeout(() => {
      nextDestinationRefs.current[focusNextIdx]?.focus();
      setFocusNextIdx(null);
    }, 0);

    return () => window.clearTimeout(t);
  }, [focusNextIdx]);

    // For each row that has a source, load destination list if we haven't yet
  useEffect(() => {
    routeDetails.forEach((row, idx) => {
      if (!row.source) return;

      const requestKey = [
        row.source,
        row.day,
        routeDetails.length,
        departureLocation || "",
      ].join("|");

      const alreadyLoadedForThisSource =
        loadedSources[idx] && loadedSources[idx] === requestKey;
      if (alreadyLoadedForThisSource) return;

      (async () => {
        try {
         const data = await locationsApi.list({
  itineraryMode: true,
  type: "destination",
  source: row.source,
  dayNo: row.day,
  totalNoOfDays: routeDetails.length,
  departureLocation,
});

const destLocations = data.rows
  .map((item, index) => ({
    id: index + 1,
    name: String(item.destination_location || "").trim(),
  }))
  .filter((item) => item.name);

          const opts: AutoSuggestOption[] = destLocations.map((loc) => ({
            value: loc.name,
            label: loc.name,
          }));

          setDestinationOptionsMap((prev) => ({
            ...prev,
            [idx]: opts,
          }));

          setLoadedSources((prev) => ({
            ...prev,
            [idx]: requestKey,
          }));
        } catch (err) {
          console.error(
            "Failed to load destination locations for",
            row.source,
            err
          );
        }
      })();
    });
  }, [routeDetails, loadedSources, departureLocation]);

  useEffect(() => {
  if (routeDetails.length <= 1 || !departureLocationObj) return;

  const lastIdx = routeDetails.length - 1;
  const lastRow = routeDetails[lastIdx];

  if (!lastRow) return;
  if (lastRow.next === departureLocationObj.name) return;

  const updatedRow: RouteDetailRow = {
    ...lastRow,
    next: departureLocationObj.name,
  };

  setRouteDetails((prev) =>
    prev.map((r, i) =>
      i === lastIdx ? updatedRow : r
    )
  );

  void onRefreshRouteDistance?.(updatedRow);
}, [routeDetails.length, departureLocationObj?.name]);

  useEffect(() => {
    const hasInvalidDirectVisit = routeDetails.some((row) => {
      const hasViaRoutes = (row.via_routes?.length ?? 0) > 0 || Boolean(row.via?.trim());
      return hasViaRoutes && row.directVisit === "Yes";
    });

    if (!hasInvalidDirectVisit) return;

    setRouteDetails((prev) =>
      prev.map((row) => {
        const hasViaRoutes = (row.via_routes?.length ?? 0) > 0 || Boolean(row.via?.trim());
        return hasViaRoutes ? { ...row, directVisit: "No" } : row;
      })
    );
  }, [routeDetails, setRouteDetails]);

  const parseDDMMYYYY = (value: string): Date | null => {
    if (!value) return null;
    const [d, m, y] = value.split("/").map(Number);
    if (!d || !m || !y) return null;
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const addOneDay = (value: string): string => {
    const dt = parseDDMMYYYY(value);
    if (!dt) return "";
    dt.setDate(dt.getDate() + 1);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

 const moveFocusToNextDestination = (currentRowIdx: number) => {
  const nextRowIdx = currentRowIdx + 1;

  if (nextRowIdx < routeDetails.length) {
    setTimeout(() => {
      const nextRef = nextDestinationRefs.current[nextRowIdx];

      nextRef?.focus();

      const element = document.getElementById(`next-destination-${nextRowIdx}`);
      element?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  } else {
    setTimeout(() => {
      addDayButtonRef.current?.focus();

      addDayButtonRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }
};

  const handleAddDay = () => {
    if (addDay) {
      addDay();
      // Scroll to new row after a tick
      setTimeout(() => {
        addDayButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    // PHP-like behaviour:
    // 1) New day date = last date + 1
    // 2) Move final destination (last.next) down to NEW day "next"
    // 3) Copy last.source into NEW day "source"
    // 4) Clear last.next and focus it (user will pick new destination for last day)
    setRouteDetails((prev) => {
      if (!prev.length) {
       return [
  {
    id: 1,
    day: 1,
    date: "",
    source: "",
    next: "",
    via: "",
    via_routes: [],
    no_of_km: 0,
    directVisit: "No",
  },
];
      }

      const lastIdx = prev.length - 1;
      const last = prev[lastIdx];

      const movedFinalDestination = last.next; // goes to new day next
      const copiedSource = last.source; // goes to new day source

      const updated = [...prev];

      // Clear last day destination (so user selects new Day-Last "Next Destination")
      updated[lastIdx] = {
        ...last,
        next: "",
      };

      // Add new day row
  updated.push({
  id: (last.id ?? last.day) + 1,
  day: last.day + 1,
  date: addOneDay(last.date),
  source: copiedSource,
  next: movedFinalDestination,
  via: "",
  via_routes: [],
  no_of_km: 0,
  directVisit: "No",
});

      return updated;
    });

    // Focus previous last row's "Next Destination" (e.g., Day 8 destination)
    setFocusNextIdx(Math.max(0, routeDetails.length - 1));

    // Scroll to the cleared row so user sees what to fill
    setTimeout(() => {
      const prevLastIdx = Math.max(0, routeDetails.length - 1);
      document.getElementById(`next-destination-${prevLastIdx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };


  const handleDeleteDay = () => {
  try {
    if (onDeleteDay) {
      onDeleteDay();
      return;
    }
  } catch (err) {
    console.error("Delete day callback failed. Falling back to local delete.", err);
  }

  // Fallback: delete last day locally for contexts that don't wire onDeleteDay.
  setRouteDetails((prev) => {
    if (prev.length <= 1) return prev;

    return prev.slice(0, -1).map((row, index) => ({
      ...row,
      id: index + 1,
      day: index + 1,
    }));
  });

  setDestinationOptionsMap((prev) => {
    const next: Record<number, AutoSuggestOption[]> = {};
    Object.entries(prev).forEach(([key, value]) => {
      const idx = Number(key);
      if (!Number.isNaN(idx) && idx < Math.max(0, routeDetails.length - 1)) {
        next[idx] = value;
      }
    });
    return next;
  });

  setLoadedSources((prev) => {
    const next: Record<number, string> = {};
    Object.entries(prev).forEach(([key, value]) => {
      const idx = Number(key);
      if (!Number.isNaN(idx) && idx < Math.max(0, routeDetails.length - 1)) {
        next[idx] = value;
      }
    });
    return next;
  });
};

const handleDeleteRouteDay = (deleteIdx: number) => {
  const totalDays = routeDetails.length;
  const isFirstTwoDays = deleteIdx === 0 || deleteIdx === 1;
  const isLastDay = deleteIdx === totalDays - 1;

  if (totalDays <= 3 || isFirstTwoDays || isLastDay) {
    return;
  }

  setDestinationOptionsMap((prev) => {
    const next: Record<number, AutoSuggestOption[]> = {};

    Object.entries(prev).forEach(([key, value]) => {
      const oldIdx = Number(key);

      if (Number.isNaN(oldIdx)) return;
      if (oldIdx === deleteIdx) return;

      const newIdx = oldIdx > deleteIdx ? oldIdx - 1 : oldIdx;
      next[newIdx] = value;
    });

    return next;
  });

  setLoadedSources((prev) => {
    const next: Record<number, string> = {};

    Object.entries(prev).forEach(([key, value]) => {
      const oldIdx = Number(key);

      if (Number.isNaN(oldIdx)) return;
      if (oldIdx === deleteIdx) return;

      const newIdx = oldIdx > deleteIdx ? oldIdx - 1 : oldIdx;
      next[newIdx] = value;
    });

    return next;
  });

  if (onDeleteRouteDay) {
    onDeleteRouteDay(deleteIdx);
    return;
  }

  // Fallback only: used when parent does not provide date/calendar sync.
  setRouteDetails((prev) =>
    prev
      .filter((_, index) => index !== deleteIdx)
      .map((row, index) => ({
        ...row,
        id: index + 1,
        day: index + 1,
      }))
  );
};
  const firstRouteSourceError = validationErrors?.firstRouteSource;
  const firstRouteNextError = validationErrors?.firstRouteNext;

  return (
    <Card className="border border-[#efdef8] rounded-lg bg-white shadow-none overflow-visible">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-[#4a4260]">
          Route Details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-visible pb-4">
  <div className="w-full overflow-x-auto overflow-y-visible">
<table className="w-[960px] caption-bottom text-sm overflow-visible table-fixed">
  <colgroup>
    <col className="w-[70px]" />
    <col className="w-[140px]" />
    <col className="w-[210px]" />
    <col className="w-[285px]" />
    <col className="w-[95px]" />
    {!hideIntercityKm && <col className="w-[90px]" />}
    <col className="w-[105px]" />
    <col className="w-[35px]" />
  </colgroup>

  <TableHeader>
    <TableRow className="bg-[#faf1ff]">
      <TableHead className="px-2 text-xs text-[#4a4260]">
        Day
      </TableHead>

      <TableHead className="px-2 text-xs text-[#4a4260]">
        Travel Date
      </TableHead>

      <TableHead className="px-2 text-xs text-[#4a4260]">
        From
      </TableHead>

      <TableHead className="px-2 text-xs text-[#4a4260]">
        To
      </TableHead>

      <TableHead
        className="px-2 text-xs text-[#4a4260] text-center leading-tight"
        title="Enroute Visits are sightseeing or stopovers during travel."
      >
        Enroute Visits <span className="cursor-help">ⓘ</span>
      </TableHead>

      {!hideIntercityKm && (
        <TableHead className="px-2 text-xs text-[#4a4260] text-center">
          Intercity KM
        </TableHead>
      )}

      <TableHead
        className="px-2 text-xs text-[#4a4260] text-center leading-tight"
title="Explore Destination means local sightseeing after arriving at the destination."
      >
        Explore Destination <span className="cursor-help">ⓘ</span>
      </TableHead>

      <TableHead className="px-1 text-xs text-[#4a4260] text-center">
        {" "}
      </TableHead>
    </TableRow>
  </TableHeader>

          <TableBody>
            {routeDetails.map((row, idx) => {
             const isFirstRow = idx === 0;
const isSecondRow = idx === 1;
const isLastRow = idx === routeDetails.length - 1;
const shouldLockAsDepartureRow = routeDetails.length > 1 && isLastRow;
const hasViaRoutes = (row.via_routes?.length ?? 0) > 0 || Boolean(row.via?.trim());

const canDeleteThisRouteDay =
  routeDetails.length > 3 && !isFirstRow && !isSecondRow && !isLastRow;

              // For last row, if departure location exists, lock to it
              let rowSpecificOptions: AutoSuggestOption[];
              let isLastRowLocked = false;
              let nextDestinationValue = row.next;

            if (shouldLockAsDepartureRow && departureLocationObj) {
  // Lock only the actual last day when total days > 1
  rowSpecificOptions = [
    {
      value: departureLocationObj.name,
      label: departureLocationObj.name,
    },
  ];
  isLastRowLocked = true;
  nextDestinationValue = departureLocationObj.name;
} else {
                // Normal row: use provided options or global fallback
                rowSpecificOptions =
                  destinationOptionsMap[idx] &&
                  destinationOptionsMap[idx]!.length > 0
                    ? destinationOptionsMap[idx]!
                    : globalLocationOptions;
              }

              const safeOptions = sanitizeOptions(rowSpecificOptions);
              const safeNextDestinationValue = safeOptions.some(
                (opt) => opt.value === nextDestinationValue
              )
                ? nextDestinationValue
                : undefined;

              return (
  <TableRow
    key={idx}
    className="overflow-visible"
    style={{ position: "relative", zIndex: routeDetails.length - idx }}
  >
  <TableCell className="px-2">{`DAY ${row.day}`}</TableCell>

  <TableCell className="px-2">
    <Input
      tabIndex={-1}
      readOnly
      placeholder="DD/MM/YYYY"
      value={row.date}
      className="h-8 rounded-md border-[#e5d7f6] bg-[#f9f4ff] cursor-not-allowed text-xs"
    />
  </TableCell>

  <TableCell
  data-field={isFirstRow ? "firstRouteSource" : undefined}
  className={`px-2 ${isFirstRow && firstRouteSourceError ? "align-top" : ""}`}
>
    <div
      className={
        isFirstRow && firstRouteSourceError
          ? "border border-red-500 rounded-md p-1"
          : ""
      }
    >
      <Input
        tabIndex={-1}
        readOnly
        placeholder="Source Location"
        value={row.source}
        className="h-8 rounded-md border-[#e5d7f6] bg-[#f9f4ff] cursor-not-allowed"
      />
    </div>
    {isFirstRow && firstRouteSourceError && (
      <p className="mt-1 text-xs text-red-500">
        {firstRouteSourceError}
      </p>
    )}
  </TableCell>

  <TableCell
  data-field={isFirstRow ? "firstRouteNext" : undefined}
  className={`px-2 relative overflow-visible ${
    isFirstRow && firstRouteNextError ? "align-top" : ""
  }`}
>
    <div
      id={`next-destination-${idx}`}
      className={
        isFirstRow && firstRouteNextError
          ? "border border-red-500 rounded-md p-1"
          : ""
      }
    >
<div
  ref={(el) => {
    nextDestinationRefs.current[idx] = el
      ? {
          focus: () => {
            const control = el.querySelector(
              "button, input"
            ) as HTMLElement | null;

            control?.focus();
            control?.click();
          },
        }
      : null;
  }}
className={`w-full max-w-[260px] ${
  isLastRowLocked ? "pointer-events-none opacity-60" : ""
}`}
>
  <AutoSuggestSelect
    mode="single"
    value={safeNextDestinationValue || ""}
    onChange={async (val) => {
      if (isLastRowLocked) return;

      const chosen = String(val || "");

      const updatedRow: RouteDetailRow = {
        ...row,
        next: chosen,
        via: "",
        via_routes: [],
        no_of_km: 0,
      };

      setRouteDetails((prev) => {
        const updated = [...prev];
        updated[idx] = updatedRow;

        if (idx + 1 < updated.length) {
          updated[idx + 1] = {
            ...updated[idx + 1],
            source: chosen,
          };
        }

        return updated;
      });

      if (onRefreshRouteDistance) {
        const km = await onRefreshRouteDistance(updatedRow);

        setRouteDetails((prev) => {
          const updated = [...prev];

          if (
            updated[idx].source === updatedRow.source &&
            updated[idx].next === updatedRow.next
          ) {
            updated[idx] = {
              ...updated[idx],
              no_of_km: km ?? 0,
            };
          }

          return updated;
        });
      }

      moveFocusToNextDestination(idx);
    }}
    options={safeOptions}
    placeholder={
      safeOptions.length === 0
        ? row.source
          ? "Loading destinations…"
          : "Select a source first"
        : "Next Destination"
    }
    disabled={isLastRowLocked}
  />
</div>
    </div>
    {isFirstRow && firstRouteNextError && (
      <p className="mt-1 text-xs text-red-500">
        {firstRouteNextError}
      </p>
    )}
  </TableCell>

  <TableCell className="pl-0 pr-2 text-left">
  <button
  type="button"
  onClick={() => onOpenViaRoutes?.(row)}
  className="btn btn-outline-primary btn-sm"
  title="Enroute Visits are sightseeing or stopovers during travel."
>
  <i className="ti ti-route ti-tada-hover"></i>
</button>
</TableCell>

{!hideIntercityKm && (
  <TableCell className="px-2 text-center">
  <Input
    tabIndex={-1}
    readOnly
    placeholder="KM"
    value={row.no_of_km ?? 0}
    className="h-8 w-[85px] mx-auto rounded-md border-[#e5d7f6] bg-[#f9f4ff] cursor-not-allowed text-xs text-center"
  />
</TableCell>
)}

<TableCell className="px-1 text-center">
  <span
  className={hasViaRoutes ? "inline-block cursor-not-allowed" : "inline-block"}
  title={hasViaRoutes ? "Explore Destination is unavailable when Enroute Visits are selected" : undefined}
>
    <button
      type="button"
      aria-pressed={row.directVisit === "Yes"}
      aria-disabled={hasViaRoutes}
      disabled={hasViaRoutes}
      className={`hotel-toggle ${row.directVisit === "Yes" ? "active" : ""} ${hasViaRoutes ? "pointer-events-none opacity-50" : ""}`}
      title={!hasViaRoutes ? "Explore Destination: Include local sightseeing and attractions after arriving at this destination." : undefined}
      onClick={() => {
        if (hasViaRoutes) return;
        setRouteDetails((prev) =>
          prev.map((r, i) =>
            i === idx
              ? {
                  ...r,
                  directVisit: r.directVisit === "Yes" ? "No" : "Yes",
                }
              : r
          )
        );
      }}
    >
      <span className="hotel-toggle-knob"></span>
    </button>
  </span>
</TableCell>

<TableCell className="pl-1 pr-0 text-center">
  {canDeleteThisRouteDay && (
    <button
      type="button"
      onClick={() => handleDeleteRouteDay(idx)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xl font-semibold leading-none text-red-500 hover:bg-red-50 hover:text-red-700"
      title={`Delete Day ${row.day}`}
      aria-label={`Delete Day ${row.day}`}
    >
      ×
    </button>
  )}
</TableCell>
</TableRow>
              );
            })}
          </TableBody>
        </table>
        </div>

        <Button
          ref={addDayButtonRef}
          type="button"
          onClick={handleAddDay}
          className="mt-4 bg-[#f054b5] hover:bg-[#e249a9]"
        >
          + Add Day
        </Button>

      </CardContent>
    </Card>
  );
};
