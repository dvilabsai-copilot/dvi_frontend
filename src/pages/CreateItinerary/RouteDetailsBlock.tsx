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
  <Card className="rounded-2xl border border-[#eee6fb] bg-white shadow-none">
    <CardContent className="px-5 py-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#231942]">
            Routes (Travel Path)
          </h2>
          <p className="text-xs font-medium text-[#7b728d]">
            Add the places you want to visit in the order of your travel
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAddDay}
          className="h-9 rounded-lg border-[#7c3aed] px-4 text-sm font-semibold text-[#5b21b6]"
        >
          + Add Destination
        </Button>
      </div>

    <div className="w-full max-w-full overflow-x-auto overflow-y-hidden pb-4">
  <div
    className="flex items-center"
    style={{ width: `${Math.max(routeDetails.length * 170, 760)}px` }}
  >
        {routeDetails.map((route, index) => {
          const isLast = index === routeDetails.length - 1;

          return (
            <div key={route.id} className="flex shrink-0 items-center">
              <div className="flex w-[140px] shrink-0 flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${
                    isLast
                      ? "border-red-300 bg-white text-red-500"
                      : "border-[#d8ccff] bg-white text-[#231942]"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="mt-2 text-center">
                  <div className="text-sm font-semibold text-[#231942]">
                    {route.source || route.next || "Location"}
                  </div>
                  <div className="text-xs text-[#7b728d]">
                    {index === 0
                      ? "Start Point"
                      : isLast
                      ? "End Point"
                      : route.no_of_km
                      ? `${route.no_of_km} KM`
                      : "Destination"}
                  </div>
                </div>
              </div>

              {!isLast && (
               <div className="mx-2 w-[26px] shrink-0 text-center text-lg font-bold text-[#4f16e8]">
  →
</div>
              )}
            </div>
          );
              })}
  </div>
</div>

   <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
  {routeDetails.map((route, index) => (
    <div key={route.id}>
      <p className="mb-1 text-xs font-semibold text-[#231942]">
        Day {index + 1} Destination
      </p>

      <AutoSuggestSelect
        mode="single"
        value={route.next || ""}
        onChange={(val) => {
          const nextValue = val as string;

          setRouteDetails((prev) =>
            prev.map((item, idx) => {
              if (idx !== index) return item;

              return {
                ...item,
                next: nextValue,
              };
            })
          );
        }}
        options={locations.map((loc) => ({
          value: loc.name,
          label: loc.name,
        }))}
        placeholder="Choose Destination"
      />
    </div>
  ))}
</div>

<div className="mt-3 rounded-lg border border-[#eee6fb] bg-[#fbf8ff] px-4 py-3 text-xs font-medium text-[#6b647a]">
  ⓘ You can add Day 1, Day 2 route manually from the destination fields above. Distances and travel times are approximate.
</div>
    </CardContent>
  </Card>
);
};