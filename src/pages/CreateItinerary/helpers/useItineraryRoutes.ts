// FILE: src/pages/CreateItinerary/useItineraryRoutes.ts

import { useEffect, useState } from "react";
import {
  fetchViaRouteForm,
  SimpleOption,
} from "@/services/itineraryDropdownsMock";
import { api } from "@/lib/api";
import {
  splitViaString,
  toDDMMYYYY,
} from "./itineraryUtils";

export type ViaRouteItem = {
  itinerary_via_location_ID: number;
  itinerary_via_location_name: string;
};

export type RouteRow = {
  id: number;
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
  arrivalLocation: string;
  departureLocation: string;
  itineraryPlanId: number | null;
  toast: ToastFn;
};

export function useItineraryRoutes({
  tripStartDate,
  tripEndDate,
  arrivalLocation,
  departureLocation,
  itineraryPlanId,
  toast,
}: UseItineraryRoutesArgs) {
  const [routeDetails, setRouteDetails] = useState<RouteRow[]>([
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
]);

  const [viaDialogOpen, setViaDialogOpen] = useState(false);
  const [activeViaRouteRow, setActiveViaRouteRow] = useState<RouteRow | null>(
    null
  );
  const [viaRoutes, setViaRoutes] = useState<SimpleOption[]>([]);
  const [viaRoutesLoading, setViaRoutesLoading] = useState(false);
  const [activeViaRouteIds, setActiveViaRouteIds] = useState<string[]>([]);

  // ----------------- auto-generate routes from dates -----------------

  useEffect(() => {
    if (!tripStartDate || !tripEndDate) return;

    const parse = (value: string): Date | null => {
      const [d, m, y] = value.split("/").map(Number);
      if (!d || !m || !y) return null;
      return new Date(y, m - 1, d);
    };

    const start = parse(tripStartDate);
    const end = parse(tripEndDate);

    if (!start || !end || end < start) return;

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const totalDays =
      Math.floor((end.getTime() - start.getTime()) / ONE_DAY) + 1;

    setRouteDetails((prev) => {
      const nextRoutes: RouteRow[] = [];

      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(start.getTime() + i * ONE_DAY);
        const existing = prev[i];

      nextRoutes.push({
  id: existing?.id ?? i + 1,
  day: i + 1,
  date: toDDMMYYYY(currentDate),
  source: existing?.source ?? "",
  via_routes: existing?.via_routes ?? [],
  next: existing?.next ?? "",
  via: existing?.via ?? "",
  no_of_km: existing?.no_of_km ?? 0,
  directVisit: existing?.directVisit ?? "Yes",
});
      }

      // Prefill DAY 1 source from Arrival
      if (arrivalLocation && nextRoutes.length) {
        nextRoutes[0] = {
          ...nextRoutes[0],
          source: arrivalLocation,
        };
      }

      // Prefill LAST DAY next destination from Departure
      if (departureLocation && nextRoutes.length) {
        const lastIndex = nextRoutes.length - 1;
        nextRoutes[lastIndex] = {
          ...nextRoutes[lastIndex],
          next: departureLocation,
        };
      }

      return nextRoutes;
    });
  }, [tripStartDate, tripEndDate, arrivalLocation, departureLocation]);

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

    try {
      const viaRouteIds = selectedOptions.map((o) => o.id);

      // CASE 1: User removed all via routes → just clear them in state
      if (!viaRouteIds.length) {
        // Local UI: clear VIA column and via_routes array
        setRouteDetails((prev) =>
          prev.map((r) =>
            r.id === activeViaRouteRow.id ? { ...r, via: "", via_routes: [] } : r
          )
        );

        setViaDialogOpen(false);
        setActiveViaRouteRow(null);
        setActiveViaRouteIds([]);

        toast({
          description: "Via Route removed for this day.",
        });

        return;
      }

      // CASE 2: We have via routes selected → check distance limit then store in state
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

      // Local UI update – VIA column and via_routes array
      const viaText = selectedOptions.map((o) => o.label).join(", ");
      const viaRoutesArray = selectedOptions.map((o) => ({
        itinerary_via_location_ID: Number(o.id),
        itinerary_via_location_name: o.label,
      }));

      setRouteDetails((prev) =>
        prev.map((r) =>
          r.id === activeViaRouteRow.id
            ? { ...r, via: viaText, via_routes: viaRoutesArray }
            : r
        )
      );

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
  };
}
