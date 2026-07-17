import React from "react";
import { ArrowRight, Calendar, Clock, Edit, FileText, Loader2, MapPin, Plus, RefreshCw, Route, Trash2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePickerPopover } from "@/components/itinerary/TimePickerPopover";
import { formatHeaderDate } from "../utils/timeline.utils";

export interface ItineraryDayHeaderProps { context: Record<string, any>; }

export const ItineraryDayHeader: React.FC<ItineraryDayHeaderProps> = ({
  context,
}) => {
  const {
    day,
    itinerary,
    summaryStickyHeight,
    routeNeedsRebuild,
    dayHasManualOverride,
    isRebuilding,
    handleRebuildRoute,
    handleUpdateRouteTimesDirect,
    canShowGuideActionButton,
    openSourcePreview,
    canShowAddHotspotButton,
    openAddHotspotModal,
    addHotspotCta,
    addHotspotLocationName,
    readOnly,
    isWholeItineraryGuideMode,
    handleWholeItineraryGuideClick,
    handleAddGuideClick,
    currentGuideAssignment,
    guestFoodPreferenceText,
    intercityDistance,
    openGuideModal,
    setDeleteGuideModal,
  } = context;

  const itineraryPreference = Number(
    itinerary?.itineraryPreference ??
    itinerary?.itinerary_preference ??
    0
  );

  const shouldShowFoodPreference =
    itineraryPreference === 1 ||
    itineraryPreference === 3;

  return (
<div
  id={`itinerary-day-${day.dayNumber}`}
  data-day-number={day.dayNumber}
  className="sticky z-20 mx-0 mb-3 mt-1 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 shadow-sm sm:px-5"
  style={{ top: `${Math.max(summaryStickyHeight + 4, 4)}px` }}
>
  <div className="grid grid-cols-1 gap-2 lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:grid-rows-2 lg:gap-x-4">
    {/* Row 1: day/date and centered route; row 2 actions are placed below via grid */}
    <div className="contents">
      <div className="order-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-[#242133] lg:col-start-1 lg:row-start-1">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 shrink-0 text-[#d546ab]" />
          <h3 className="whitespace-nowrap text-base font-bold">
            DAY {day.dayNumber}
          </h3>
        </div>

        <span className="hidden h-8 w-px bg-[#e1dfe6] sm:block" aria-hidden="true" />
        <span className="whitespace-nowrap text-sm font-semibold sm:text-base">
          {formatHeaderDate(day.date)}
        </span>
        {(routeNeedsRebuild === day.id || (day as any).needsRebuild === true || dayHasManualOverride) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRebuildRoute(itinerary.planId, day.id)}
            disabled={isRebuilding}
            className="h-8 border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
          >
            {isRebuilding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rebuilding...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rebuild Route
              </>
            )}
          </Button>
        )}
      </div>

      <div className="contents">
        <div className="order-4 flex h-8 w-fit items-center gap-3 rounded-full border border-[#e5d9f2] bg-white px-4 shadow-sm lg:col-start-3 lg:row-start-2 lg:justify-self-center">
          <Clock className="h-5 w-5 shrink-0 text-[#d546ab]" />
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="whitespace-nowrap text-sm font-semibold text-[#242133] hover:text-[#d546ab]"
              >
                {day.startTime}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <TimePickerPopover
                value={day.startTime}
                label="Start Time"
                onSave={async (newTime) => {
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
                  await handleUpdateRouteTimesDirect(
                    itinerary.planId || 0,
                    day.id,
                    day.dayNumber,
                    newTime,
                    day.endTime
                  );
                }}
              />
            </PopoverContent>
          </Popover>

          <ArrowRight className="h-4 w-4 shrink-0 text-[#d546ab]" />

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="whitespace-nowrap text-sm font-semibold text-[#242133] hover:text-[#d546ab]"
              >
                {day.endTime}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <TimePickerPopover
                value={day.endTime}
                label="End Time"
                onSave={async (newTime) => {
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
                  await handleUpdateRouteTimesDirect(
                    itinerary.planId || 0,
                    day.id,
                    day.dayNumber,
                    day.startTime,
                    newTime
                  );
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="order-5 flex flex-wrap items-center gap-3 lg:col-start-4 lg:row-start-2 lg:justify-self-end">
        {!canShowGuideActionButton && (<Button
          size="sm"
          variant="outline"
          onClick={() => void openSourcePreview(day.dayNumber)}
          className="h-8 rounded-xl border-slate-200 bg-slate-50 px-4 font-semibold text-[#242133] hover:bg-slate-100"
        >
          <FileText className="mr-2 h-4 w-4" />
          Source
        </Button>)}

        {canShowAddHotspotButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-[#d546ab] px-5 text-sm font-semibold text-[#d546ab] hover:bg-[#fdf6ff]"
            onClick={() =>
              openAddHotspotModal(
                itinerary.planId || 0,
                day.id,
                addHotspotCta?.locationId || 0,
                addHotspotLocationName,
                addHotspotCta?.anchorType === "after_travel" &&
                  Number.isInteger(Number(addHotspotCta.anchorIndex))
                  ? {
                      anchorType: "after_travel",
                      anchorIndex: Number(addHotspotCta.anchorIndex),
                      anchorFrom: addHotspotCta?.anchorFrom,
                      anchorTo: addHotspotCta?.anchorTo,
                      anchorTimeRange: addHotspotCta?.anchorTimeRange,
                    }
                  : null
              )
            }
          >
            Add Hotspot
          </Button>
        )}

        {!readOnly && canShowGuideActionButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-[#d546ab] px-5 text-sm font-semibold text-[#d546ab] hover:bg-[#fdf6ff]"
            onClick={() => {
              if (isWholeItineraryGuideMode) {
                handleWholeItineraryGuideClick();
                return;
              }

              handleAddGuideClick(day);
            }}
          >
            {currentGuideAssignment ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {currentGuideAssignment ? "Edit Guide" : "Add Guide"}
          </Button>
        )}

        </div>
      </div>
    </div>

    <div className="contents">
     {shouldShowFoodPreference && (
  <div className="order-1 flex shrink-0 items-center gap-2 text-sm lg:col-start-1 lg:row-start-2">
    <Utensils className="h-5 w-5 text-[#d546ab]" />

    <span className="font-semibold text-[#d546ab]">
      Food Preference:
    </span>

    <span className="font-medium">
      {guestFoodPreferenceText}
    </span>
  </div>
)}

        {canShowGuideActionButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void openSourcePreview(day.dayNumber)}
            className="order-2 h-8 w-fit rounded-xl border-slate-200 bg-slate-50 px-4 font-semibold text-[#242133] hover:bg-slate-100 lg:col-start-2 lg:row-start-2 lg:justify-self-start"
          >
            <FileText className="mr-2 h-4 w-4" />
            Source
          </Button>
        )}

        <div className="order-2 flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-[#242133] lg:col-start-3 lg:row-start-1 lg:w-full">
        <span className="flex shrink-0 items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-[#d546ab]" />
          {day.departure}
        </span>

        <ArrowRight className="h-4 w-4 shrink-0 text-[#d546ab]" />

        {day.viaRoutes && day.viaRoutes.length > 0 && (
          <>
            <span
              className="min-w-0 text-[#4a4260]"
              title={day.viaRoutes.map((v) => v.name).join(", ")}
            >
              {day.viaRoutes.map((v) => v.name).join(", ")}
            </span>
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6c6c6c]" />
          </>
        )}

        {day.viaRoutes && day.viaRoutes.length > 0 && (
          <span className="hidden h-6 w-px bg-[#e1dfe6] sm:block" aria-hidden="true" />
        )}
        <span className="shrink-0 font-medium">{day.arrival}</span>
      </div>

      <span className="order-2 flex h-8 w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-[#d546ab] px-5 text-sm font-bold text-white lg:col-start-4 lg:row-start-1 lg:justify-self-end">
        <Route className="h-4 w-4" />
        {intercityDistance}
      </span>
    </div>
  </div>
</div>

  );
};
