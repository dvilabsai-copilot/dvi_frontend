import { Card, CardContent } from "@/components/ui/card";
import { ItineraryDayHeader } from "./ItineraryDayHeader";
import { ItinerarySegments } from "./ItinerarySegments";
import { ItineraryDayGuideCard } from "./ItineraryDayGuideCard";
import type { ItineraryGuideAssignment } from "../itinerary-details.types";

type SegmentRecord = { type?: string; planOwnWay?: boolean; isManual?: boolean; [key: string]: unknown };
type DayRecord = { id?: unknown; dayNumber?: unknown; arrival?: unknown; departure?: unknown; segments: SegmentRecord[]; [key: string]: unknown };
type ItineraryDaysContext = {
  displayDays: DayRecord[];
  getDisplayDistances: (day: DayRecord) => { intercityDistance: unknown; sightseeingDistance: unknown };
  getGuestFoodPreferenceText: (itinerary: unknown, day: DayRecord) => string;
  itinerary: Record<string, unknown>;
  guideAssignments: ItineraryGuideAssignment[];
  readOnly: boolean;
  guideAvailability: unknown;
  guideAvailabilityLoading: boolean;
  isGuidePriceAvailableForDay: (day: DayRecord) => boolean;
  getGuideAssignmentForDay: (day: DayRecord) => unknown;
  openGuideModal: (day: DayRecord | null, assignment: ItineraryGuideAssignment, guideType: number) => unknown;
  setDeleteGuideModal: (value: unknown) => unknown;
  routeNeedsRebuild: unknown;
  summaryStickyHeight: number;
  isRebuilding: boolean;
  [key: string]: unknown;
};
type ItineraryDaysSectionProps = { context: Record<string, unknown> };

/** Owns daily itinerary composition while the controller supplies workflow callbacks and state. */
export function ItineraryDaysSection({ context }: ItineraryDaysSectionProps) {
  const {
    displayDays,
    getDisplayDistances,
    getGuestFoodPreferenceText,
    itinerary,
    guideAssignments,
    readOnly,
    guideAvailability,
    guideAvailabilityLoading,
    isGuidePriceAvailableForDay,
    getGuideAssignmentForDay,
    routeNeedsRebuild,
    summaryStickyHeight,
    isRebuilding,
    handleRebuildRoute,
    handleUpdateRouteTimesDirectFromHook,
    openSourcePreview,
    openAddHotspotModal,
    handleWholeItineraryGuideClick,
    handleAddGuideClick,
    openGuideModal,
    setDeleteGuideModal,
    destinationHotelDisplayName,
    selectedHotelMetaByRoute,
    hotelDetails,
    hotelReadOnly,
    openDeleteHotspotModal,
    openAddActivityModal,
    openGalleryModal,
    openVideoModal,
    openDeleteActivityModal,
    toImgSrc,
    isAttractionCoveredByGuide,
    openHotelSelectionModal,
    setRoomSelectionModal,
    toast,
    extractTravelFromToFromText,
    extractTravelToFromText,
  } = context as ItineraryDaysContext;

  return (
    <div>
      {displayDays.map((day) => {
        const { intercityDistance, sightseeingDistance } = getDisplayDistances(day);
        const guestFoodPreferenceText = getGuestFoodPreferenceText(itinerary, day);
        const dayHasManualOverride = day.segments.some((segment) => String(segment?.type || "").toLowerCase() === "attraction" && (segment.planOwnWay === true || segment.isManual === true));
        const addHotspotCta = day.segments.find((segment) => segment.type === "hotspot");
        const canShowAddHotspotButton = !readOnly;
        const addHotspotLocationName = day.arrival || day.departure || "Location";
        const isWholeItineraryGuideMode = Number(itinerary.guideForItinerary || 0) === 1;
        const wholeItineraryGuideAssignment = guideAssignments.find((assignment) => Number(assignment.guideType || 0) === 1) ?? null;
        const dayGuideAssignment = guideAssignments.find((assignment) => Number(assignment.guideType || 0) === 2 && Number(assignment.routeId || 0) === Number(day.id)) ?? null;
        const currentGuideAssignment = isWholeItineraryGuideMode && Number(day.dayNumber || 0) === 1 ? wholeItineraryGuideAssignment : dayGuideAssignment;
        const dayFlowGuideAssignment = getGuideAssignmentForDay(day);
        const guidePriceAvailableForDay = isGuidePriceAvailableForDay(day);
        const isGuideEnabledForItinerary = [1, 2].includes(Number(itinerary?.guideForItinerary || 0));
        const canShowGuideActionButton = Boolean(currentGuideAssignment) || (isGuideEnabledForItinerary && guideAvailability !== null && !guideAvailabilityLoading && guidePriceAvailableForDay === true);

        return (
          <section key={String(day.id ?? "")} className="mb-4 rounded-lg bg-white pb-6 pt-1 shadow-sm">
            <ItineraryDayHeader context={{
              day, itinerary, summaryStickyHeight, routeNeedsRebuild, dayHasManualOverride, isRebuilding, handleRebuildRoute,
              handleUpdateRouteTimesDirect: handleUpdateRouteTimesDirectFromHook,
              canShowGuideActionButton, openSourcePreview, canShowAddHotspotButton, openAddHotspotModal, addHotspotCta, addHotspotLocationName,
              readOnly, isWholeItineraryGuideMode, handleWholeItineraryGuideClick, handleAddGuideClick, currentGuideAssignment, guestFoodPreferenceText,
              intercityDistance, openGuideModal, setDeleteGuideModal,
            }} />
            <Card className="border border-[#e5d9f2] bg-white">
              <CardContent className="pt-2">
                {currentGuideAssignment && <ItineraryDayGuideCard assignment={currentGuideAssignment} readOnly={readOnly} onEdit={() => void openGuideModal(Number(currentGuideAssignment.guideType || 0) === 1 ? null : day, currentGuideAssignment, Number(currentGuideAssignment.guideType || 0) === 1 ? 1 : 2)} onDelete={() => setDeleteGuideModal({ open: true, assignment: currentGuideAssignment, deleting: false })} />}
                <ItinerarySegments context={{
                  day, dayFlowGuideAssignment, itinerary, destinationHotelDisplayName, selectedHotelMetaByRoute, hotelDetails, hotelReadOnly,
                  openDeleteHotspotModal, openAddActivityModal, openGalleryModal, openVideoModal, openDeleteActivityModal, toImgSrc,
                  isAttractionCoveredByGuide, openHotelSelectionModal, setRoomSelectionModal, toast, extractTravelFromToFromText, extractTravelToFromText,
                }} />
              </CardContent>
            </Card>
          </section>
        );
      })}
    </div>
  );
}

export default ItineraryDaysSection;
