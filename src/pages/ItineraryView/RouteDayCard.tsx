// Route Day Card Component for Itinerary View

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, MapPin, Clock } from "lucide-react";
import { GuideDetails, ItineraryRoute } from "./types";
import {
  formatItineraryDate,
  formatCurrency,
  formatTime,
  formatViaRoutesPlain,
  isBeforeSixAM,
  isAfterEightPM,
} from "./helpers";

interface RouteDayCardProps {
  route: ItineraryRoute;
  dayNumber: number;
  totalKm?: number;
  isExpanded: boolean;
  onToggle: () => void;
  showKm?: boolean;
  guideAssignment?: GuideDetails | null;
}

export const RouteDayCard = ({
  route,
  dayNumber,
  totalKm = 0,
  isExpanded,
  onToggle,
  showKm = true,
  guideAssignment = null,
}: RouteDayCardProps) => {
  const viaRoutesText = route.via_routes && route.via_routes.length > 0
    ? formatViaRoutesPlain(route.via_routes)
    : null;

  const beforeSixAM = isBeforeSixAM(route.route_start_time);
  const afterEightPM = isAfterEightPM(route.route_end_time);

  return (
    <div className="mb-3">
      {/* Sticky Header */}
      <div
        onClick={onToggle}
        className="sticky top-[148px] z-10 cursor-pointer bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          {/* Left Section - Day Info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h6 className="font-semibold">
                DAY {dayNumber}
              </h6>
              <span className="text-sm text-gray-600">
                {formatItineraryDate(route.itinerary_route_date)}
              </span>
            </div>
          </div>

          {/* Middle Section - Route */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="font-medium truncate max-w-[200px]" title={route.location_name}>
              {route.location_name}
            </span>
            
            {viaRoutesText && (
              <>
                <ArrowRight className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600 truncate max-w-[200px]" title={viaRoutesText}>
                  {viaRoutesText}
                </span>
              </>
            )}
            
            <ArrowRight className="w-4 h-4 text-purple-600" />
            <span className="font-medium truncate max-w-[200px]" title={route.next_visiting_location}>
              {route.next_visiting_location}
            </span>
          </div>

          {/* Right Section - KM */}
          {showKm && (
            <div className="flex items-center gap-2">
              <img src="/assets/img/kilometer.png" alt="KM" className="w-5 h-5" />
              <span className="font-semibold text-purple-600">
                {totalKm.toFixed(2)} KM
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <Card className="mt-2 border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            {/* Location Description */}
            {route.location_description && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                <div className="flex gap-3">
                  <MapPin className="w-6 h-6 text-purple-600 flex-shrink-0" />
                  <div>
                    <h6 className="font-semibold mb-2">About Location</h6>
                    <p className="text-sm text-gray-700">{route.location_description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Time Display */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{formatTime(route.route_start_time)}</span>
                <ArrowRight className="w-4 h-4" />
                <span className="font-medium">{formatTime(route.route_end_time)}</span>
              </div>

              {/* Extra Charges Warning */}
              {(beforeSixAM || afterEightPM) && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <i className="ti ti-info-circle-filled" />
                  {beforeSixAM && afterEightPM && (
                    <span>
                      Before 6 AM and after 8 PM, extra charges for vehicle and driver are applicable.
                    </span>
                  )}
                  {beforeSixAM && !afterEightPM && (
                    <span>Before 6 AM extra charges for vehicle and driver are applicable.</span>
                  )}
                  {!beforeSixAM && afterEightPM && (
                    <span>After 8 PM extra charges for vehicle and driver are applicable.</span>
                  )}
                </div>
              )}
            </div>

            {guideAssignment && (
              <div className="mb-4 rounded-lg bg-purple-50 px-4 py-3">
                <p className="text-sm font-semibold text-purple-800">
                  {guideAssignment.guideName || "Guide"}
                  {guideAssignment.guideLanguageLabels.length > 0 && (
                    <>
                      {" "}
                      Language - <span className="text-purple-700">{guideAssignment.guideLanguageLabels.join(", ")}</span>
                    </>
                  )}
                </p>
                {guideAssignment.guideSlotLabels.length > 0 && (
                  <p className="mt-1 text-sm text-gray-600">
                    Slot Timing - <span className="font-medium text-gray-800">{guideAssignment.guideSlotLabels.join(", ")}</span>
                  </p>
                )}
                <p className="mt-2 text-base font-bold text-purple-700">
                  {formatCurrency(Number(guideAssignment.guideCost || 0))}
                </p>
              </div>
            )}

            {/* Additional route details can be added here */}
            {/* Hotspots, Activities, Hotels, etc. */}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
