/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { ItineraryService } from "@/services/itinerary";
import type {
  ItineraryDetailsResponse,
  ItineraryDay,
} from "../itinerary-details.types";

export type PreviousLegItem = {
  plan: any;
  details: ItineraryDetailsResponse;
  actualQuoteId: string;
};

type PreviousLegHistoryProps = {
  startPlanId: number;
  rootQuoteId: string;
  selectedLegIndex: number;
  onLegCountChange: (count: number) => void;
  onPreviousLegsChange?: (legs: PreviousLegItem[]) => void;
  showDetails: boolean;
};

const formatPreviousDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getFoodPreference = (
  details: ItineraryDetailsResponse,
) =>
  details.guest_food_preference_name ||
  details.guestFoodPreferenceName ||
  details.guest_food_preference ||
  details.guestFoodPreference ||
  details.food_type_name ||
  details.foodTypeName ||
  "";

const renderPreviousDay = (
  day: ItineraryDay,
  details: ItineraryDetailsResponse,
  foodPreference: string,
) => {
  return (
    <div
      key={
        day.id ||
        `${details.planId}-${day.dayNumber}-${day.date}`
      }
      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {/* DAY HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="font-bold text-slate-800">
            DAY {day.dayNumber}

            <span className="ml-2 font-normal text-slate-500">
              — {formatPreviousDate(day.date)}
            </span>
          </div>

          <div className="font-medium text-slate-700">
            {day.departure || "-"}

            <span className="mx-2 text-slate-400">
              →
            </span>

            {day.arrival || "-"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
            {day.startTime || "-"}

            <span className="mx-1">
              →
            </span>

            {day.endTime || "-"}
          </div>

          {day.distance && (
            <span className="rounded-full bg-[#b82580] px-3 py-1 text-[11px] font-bold text-white">
              {day.distance}
            </span>
          )}
        </div>
      </div>

      {/* FOOD */}
      {foodPreference && (
        <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-600">
          Food Preference:{" "}
          <strong className="text-slate-800">
            {foodPreference}
          </strong>
        </div>
      )}

      {/* TIMELINE */}
      <div className="space-y-3 p-4 text-xs">
        {(Array.isArray(day.segments)
          ? day.segments
          : []
        ).map((segment: any, index: number) => {
          const segmentKey =
            `${details.planId}-${day.dayNumber}-${segment.type}-${index}`;

          // START
          if (segment.type === "start") {
            return (
              <div
                key={segmentKey}
                className="flex flex-wrap items-center gap-3 pl-1 text-slate-600"
              >
                <span>🚗</span>

                <span className="font-semibold text-slate-800">
                  {segment.title ||
                    "Start your Journey"}
                </span>

                {segment.timeRange && (
                  <span className="text-slate-400">
                    ({segment.timeRange})
                  </span>
                )}
              </div>
            );
          }

          // TRAVEL
          if (segment.type === "travel") {
            return (
              <div
                key={segmentKey}
                className="flex flex-col justify-between gap-2 rounded-lg border border-sky-100 bg-sky-50/70 p-3 text-[11px] text-slate-600 md:flex-row md:items-center"
              >
                <div>
                  🚙 Travelling from{" "}
                  <strong className="text-slate-700">
                    {segment.from}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-slate-700">
                    {segment.to}
                  </strong>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-slate-500">
                  {segment.timeRange && (
                    <span>
                      ◷ {segment.timeRange}
                    </span>
                  )}

                  {segment.distance && (
                    <span>
                      ⌁ {segment.distance}
                    </span>
                  )}

                  {segment.duration && (
                    <span>
                      ⌛ {segment.duration}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // ATTRACTION / SIGHTSEEING
          if (segment.type === "attraction") {
            return (
              <div
                key={segmentKey}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-800">
                    {segment.name}
                  </div>

                  {segment.description && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {segment.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    {segment.visitTime && (
                      <span className="font-semibold text-[#b82580]">
                        ◷ {segment.visitTime}
                      </span>
                    )}

                    {segment.duration && (
                      <span>
                        ◉ {segment.duration}
                      </span>
                    )}

                    {segment.timings && (
                      <span>
                        {segment.timings}
                      </span>
                    )}
                  </div>
                </div>

                {segment.image && (
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img
                      src={segment.image}
                      alt={
                        segment.name ||
                        "Previous itinerary"
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            );
          }

          // BREAK / WAITING
          if (segment.type === "break") {
            return (
              <div
                key={segmentKey}
                className="rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-[11px] text-slate-600"
              >
                <strong className="text-slate-700">
                  {segment.location}
                </strong>

                {segment.timeRange && (
                  <span className="ml-2">
                    {segment.timeRange}
                  </span>
                )}

                {segment.duration && (
                  <span className="ml-2">
                    {segment.duration}
                  </span>
                )}
              </div>
            );
          }

          // HOTEL CHECK-IN
          if (segment.type === "checkin") {
            return (
              <div
                key={segmentKey}
                className="rounded-xl border border-sky-200 bg-sky-50 p-4"
              >
                <div className="font-semibold text-slate-800">
                  Check-in to{" "}
                  {segment.hotelName}
                </div>

                {segment.hotelAddress && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    {segment.hotelAddress}
                  </div>
                )}

                {segment.time && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    ◷ {segment.time}
                  </div>
                )}
              </div>
            );
          }

          // RETURN
          if (segment.type === "return") {
            return (
              <div
                key={segmentKey}
                className="flex flex-wrap items-center gap-2 pl-1 text-slate-600"
              >
                <span>🚗</span>

                <span className="font-semibold text-slate-800">
                  Return to Origin and Relax
                </span>

                {segment.time && (
                  <span className="text-slate-400">
                    {segment.time}
                  </span>
                )}

                {segment.note && (
                  <span className="text-slate-400">
                    {segment.note}
                  </span>
                )}
              </div>
            );
          }

          // HOTSPOT / ANCHOR INFORMATION
          if (segment.type === "hotspot") {
            return segment.text ? (
              <div
                key={segmentKey}
                className="rounded-lg border border-fuchsia-100 bg-fuchsia-50/40 px-3 py-2 text-[11px] text-slate-600"
              >
                {segment.text}
              </div>
            ) : null;
          }

          return null;
        })}
      </div>
    </div>
  );
};

export const PreviousLegHistory = ({
  startPlanId,
  rootQuoteId,
  selectedLegIndex,
  onLegCountChange,
  onPreviousLegsChange,
  showDetails,
}: PreviousLegHistoryProps) => {

  const [previousLegs, setPreviousLegs] =
    useState<PreviousLegItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
   if (!startPlanId) {
  setPreviousLegs([]);
  onLegCountChange(0);
  onPreviousLegsChange?.([]);
  return;
}

    let cancelled = false;

    const loadPreviousLegs = async () => {
      setLoading(true);
      setError(null);

      try {
        const loaded: PreviousLegItem[] = [];
        const visitedPlanIds = new Set<number>();

        let currentPlanId =
          Number(startPlanId);

        while (
          currentPlanId > 0 &&
          !visitedPlanIds.has(currentPlanId)
        ) {
          visitedPlanIds.add(currentPlanId);

          // Get the complete source plan.
          const source: any =
            await ItineraryService.getOne(
              currentPlanId,
            );

          const plan = source?.plan;

          if (!plan) {
            break;
          }

          // IMPORTANT:
          // API calls use the REAL quote ID,
          // not the root/display quote ID.
          const actualQuoteId = String(
            plan.itinerary_quote_ID ||
              plan.itinerary_quote_id ||
              plan.quoteId ||
              plan.quote_id ||
              "",
          ).trim();

          if (!actualQuoteId) {
            break;
          }

          const details =
            await ItineraryService.getDetails(
              actualQuoteId,
            );

          loaded.push({
            plan,
            details,
            actualQuoteId,
          });

          // Walk backwards through unlimited
          // Continue Planning legs.
          currentPlanId = Number(
            plan.continued_from_plan_ID ||
              plan.continuedFromPlanId ||
              0,
          );
        }
if (!cancelled) {
  setPreviousLegs(loaded);
  onLegCountChange(loaded.length);
  onPreviousLegsChange?.(loaded);
}
      } catch (loadError) {
        console.error(
          "Failed to load previous itinerary history",
          loadError,
        );

        if (!cancelled) {
          setPreviousLegs([]);
          setError(
            "Unable to load previous itinerary details.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPreviousLegs();

    return () => {
      cancelled = true;
    };
  }, [startPlanId]);

  if (!showDetails) {
  return null;
}

  if (loading) {
    return (
      <div className="mx-6 my-4 rounded-xl border border-[#f1e1ed] bg-white p-6 text-center text-sm text-slate-500">
        Loading previous itinerary details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-6 my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!previousLegs.length) {
    return (
      <div className="mx-6 my-4 rounded-xl border border-[#f1e1ed] bg-white p-5 text-center text-sm text-slate-500">
        No previous itinerary details found.
      </div>
    );
  }

const selectedLeg =
  previousLegs[selectedLegIndex] ||
  previousLegs[0];

const {
  plan,
  details,
  actualQuoteId,
} = selectedLeg;

const days = Array.isArray(details.days)
  ? details.days
  : [];

const foodPreference =
  getFoodPreference(details);

return (
  <div className="mx-6 mb-6 mt-3 space-y-4">

    {/* ONLY THE SELECTED PREVIOUS LEG */}
    <section
      key={
        plan.itinerary_plan_ID ||
        actualQuoteId
      }
      className="overflow-hidden rounded-2xl border border-[#eaddea] bg-white shadow-sm"
    >
      {/* PREVIOUS LEG SUMMARY */}
      <div className="flex flex-col gap-3 border-b border-[#f1e1ed] bg-[#fff8fc] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold text-[#b82580]">
              {rootQuoteId}
            </span>

            <span className="text-slate-300">
              |
            </span>

            <span className="font-medium text-slate-700">
              {details.dateRange}
            </span>

            {(details.nightCount !== undefined ||
              details.dayCount !== undefined) && (
              <span className="text-xs font-medium text-slate-500">
                (
                {details.nightCount ?? 0} N,{" "}
                {details.dayCount ?? 0} D)
              </span>
            )}

            <span className="rounded-full border border-[#efb7df] bg-white px-3 py-1 text-xs font-semibold text-[#b82580]">
              ↻ Previous Leg{" "}
              {selectedLegIndex + 1}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
            <span>
              Room Count{" "}
              <strong>
                {details.roomCount ?? 0}
              </strong>
            </span>

            <span>
              Extra Bed{" "}
              <strong>
                {details.extraBed ?? 0}
              </strong>
            </span>

            <span>
              Child with bed{" "}
              <strong>
                {details.childWithBed ?? 0}
              </strong>
            </span>

            <span>
              Child without bed{" "}
              <strong>
                {details.childWithoutBed ?? 0}
              </strong>
            </span>
          </div>
        </div>

        <div className="space-y-2 md:text-right">
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 md:justify-end">
            <span>
              Adults{" "}
              <strong>
                {details.adults ?? 0}
              </strong>
            </span>

            <span>
              Child{" "}
              <strong>
                {details.children ?? 0}
              </strong>
            </span>

            <span>
              Infants{" "}
              <strong>
                {details.infants ?? 0}
              </strong>
            </span>
          </div>

          <div className="text-sm font-semibold text-slate-700">
            Overall Trip Cost :{" "}
            <span className="text-lg font-bold text-[#b82580]">
              ₹{" "}
              {Number(
                details.overallCost || 0,
              ).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* DAYS ONLY FOR SELECTED LEG */}
      <div className="space-y-4 p-4">
        {days.length ? (
          days.map((day) =>
            renderPreviousDay(
              day,
              details,
              foodPreference,
            ),
          )
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            No day details available for
            this leg.
          </div>
        )}
      </div>
    </section>
  </div>
);
};
export default PreviousLegHistory;