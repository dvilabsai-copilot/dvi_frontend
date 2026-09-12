// FILE: src/pages/CreateItinerary/useItineraryRoutes.ts

import { useCallback, useEffect, useState } from "react";
import {
  fetchViaRouteForm,
  SimpleOption,
} from "@/services/itineraryDropdownsMock";
import { api } from "@/lib/api";
import { locationsApi } from "@/services/locations";
import {
  splitViaString,
  toDDMMYYYY,
} from "./itineraryUtils";
import { shouldDisableEarlyMorningViaRoutes } from "./transportEarlyArrival";

export type ViaRouteItem = {
  itinerary_via_location_ID: number;
  itinerary_via_location_name: string;
};

export type RouteRow = {
  id: number;
  itinerary_route_id?: number;
  day: number;
  date: string;
  source: string;
  next: string;
  via: string; // comma separated hotspots for this segment
  via_routes: ViaRouteItem[]; // array of via route objects for backend
  no_of_km?: number | string; // intercity distance between source and next
  directVisit: "Yes" | "No";
};

type ToastFn = (opts: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

type UseItineraryRoutesArgs = {
  tripStartDate: string;
  tripEndDate: string;
  startTime: string;
  arrivalLocation: string;
  departureLocation: string;
  itineraryPlanId: number | null;
  toast: ToastFn;
};

export function useItineraryRoutes({
  tripStartDate,
  tripEndDate,
  startTime,
  arrivalLocation,
  departureLocation,
  itineraryPlanId,
  toast,
}: UseItineraryRoutesArgs) {
  const [routeDetails, setRouteDetails] = useState<RouteRow[]>([
  {
    id: 1,
    itinerary_route_id: undefined,
    day: 1,
    date: "",
    source: "",
    next: "",
    via: "",
    via_routes: [],
    no_of_km: 0,
    directVisit: "No",
  },
]);

  const [viaDialogOpen, setViaDialogOpen] = useState(false);
  const [activeViaRouteRow, setActiveViaRouteRow] = useState<RouteRow | null>(
    null
  );
    const [viaRoutes, setViaRoutes] = useState<SimpleOption[]>([]);
  const [viaRoutesLoading, setViaRoutesLoading] = useState(false);
  const [activeViaRouteIds, setActiveViaRouteIds] = useState<string[]>([]);

  const isViaRouteDisabled = useCallback(
    (row: RouteRow): boolean =>
      shouldDisableEarlyMorningViaRoutes({
        day: row.day,
        startTime,
        source: row.source,
        next: row.next,
      }),
    [startTime]
  );

  const refreshRouteDistance = useCallback(
    async (row: RouteRow): Promise<number | string> => {
      if (!row.source || !row.next) return 0;

      try {
        // With no via routes selected, use the stored direct
        // source -> destination route.
        const response = await locationsApi.list({
          source: row.source,
          destination: row.next,
          page: 1,
          pageSize: 1,
        });

        return response.rows[0]?.distance_km ?? 0;
      } catch (err) {
        console.error("Failed to refresh direct route distance", err);
        return 0;
      }
    },
    []
  );

  useEffect(() => {
    const firstRoute =
      routeDetails.find((row) => Number(row.day) === 1) ??
      routeDetails[0];

    if (!firstRoute || !isViaRouteDisabled(firstRoute)) {
      return;
    }

    // If the Via Route dialog is currently open for Day 1,
    // close it immediately when the route becomes unavailable.
    if (activeViaRouteRow?.id === firstRoute.id) {
      setViaDialogOpen(false);
      setActiveViaRouteRow(null);
      setActiveViaRouteIds([]);
    }

    const hasViaRoutes =
      (firstRoute.via_routes?.length ?? 0) > 0 ||
      Boolean(firstRoute.via?.trim());

    if (!hasViaRoutes) {
      return;
    }

    // Early morning + moving to another destination:
    // remove any previously selected Via Routes.
    const clearedRoute: RouteRow = {
      ...firstRoute,
      via: "",
      via_routes: [],
      no_of_km: 0,
    };

    setRouteDetails((prev) =>
      prev.map((row) =>
        row.id === firstRoute.id ? clearedRoute : row
      )
    );

    // Restore the direct Source -> Destination distance.
    void refreshRouteDistance(clearedRoute).then((km) => {
      setRouteDetails((prev) =>
        prev.map((row) =>
          row.id === clearedRoute.id &&
          row.source === clearedRoute.source &&
          row.next === clearedRoute.next &&
          isViaRouteDisabled(row) &&
          (row.via_routes?.length ?? 0) === 0 &&
          !row.via?.trim()
            ? {
                ...row,
                no_of_km: km ?? 0,
              }
            : row
        )
      );
    });
  }, [
    activeViaRouteRow,
    isViaRouteDisabled,
    refreshRouteDistance,
    routeDetails,
  ]);

// ----------------- auto-generate routes from dates -----------------

useEffect(() => {
  if (!tripStartDate || !tripEndDate) return;

  const parse = (value: string): Date | null => {
    const [d, m, y] = value.split("/").map(Number);

    if (!d || !m || !y) {
      return null;
    }

    return new Date(y, m - 1, d);
  };

  const start = parse(tripStartDate);
  const end = parse(tripEndDate);

  if (!start || !end || end < start) {
    return;
  }

  // Use calendar days instead of elapsed local milliseconds.
  // This avoids DST/timezone related day-count problems.
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endUtc = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  const ONE_DAY = 24 * 60 * 60 * 1000;

  const totalDays =
    Math.floor((endUtc - startUtc) / ONE_DAY) + 1;

  setRouteDetails((prev) => {
    const nextRoutes: RouteRow[] = [];

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i
      );

      const existing = prev[i];

    const previousSource = existing?.source ?? "";
const previousNext = existing?.next ?? "";

// If the itinerary is expanded, the route that used to be the final
// day becomes an intermediate day. Its previous final destination must
// not be silently reused as the new intermediate destination.
//
// Example:
// 1D: Chennai -> Chennai Airport
// becomes 2D:
// Day 1 must NOT remain Chennai -> Chennai Airport automatically.
const becameIntermediateRoute =
  totalDays > prev.length &&
  Boolean(existing) &&
  i === prev.length - 1 &&
  i < totalDays - 1;

const previousGeneratedDestination =
  i > 0
    ? nextRoutes[i - 1]?.next ?? ""
    : "";

const nextSource =
  i === 0 && arrivalLocation
    ? arrivalLocation
    : previousSource.trim()
      ? previousSource
      : previousGeneratedDestination;

const nextDestination =
  i === totalDays - 1 && departureLocation
    ? departureLocation
    : becameIntermediateRoute
      ? ""
      : previousNext;

const routeChanged =
  Boolean(existing) &&
  (
    previousSource !== nextSource ||
    previousNext !== nextDestination
  );

      nextRoutes.push({
        id: existing?.id ?? i + 1,

        // A route ID belongs to the previous source/destination pair.
        // Do not reuse it when the route itself has changed.
        itinerary_route_id: routeChanged
          ? undefined
          : existing?.itinerary_route_id,

        day: i + 1,
        date: toDDMMYYYY(currentDate),

        source: nextSource,
        next: nextDestination,

        // Via-route and distance information also belong to the old
        // source/destination pair. Clear them only for a genuine route change.
        via: routeChanged
          ? ""
          : existing?.via ?? "",

        via_routes: routeChanged
          ? []
          : existing?.via_routes ?? [],

        no_of_km: routeChanged
          ? 0
          : existing?.no_of_km ?? 0,

        directVisit: routeChanged
          ? "No"
          : existing?.directVisit ?? "No",
      });
    }

    return nextRoutes;
  });
}, [
  tripStartDate,
  tripEndDate,
  arrivalLocation,
  departureLocation,
]);

  // ----------------- handlers: Via Route popup -----------------

  const openViaRoutes = async (row: RouteRow) => {
    if (!row.source || !row.next) {
      toast({
        title: "Select locations first",
        description:
          "Please choose both Source Location and Next Visiting Place before adding via routes.",
        variant: "destructive",
      });
      return;
    }

    if (isViaRouteDisabled(row)) {
      toast({
        title: "Enroute Visits unavailable",
        description:
          "Enroute Visits are not available on Day 1 for an early-morning arrival when the guest is travelling to a different destination.",
        variant: "destructive",
      });
      return;
    }

    setActiveViaRouteRow(row);
    setViaDialogOpen(true);

    try {
      setViaRoutesLoading(true);

      const form = await fetchViaRouteForm({
        dayNo: row.day,
        source: row.source,
        next: row.next,
        date: row.date || "",
        itineraryPlanId,
      });

      setViaRoutes(form.options);

      // For EDIT mode: use IDs from backend (form.existingIds)
      // For NEW mode: use IDs from component state (row.via_routes)
      let currentViaIds: string[] = [];
      
      if (itineraryPlanId && form.existingIds && form.existingIds.length > 0) {
        // Editing existing itinerary - use backend data
        currentViaIds = form.existingIds;
      } else if (row.via_routes && row.via_routes.length > 0) {
        // New itinerary - use state data
        currentViaIds = row.via_routes.map(v => String(v.itinerary_via_location_ID));
      }

      setActiveViaRouteIds(currentViaIds);

      // Update via text display if we have labels
      const viaLabels =
        form.existingLabels && form.existingLabels.length
          ? form.existingLabels
          : row.via_routes && row.via_routes.length > 0
          ? row.via_routes.map(v => v.itinerary_via_location_name)
          : splitViaString(row.via);

      if (viaLabels.length) {
        const viaText = viaLabels.join(", ");

        setRouteDetails((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, via: viaText } : r))
        );

        setActiveViaRouteRow((prev) =>
          prev && prev.id === row.id ? { ...prev, via: viaText } : prev
        );
      }
    } catch (err) {
      console.error("Failed to open via routes form", err);
      setViaRoutes([]);
      setActiveViaRouteIds([]);
    } finally {
      setViaRoutesLoading(false);
    }
  };

  const handleViaDialogSubmit = async (selectedOptions: SimpleOption[]) => {
  if (!activeViaRouteRow) {
    setViaDialogOpen(false);
    return;
  }

  const currentActiveRoute =
    routeDetails.find((row) => row.id === activeViaRouteRow.id) ??
    activeViaRouteRow;

  if (isViaRouteDisabled(currentActiveRoute)) {
    setViaDialogOpen(false);
    setActiveViaRouteRow(null);
    setActiveViaRouteIds([]);

    toast({
      title: "Enroute Visits unavailable",
      description:
        "Day 1 Enroute Visits are disabled for an early-morning arrival when the guest is travelling to a different destination.",
      variant: "destructive",
    });

    return;
  }

  try {
    const viaRouteIds = selectedOptions.map((o) => o.id);

    // CASE 1: User removed all via routes → clear VIA and KM only for this row
    if (!viaRouteIds.length) {
  const updatedRow: RouteRow = {
    ...activeViaRouteRow,
    via: "",
    via_routes: [],
    no_of_km: 0,
  };

  setRouteDetails((prev) =>
    prev.map((r) =>
      r.id === activeViaRouteRow.id
        ? updatedRow
        : r
    )
  );

  // Recalculate direct source -> destination distance using the same API
  await refreshRouteDistance(updatedRow);

  setViaDialogOpen(false);
  setActiveViaRouteRow(null);
  setActiveViaRouteIds([]);

  toast({
    description: "Via Route removed for this day.",
  });

  return;
}
    // CASE 2: We have via routes selected → validate and read total KM
    const checkBody = {
      source: activeViaRouteRow.source,
      destination: activeViaRouteRow.next,
      via_routes: viaRouteIds,
    };

    const checkData = await api(
      "/itinerary-via-routes/check-distance-limit",
      {
        method: "POST",
        body: checkBody,
      }
    );

    if (!checkData?.success) {
      const msg =
        checkData?.errors?.result_error || "Distance KM Limit Exceeded !!!";
      toast({
        title: "Via Route Limit",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    // Try to read total KM from API response
    const rawKm =
      checkData?.data?.total_km ??
      checkData?.data?.total_distance_km ??
      checkData?.total_km ??
      checkData?.total_distance_km ??
      checkData?.distance_km;

    const calculatedKm = Number(rawKm);
    const finalKm = Number.isFinite(calculatedKm) ? calculatedKm : 0;

    const viaText = selectedOptions.map((o) => o.label).join(", ");
    const viaRoutesArray = selectedOptions.map((o) => ({
      itinerary_via_location_ID: Number(o.id),
      itinerary_via_location_name: o.label,
    }));

    const updatedActiveRow = {
  ...activeViaRouteRow,
  via: viaText,
  via_routes: viaRoutesArray,
  no_of_km: finalKm,
};

setRouteDetails((prev) =>
  prev.map((r) =>
    r.id === activeViaRouteRow.id
      ? updatedActiveRow
      : r
  )
);

setActiveViaRouteRow(updatedActiveRow);
setViaDialogOpen(false);
setActiveViaRouteRow(null);
setActiveViaRouteIds([]);

toast({
  description: "Via Route Added Successfully",
});
  } catch (err) {
    console.error("Via route submit failed", err);
    toast({
      title: "Via Route Error",
      description: "Something went wrong while saving via route.",
      variant: "destructive",
    });
  }
};

  const handleViaDialogOpenChange = (isOpen: boolean) => {
    setViaDialogOpen(isOpen);
    if (!isOpen) {
      setActiveViaRouteRow(null);
      setActiveViaRouteIds([]);
    }
  };



    return {
    routeDetails,
    setRouteDetails,
    viaDialogOpen,
    viaRoutes,
    viaRoutesLoading,
    activeViaRouteRow,
    activeViaRouteIds,
    openViaRoutes,
    handleViaDialogSubmit,
    handleViaDialogOpenChange,
    refreshRouteDistance,
    isViaRouteDisabled,
  };
}
