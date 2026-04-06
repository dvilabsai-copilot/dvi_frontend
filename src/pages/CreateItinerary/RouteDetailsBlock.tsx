// FILE: src/pages/CreateItinerary/RouteDetailsBlock.tsx

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AutoSuggestSelect,
  AutoSuggestOption,
} from "@/components/AutoSuggestSelect";
import {
  LocationOption,
  fetchLocations,
} from "@/services/itineraryDropdownsMock";

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
  directVisit:  "Yes" | "No";
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
  addDay?: () => void;

  // optional validation from parent
  validationErrors?: ValidationErrors;

  // Departure location to lock last row's Next Destination
  departureLocation?: string;

  // Hide Intercity KM only where needed
  hideIntercityKm?: boolean;
};

export const RouteDetailsBlock = ({
  routeDetails,
  setRouteDetails,
  locations,
  onOpenViaRoutes,
  onRefreshRouteDistance,
  onDeleteDay,
  addDay,
  validationErrors,
  departureLocation,
  hideIntercityKm = false,
}: RouteDetailsBlockProps) => {
  // Global fallback options (like PHP selectize list)
  const globalLocationOptions: AutoSuggestOption[] = locations.map((loc) => ({
    value: loc.name,
    label: loc.name,
  }));

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

  // Refs for Next Destination AutoSuggestSelect components
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
          const destLocations = await fetchLocations("destination", row.source, {
            dayNo: row.day,
            totalNoOfDays: routeDetails.length,
            departureLocation,
          });

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
    directVisit: "Yes",
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
  directVisit: "Yes",
});

      return updated;
    });

    // Focus previous last row's "Next Destination" (e.g., Day 8 destination)
    setFocusNextIdx(Math.max(0, routeDetails.length - 1));
  };

  const firstRouteSourceError = validationErrors?.firstRouteSource;
  const firstRouteNextError = validationErrors?.firstRouteNext;

  return (
    <Card className="border border-[#efdef8] rounded-lg bg-white shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-[#4a4260]">
          Route Details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#faf1ff]">
  <TableHead className="text-xs text-[#4a4260] w-[80px]">DAY</TableHead>
  <TableHead className="text-xs text-[#4a4260] w-[140px]">DATE</TableHead>
  <TableHead className="text-xs text-[#4a4260] w-[200px]">
    SOURCE DESTINATION
  </TableHead>
  <TableHead className="text-xs text-[#4a4260] w-[280px]">
    NEXT DESTINATION
  </TableHead>
  <TableHead className="text-xs text-[#4a4260] w-[100px] text-center">
    VIA ROUTE
  </TableHead>
  {!hideIntercityKm && (
    <TableHead className="text-xs text-[#4a4260] w-[120px] text-center">
      INTERCITY KM
    </TableHead>
  )}
   <TableHead className="text-xs text-[#4a4260] w-[120px] text-center">
    DIRECT DESTINATION VISIT
  </TableHead>
</TableRow>
          </TableHeader>
          <TableBody>
            {routeDetails.map((row, idx) => {
             const isFirstRow = idx === 0;
const isLastRow = idx === routeDetails.length - 1;
const shouldLockAsDepartureRow = routeDetails.length > 1 && isLastRow;

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

              return (
                <TableRow key={idx}>
  <TableCell>{`DAY ${row.day}`}</TableCell>

  <TableCell>
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
    className={isFirstRow && firstRouteSourceError ? "align-top" : ""}
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
    className={isFirstRow && firstRouteNextError ? "align-top" : ""}
  >
    <div
      id={`next-destination-${idx}`}
      className={
        isFirstRow && firstRouteNextError
          ? "border border-red-500 rounded-md p-1"
          : ""
      }
    >
      <AutoSuggestSelect
  ref={(el) => {
    nextDestinationRefs.current[idx] = el;
  }}
  mode="single"
  value={nextDestinationValue}
  scrollToValue={row.source}
  onChange={async (val) => {
    if (isLastRowLocked) return;

    const chosen = (val as string) || "";

    // Build the updated row here
    const updatedRow: RouteDetailRow = {
      ...row,
      next: chosen,
      via: "",
      via_routes: [],
      no_of_km: 0,
    };

    // Optimistically update the UI (without KM)
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

    // Call the backend API and update KM when it returns
    if (onRefreshRouteDistance) {
      const km = await onRefreshRouteDistance(updatedRow);
      setRouteDetails((prev) => {
        const updated = [...prev];
        // Only update if row still matches (user hasn't changed again)
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
  }}
  onSelectionCommit={() => {
    if (isLastRowLocked) return;
    moveFocusToNextDestination(idx);
  }}
  disabled={isLastRowLocked}
  readOnly={isLastRowLocked}
  options={rowSpecificOptions}
  placeholder="Next Destination"
/>
    </div>
    {isFirstRow && firstRouteNextError && (
      <p className="mt-1 text-xs text-red-500">
        {firstRouteNextError}
      </p>
    )}
  </TableCell>

  <TableCell className="text-center">
  <button
    type="button"
    onClick={() => onOpenViaRoutes?.(row)}
    className="btn btn-outline-primary btn-sm"
    title="Via Route"
  >
    <i className="ti ti-route ti-tada-hover"></i>
  </button>
</TableCell>

{!hideIntercityKm && (
  <TableCell className="text-center">
    <Input
      tabIndex={-1}
      readOnly
      placeholder="KM"
      value={row.no_of_km ?? 0}
      className="h-8 rounded-md border-[#e5d7f6] bg-[#f9f4ff] cursor-not-allowed text-xs text-center"
    />
  </TableCell>
)}

<TableCell className="text-center">
  <button
    type="button"
    aria-pressed={row.directVisit === "Yes"}
    className={`hotel-toggle ${row.directVisit === "Yes" ? "active" : ""}`}
    title={row.directVisit === "Yes" ? "Active" : "Inactive"}
   onClick={() =>
  setRouteDetails((prev) =>
    prev.map((r, i) =>
      i === idx
        ? {
            ...r,
            directVisit: r.directVisit === "Yes" ? "No" : "No",
          }
        : r
    )
  )
}
  >
    <span className="hotel-toggle-knob"></span>
  </button>
</TableCell>
</TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Button
          ref={addDayButtonRef}
          onClick={handleAddDay}
          className="mt-4 bg-[#f054b5] hover:bg-[#e249a9]"
        >
          + Add Day
        </Button>

         <Button
    type="button"
    variant="outline"
    onClick={() => onDeleteDay?.()}
    disabled={routeDetails.length === 1}
    className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
  >
    Delete Day
  </Button>
      </CardContent>
    </Card>
  );
};
