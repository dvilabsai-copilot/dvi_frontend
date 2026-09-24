import { ItineraryService } from "@/services/itinerary";

import type {
  ItineraryDetailsResponse,
} from "../itinerary-details.types";

export type PreviousLegClipboardItem = {
  planId: number;
  actualQuoteId: string;
  details: ItineraryDetailsResponse;
};

/**
 * Loads every previous Continue Planning leg.
 *
 * API walking order:
 * immediate previous -> older -> oldest
 *
 * Return order:
 * oldest -> newer -> immediate previous
 *
 * This allows clipboard output to become:
 * oldest previous leg -> ... -> immediate previous leg -> current leg
 */
export const loadPreviousLegClipboardItems = async (
  itinerary: ItineraryDetailsResponse | null,
): Promise<PreviousLegClipboardItem[]> => {
  if (!itinerary) {
    return [];
  }

  const loaded: PreviousLegClipboardItem[] = [];

  const visitedPlanIds = new Set<number>();

  let currentPlanId = Number(
    itinerary.continuedFromPlanId || 0,
  );

  while (
    currentPlanId > 0 &&
    !visitedPlanIds.has(currentPlanId)
  ) {
    visitedPlanIds.add(currentPlanId);

    const source = await ItineraryService.getOne(
      currentPlanId,
    ) as {
      plan?: Record<string, unknown>;
    };

    const plan = source?.plan;

    if (!plan) {
      break;
    }

    const actualQuoteId = String(
      plan["itinerary_quote_ID"] ||
        plan["itinerary_quote_id"] ||
        plan["quoteId"] ||
        plan["quote_id"] ||
        "",
    ).trim();

    if (!actualQuoteId) {
      break;
    }

    const details =
      await ItineraryService.getDetails(
        actualQuoteId,
      ) as ItineraryDetailsResponse;

    loaded.push({
      planId: currentPlanId,
      actualQuoteId,
      details,
    });

    currentPlanId = Number(
      plan["continued_from_plan_ID"] ||
        plan["continuedFromPlanId"] ||
        0,
    );
  }

  return loaded.reverse();
};