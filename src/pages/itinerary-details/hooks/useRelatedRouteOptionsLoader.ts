import { useEffect, type Dispatch, type SetStateAction } from "react";
import { ItineraryService } from "@/services/itinerary";
import type {
  ItineraryDetailsResponse,
  ItineraryPlanRouteOption,
} from "../itinerary-details.types";
import { normalizeRouteOptionList } from "../utils/routeOptions.utils";

const formatRouteOptionDate = (value?: string): string => {
  if (!value) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

type ItineraryWithLegacyPlanId = ItineraryDetailsResponse & {
  itineraryPlanId?: number;
};

type LatestItineraryRowsResponse = {
  data?: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> => (
  value !== null && typeof value === "object" ? value as Record<string, unknown> : {}
);

export function useRelatedRouteOptionsLoader({
  quoteId,
  itinerary,
  setLatestRouteOptions,
}: {
  quoteId?: string;
  itinerary: ItineraryDetailsResponse | null;
  setLatestRouteOptions: Dispatch<SetStateAction<ItineraryPlanRouteOption[]>>;
}): void {
  useEffect(() => {
    if (!quoteId || !itinerary) return;

    const loadRelatedRouteOptions = async () => {
      try {
        const apiRouteOptions = normalizeRouteOptionList([
          ...(Array.isArray(itinerary.routeOptions) ? itinerary.routeOptions : []),
          ...(Array.isArray(itinerary.suggestedRoutes) ? itinerary.suggestedRoutes : []),
          ...(Array.isArray(itinerary.siblingRoutes) ? itinerary.siblingRoutes : []),
        ]);

        if (apiRouteOptions.length > 0) {
          const routeOptionPayload = JSON.stringify(apiRouteOptions);

          apiRouteOptions.forEach((option) => {
            localStorage.setItem(
              `itinerary-route-options:${option.quoteId}`,
              routeOptionPayload,
            );
          });

          setLatestRouteOptions(apiRouteOptions);
          return;
        }

        const storedRouteOptionsRaw = localStorage.getItem(
          `itinerary-route-options:${quoteId}`,
        );

        if (storedRouteOptionsRaw) {
          try {
            const storedRouteOptions = JSON.parse(storedRouteOptionsRaw);
            const parsedOptions = Array.isArray(storedRouteOptions)
              ? normalizeRouteOptionList(storedRouteOptions)
              : [];

            if (parsedOptions.length > 0) {
              setLatestRouteOptions(parsedOptions);
              return;
            }
          } catch (storageError) {
            console.error("Failed to parse saved route options", storageError);
          }
        }

        const itineraryWithLegacyPlanId = itinerary as ItineraryWithLegacyPlanId;
        const currentPlanId = Number(
          itinerary.planId || itineraryWithLegacyPlanId.itineraryPlanId || 0,
        );
        const startDate = itinerary.days?.[0]?.date;
        const endDate = itinerary.days?.[itinerary.days.length - 1]?.date;

        const res = await ItineraryService.getLatest({
          page: 1,
          pageSize: 100,
          startDate: formatRouteOptionDate(startDate),
          endDate: formatRouteOptionDate(endDate),
        }) as LatestItineraryRowsResponse;

        const rows = Array.isArray(res?.data) ? res.data : [];
        const relatedRows = currentPlanId
          ? rows.filter((row) => {
              const rowRecord = asRecord(row);
              const rowPlanId = Number(
                rowRecord.planId ||
                  rowRecord.plan_id ||
                  rowRecord.itineraryPlanId ||
                  rowRecord.itinerary_plan_id ||
                  rowRecord.itinerary_plan_ID ||
                  0,
              );

              return rowPlanId === currentPlanId;
            })
          : rows;

        const fallbackOptions = normalizeRouteOptionList(relatedRows);
        const withCurrentQuote = normalizeRouteOptionList([
          { quoteId: String(quoteId), label: "Route 1" },
          ...fallbackOptions,
        ]);

        setLatestRouteOptions(
          withCurrentQuote.length > 0
            ? withCurrentQuote
            : [{ quoteId: String(quoteId), label: "Route 1" }],
        );
      } catch (error) {
        console.error("Failed to load related route options", error);
        setLatestRouteOptions([
          {
            quoteId: String(quoteId),
            label: "Route 1",
          },
        ]);
      }
    };

    void loadRelatedRouteOptions();
  }, [itinerary, quoteId, setLatestRouteOptions]);
}
