// Main Itinerary View Component

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Bed, Calendar } from "lucide-react";
import { ItineraryService } from "@/services/itinerary";
import { RouteDayCard } from "./RouteDayCard";
import { GuideDetails, ItineraryFullDetails, ItineraryRoute } from "./types";
import {
  formatItineraryDate,
  calculateTotalPax,
  formatCurrency,
  getItineraryPreferenceLabel,
} from "./helpers";
import { useToast } from "@/components/ui/use-toast";

export const ItineraryView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<ItineraryFullDetails | null>(null);
  const [guideAssignments, setGuideAssignments] = useState<GuideDetails[]>([]);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set([0])); // First route expanded by default

  useEffect(() => {
    if (id) {
      loadItinerary(Number(id));
    }
  }, [id]);

  const loadItinerary = async (planId: number) => {
    try {
      setLoading(true);
      const [data, assignments] = await Promise.all([
        ItineraryService.getOne(planId),
        ItineraryService.getGuideAssignments(planId).catch(() => []),
      ]);

      setItinerary(data as ItineraryFullDetails);
      setGuideAssignments(Array.isArray(assignments) ? assignments as GuideDetails[] : []);
    } catch (error) {
      console.error("Failed to load itinerary:", error);
      setGuideAssignments([]);
      toast({
        title: "Error",
        description: "Failed to load itinerary details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRoute = (index: number) => {
    setExpandedRoutes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Itinerary not found</p>
          <Button onClick={() => navigate("/itineraries")} className="mt-4">
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  const { plan, routes } = itinerary;
  const totalPax = calculateTotalPax(plan.total_adult, plan.total_children, plan.total_infants);
  const isWholeItineraryGuideMode = Number(plan.guide_for_itinerary || 0) === 1;
  const wholeItineraryGuide =
    guideAssignments.find((assignment) => Number(assignment.guideType || 0) === 1) ?? null;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page Title - Sticky */}
      <Card className="sticky top-[2px] z-[1001] bg-white shadow-sm mb-3">
        <CardContent className="p-4 py-3">
          <div className="flex items-center justify-between">
            <h5 className="text-lg font-semibold m-0">Tour Itinerary Plan</h5>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/create-itinerary?id=${plan.itinerary_plan_ID}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header - Sticky */}
      <Card className="sticky top-[60px] z-[1000] bg-purple-50 border-purple-200 shadow-md mb-4">
        <CardContent className="p-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h6 className="text-purple-700 font-semibold m-0">
                #{plan.itinerary_quote_ID}
              </h6>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold">
                  {formatItineraryDate(plan.trip_start_date_and_time)} to{" "}
                  {formatItineraryDate(plan.trip_end_date_and_time)}
                </span>
                <span className="text-sm">
                  ({plan.no_of_nights}N, {plan.no_of_days}D)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Adults</span>
                <Badge variant="secondary">{plan.total_adult}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Child</span>
                <Badge variant="secondary">{plan.total_children}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Infants</span>
                <Badge variant="secondary">{plan.total_infants}</Badge>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {plan.preferred_room_count !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Room Count</span>
                  <Badge variant="secondary">{plan.preferred_room_count}</Badge>
                </div>
              )}
              {plan.total_extra_bed !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Extra Bed</span>
                  <Badge variant="secondary">{plan.total_extra_bed}</Badge>
                </div>
              )}
              {plan.total_child_with_bed !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Child with bed</span>
                  <Badge variant="secondary">{plan.total_child_with_bed}</Badge>
                </div>
              )}
              {plan.total_child_without_bed !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Child without bed</span>
                  <Badge variant="secondary">{plan.total_child_without_bed}</Badge>
                </div>
              )}
            </div>

            <h5 className="text-lg font-semibold text-purple-700 m-0">
              Overall Trip Cost: <span className="text-xl">{formatCurrency(plan.expecting_budget)}</span>
            </h5>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardContent className="p-4">
          {isWholeItineraryGuideMode && wholeItineraryGuide && (
            <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <p className="text-sm font-semibold text-purple-800">Whole Itinerary Guide</p>
              <p className="mt-1 text-sm text-gray-700">
                {wholeItineraryGuide.guideName || "Guide"}
                {wholeItineraryGuide.guideLanguageLabels.length > 0 && (
                  <>
                    {" "}
                    Language - <span className="font-medium text-purple-700">{wholeItineraryGuide.guideLanguageLabels.join(", ")}</span>
                  </>
                )}
              </p>
              {wholeItineraryGuide.guideSlotLabels.length > 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  Slot Timing - <span className="font-medium text-gray-800">{wholeItineraryGuide.guideSlotLabels.join(", ")}</span>
                </p>
              )}
              <p className="mt-2 text-base font-bold text-purple-700">
                {formatCurrency(Number(wholeItineraryGuide.guideCost || 0))}
              </p>
            </div>
          )}

          {/* Routes Accordion */}
          <div className="space-y-2">
            {routes.map((route: ItineraryRoute, index: number) => (
              <RouteDayCard
                key={route.itinerary_route_ID}
                route={route}
                dayNumber={index + 1}
                totalKm={route.no_of_km ? parseFloat(route.no_of_km) : 0}
                isExpanded={expandedRoutes.has(index)}
                onToggle={() => toggleRoute(index)}
                showKm={plan.itinerary_preference !== 1}
                guideAssignment={
                  isWholeItineraryGuideMode
                    ? null
                    : guideAssignments.find(
                        (assignment) =>
                          Number(assignment.guideType || 0) === 2 &&
                          Number(assignment.routeId || 0) === Number(route.itinerary_route_ID),
                      ) ?? null
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ItineraryView;
