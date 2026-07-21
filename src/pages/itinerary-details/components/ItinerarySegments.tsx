import React from "react";
import { AlertTriangle, Bell, Building2, Car, Clock, Edit, MapPin, Plus, Ticket, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface ItinerarySegmentsProps { context: Record<string, any>; }

export const ItinerarySegments: React.FC<ItinerarySegmentsProps> = ({ context }) => {
  const { day, dayFlowGuideAssignment, itinerary, destinationHotelDisplayName, selectedHotelMetaByRoute, hotelDetails, hotelReadOnly, openDeleteHotspotModal, openAddActivityModal, openGalleryModal, openVideoModal, openDeleteActivityModal, toImgSrc, isAttractionCoveredByGuide, openHotelSelectionModal, setRoomSelectionModal, toast, extractTravelFromToFromText, extractTravelToFromText } = context;

  const parseDisplayTimeToMinutes = (value: string): number | null => {
    const match = String(value || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();

    if (hours === 12) hours = 0;
    if (period === "PM") hours += 12;

    return hours * 60 + minutes;
  };

  const getTimeRangeBounds = (
    value: string,
  ): { start: number; end: number; startText: string; endText: string } | null => {
    const parts = String(value || "").split(/\s*-\s*/);
    if (parts.length !== 2) return null;

    const start = parseDisplayTimeToMinutes(parts[0]);
    let end = parseDisplayTimeToMinutes(parts[1]);

    if (start === null || end === null) return null;
    if (end < start) end += 24 * 60;

    return {
      start,
      end,
      startText: parts[0].trim(),
      endText: parts[1].trim(),
    };
  };

  const displaySegments = [...(Array.isArray(day.segments) ? day.segments : [])];

  if (!displaySegments.some(
    (segment: any) =>
      segment.type === "break" &&
      segment.location === "Leisure / Shopping Time",
  )) {
    for (let index = 1; index < displaySegments.length; index += 1) {
      const previousSegment = displaySegments[index - 1] as any;
      const currentSegment = displaySegments[index] as any;

      if (currentSegment?.type !== "travel") continue;

      const destination = String(currentSegment?.to || "").toLowerCase();
      const isDepartureTransfer =
        destination.includes("airport") ||
        destination.includes("railway") ||
        destination.includes("station");

      if (!isDepartureTransfer) continue;

      const previousRange = getTimeRangeBounds(previousSegment?.timeRange || "");
      const travelRange = getTimeRangeBounds(currentSegment?.timeRange || "");

      if (!previousRange || !travelRange) continue;

      const gapMinutes = travelRange.start - previousRange.end;

      if (gapMinutes >= 30) {
        displaySegments.splice(index, 0, {
          type: "break",
          location: "Leisure / Shopping Time",
          duration: `${Math.floor(gapMinutes / 60)} Hours ${gapMinutes % 60} Min`
            .replace(/^0 Hours\s*/, "")
            .replace(/\s*0 Min$/, ""),
          timeRange: `${previousRange.endText} - ${travelRange.startText}`,
        });
      }

      break;
    }
  }

  return (
                <div className="space-y-0">
                {displaySegments.map((segment, idx) => {
  const guideAssignmentForSegment =
    segment.type === "attraction" &&
    isAttractionCoveredByGuide(segment, dayFlowGuideAssignment)
      ? dayFlowGuideAssignment
      : null;
  const upcomingSegments = displaySegments.slice(idx + 1);
  const leisureContextText = upcomingSegments.some(
    (upcomingSegment: { type?: string; to?: string }) => upcomingSegment?.type === "checkin",
  )
    ? "before returning to the hotel"
    : upcomingSegments.some((upcomingSegment: { type?: string; to?: string }) => {
        if (upcomingSegment?.type !== "travel") return false;
        const destination = String(upcomingSegment?.to || "").toLowerCase();
        return /airport|railway|station|terminal|bus stand|bus station/.test(destination);
      })
      ? "before departure"
      : "before the next scheduled movement";

  return (
  <div key={idx}>
                      {/* Connector dots — only between real segments, never around hotspot CTAs */}
                      {idx > 0 &&
                        segment.type !== 'hotspot' &&
                        displaySegments[idx - 1]?.type !== 'hotspot' && (
                          <div className="flex justify-start ml-5 my-0.5">
                            <div className="flex flex-col items-center gap-[2px]">
                              <span className="block w-[3px] h-[3px] rounded-full bg-[#c0c0c0]"></span>
                              <span className="block w-[3px] h-[3px] rounded-full bg-[#c0c0c0]"></span>
                              <span className="block w-[3px] h-[3px] rounded-full bg-[#c0c0c0]"></span>
                            </div>
                          </div>
                        )}
                      <div className="mx-4">
                        {segment.type === "start" && (
                          <div className="flex items-center gap-2 py-1 text-sm text-[#6c6c6c]">
                            <Car className="h-4 w-4 shrink-0" />
                            <span className="font-medium text-[#4a4260]">{segment.title}</span>
                            <Clock className="h-3 w-3 ml-1" />
                            <span>{segment.timeRange}</span>
                          </div>
                        )}



                        {segment.type === "travel" && (() => {
                          const textLabels = extractTravelFromToFromText((segment as any)?.text);
                          const travelFromLabel = String(segment.from || textLabels.from || 'Route Start').trim();
                          const travelToRawLabel = String(segment.to || textLabels.to || extractTravelToFromText((segment as any)?.text) || 'Next Stop').trim();
                           const travelToLabel = /hotel/i.test(travelToRawLabel) && destinationHotelDisplayName
                            ? destinationHotelDisplayName
                            : travelToRawLabel;
                          const travelDistanceLabel = segment.distance;
                          const showTravelDistance = Boolean(
                            String(travelDistanceLabel || '').trim()
                            && String(travelDistanceLabel || '').trim() !== '--'
                          );

                          return (
                            <div className={`flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg px-3 py-2 text-sm ${segment.isConflict ? 'bg-red-50 border border-red-400' : 'bg-[#e8f9fd]'}`}>
                              <Car className="h-4 w-4 text-[#4ba3c3] shrink-0" />
                              <span className="text-[#4a4260] min-w-0 flex-1">
                                <span className="font-medium">Travelling from </span>
                                <span className="text-[#d546ab] font-medium">{travelFromLabel}</span>
                                <span className="font-medium"> to </span>
                                <span className="text-[#d546ab] font-medium">{travelToLabel}</span>
                              </span>
                              <span className="flex items-center gap-1 text-xs text-[#6c6c6c] shrink-0 flex-wrap sm:justify-end gap-x-3">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{segment.timeRange}</span>
                                {showTravelDistance && (
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{travelDistanceLabel}</span>
                                )}
                                <span className="flex items-center gap-1">⏱ {segment.duration}</span>
                                {segment.note && <span className="text-[#aaa]">({segment.note})</span>}
                              </span>
                              {segment.isConflict && (
                                <span title={segment.conflictReason ?? ''}><AlertTriangle className="h-4 w-4 text-red-500 shrink-0" /></span>
                              )}
                            </div>
                          );
                        })()}

                        {segment.type === "attraction" && (
                          <>
                            <div className={`bg-white rounded-lg px-3 py-2 border ${segment.isConflict ? 'border-red-500 bg-red-50 shadow-md' : 'border-[#e5d9f2]'}`}>
                              {segment.isConflict && (
                                <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold mb-2 animate-pulse">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>
                                    {/forced manual insertion after user confirmation/i.test(segment.conflictReason || '')
                                      ? 'Manual override confirmed: This stop is included, but timing may shift.'
                                      : `Schedule note: ${segment.conflictReason || 'Timing may shift.'}`}
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <h4 className="font-semibold text-[#4a4260] mb-2">
                                      {segment.name}
                                    </h4>
                                    <button
                                      className="text-red-500 hover:text-red-700 p-1"
                                      title="Delete Hotspot"
                                      onClick={() =>
                                        openDeleteHotspotModal(
                                          itinerary.planId || 0,
                                          day.id,
                                          segment.routeHotspotId || 0,
                                          segment.hotspotId || segment.locationId || 0,
                                          segment.name,
                                          segment.isManual === true,
                                        )
                                      }
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </div>
                                  <p className="text-sm text-[#6c6c6c] mb-2 line-clamp-2">
  {segment.description ?? ""}
</p>

{guideAssignmentForSegment && (
  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
    <span className="rounded-full bg-emerald-600 px-2 py-1 font-semibold text-white">
      Guide Assigned
    </span>

    <span>
      Language:{" "}
      <span className="font-semibold">
        {guideAssignmentForSegment.guideLanguageLabels.join(", ") || "NA"}
      </span>
    </span>

    <span>
      Duration:{" "}
      <span className="font-semibold">
        {segment.duration || "As per itinerary"}
      </span>
    </span>

    <span>
      Service Timing:{" "}
      <span className="font-semibold">
        {segment.visitTime || guideAssignmentForSegment.guideSlotLabels.join(", ") || "As per itinerary"}
      </span>
    </span>
  </div>
)}

<div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                    <span className="flex items-center font-bold text-[#d546ab] bg-[#fdf6ff] px-2 py-1 rounded border border-[#f3e8ff]">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {segment.visitTime}
                                    </span>
                                    {segment.amount && segment.amount > 0 && (
                                      <span className="flex items-center">
                                        <Ticket className="h-3 w-3 mr-1" />
                                        ₹{segment.amount.toFixed(0)}
                                      </span>
                                    )}
                                    {segment.duration && (
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {segment.duration}
                                      </span>
                                    )}
                                    {segment.timings && (
                                      <span className="flex items-center">
                                        <Timer className="h-3 w-3 mr-1" />
                                        {segment.timings}
                                      </span>
                                    )}
                                    {segment.hasAvailableActivities && (
                                      <button
                                        className="text-[#d546ab] hover:underline flex items-center font-medium"
                                        onClick={() =>
                                          openAddActivityModal(
                                            itinerary.planId || 0,
                                            day.id,
                                            segment.routeHotspotId || 0,
                                            segment.hotspotId || 0,
                                            segment.name
                                          )
                                        }
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Activity
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Thumbnail with overlaid gallery/video icons — matches PHP layout */}
                                <div className="relative flex-shrink-0 flex justify-end">
                                  <img
                                    src={
                                      toImgSrc(segment.image) ||
                                      "https://placehold.co/185x115/e9d5f7/4a4260?text=Spot"
                                    }
                                    alt={segment.name}
                                    className="rounded-lg object-cover shadow-sm w-[140px] h-[100px] sm:w-[185px] sm:h-[115px]"
                                  />
                                  {/* Icons overlaid top-right of thumbnail */}
                                  <div className="absolute top-1 right-1 flex flex-col gap-1">
                                    <button
                                      title="Click to View the Images"
                                      className="bg-white/80 hover:bg-white rounded-full p-1 shadow"
                                      onClick={() =>
                                        openGalleryModal(
                                          segment.galleryImages && segment.galleryImages.length > 0
                                            ? segment.galleryImages
                                            : segment.image ? [segment.image] : [],
                                          segment.name
                                        )
                                      }
                                    >
                                      🖼️
                                    </button>
                                    {segment.videoUrl && (
                                      <button
                                        title="Click to View the Video"
                                        className="bg-white/80 hover:bg-white rounded-full p-1 shadow"
                                        onClick={() =>
                                          openVideoModal(segment.videoUrl || "", segment.name)
                                        }
                                      >
                                        ▶️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Plan Own Way Alert */}
                            {segment.planOwnWay && (
                              <div className="flex items-center gap-3 mb-3">
                                <div className="bg-red-500 rounded-full p-2">
                                  <Bell className="h-4 w-4 text-white" />
                                </div>
                                <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex-1">
                                  <p className="text-sm font-medium m-0">
                                    Manual override: This stop is included in your plan. Exact timing may shift from the optimized route. This stop is visiting again as requested.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Activities List */}
                            {segment.activities && segment.activities.length > 0 && (
                              <div className="ml-0 sm:ml-8 mt-2 border-t border-[#e5d9f2] pt-4">
                                <h5 className="font-semibold text-[#4a4260] mb-3">Activity</h5>
                                <div className="space-y-3">
                                  {segment.activities.map((activity) => (
                                    <div
                                      key={activity.id}
                                      className="border-l-2 border-dashed border-[#d546ab] pl-4"
                                    >
                                      <div className="bg-white rounded-lg p-4 shadow-sm border border-[#e5d9f2]">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                          <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                              <h6 className="font-semibold text-[#4a4260] mb-2">
                                                {activity.title}
                                              </h6>
                                              <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Delete Activity"
                                                aria-label={`Delete activity ${activity.title}`}
                                                onClick={() =>
                                                  openDeleteActivityModal(
                                                    itinerary.planId || 0,
                                                    day.id,
                                                    activity.id,
                                                    activity.title
                                                  )
                                                }
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                            <p className="text-sm text-[#6c6c6c] mb-3">
                                              {activity.description ?? ""}
                                            </p>
                                            <div className="flex flex-wrap gap-4 text-xs text-[#6c6c6c]">
                                              {activity.startTime && activity.endTime && (
                                                <span className="flex items-center font-semibold text-[#d546ab]">
                                                  <Clock className="h-3 w-3 mr-1" />
                                                  {activity.startTime} – {activity.endTime}
                                                </span>
                                              )}
                                              {activity.amount > 0 && (
                                                <span className="flex items-center">
                                                  <Ticket className="h-3 w-3 mr-1" />
                                                  ₹ {activity.amount.toFixed(2)}
                                                </span>
                                              )}
                                              {activity.duration && (
                                                <span className="flex items-center">
                                                  <Clock className="h-3 w-3 mr-1" />
                                                  {activity.duration}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {/* Activity thumbnail with overlaid gallery icon */}
                                          <div className="relative flex-shrink-0">
                                            <img
                                              src={
                                                toImgSrc(activity.image) ||
                                                "https://placehold.co/140x100/e9d5f7/4a4260?text=Activity"
                                              }
                                              alt={activity.title}
                                              className="rounded-lg object-cover w-[120px] h-[86px] sm:w-[140px] sm:h-[100px]"
                                            />
                                            <div className="absolute top-1 right-1 flex flex-col gap-1">
                                              <button
                                                title="Click to View the Images"
                                                className="bg-white/80 hover:bg-white rounded-full p-1 shadow"
                                                onClick={() =>
                                                  openGalleryModal(
                                                    activity.galleryImages && activity.galleryImages.length > 0
                                                      ? activity.galleryImages
                                                      : activity.image ? [activity.image] : [],
                                                    activity.title
                                                  )
                                                }
                                              >
                                                🖼️
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {segment.type === "break" && (
                          <div className="bg-[#fff3cd] rounded-lg p-3 mb-3 border border-[#ffc107]">
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-[#856404]" />
                              <div className="flex-1">
                                <p className="text-sm text-[#4a4260]">
                                  {segment.location === "Leisure / Shopping Time" ? (
                                    <>
                                      <span className="font-semibold text-[#d546ab]">
                                        Leisure / Shopping Time
                                      </span>{" "}
                                      <span className="font-medium">
                                        — free time for shopping, refreshments, or leisure {leisureContextText}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-medium">
                                        {String(segment.location || "").startsWith("Visit to ")
                                          ? `${segment.location} for rest and refreshment`
                                          : "Expect a waiting time of approximately"}
                                      </span>{" "}
                                      {String(segment.location || "").startsWith("Visit to ") ? (
                                        <span className="text-[#d546ab] font-semibold">({segment.duration})</span>
                                      ) : (
                                        <>
                                          <span className="text-[#d546ab] font-semibold">{segment.duration}</span>{" "}
                                          <span className="font-medium">at this location</span>{" "}
                                          <span className="text-[#d546ab] font-semibold">({segment.location})</span>
                                        </>
                                      )}
                                    </>
                                  )}
                                </p>
                                <div className="flex flex-wrap gap-4 mt-2 text-xs text-[#6c6c6c]">
                                  <span>
                                    <Clock className="inline h-3 w-3 mr-1" />
                                    {segment.timeRange}
                                  </span>
                                  <span>⏱ {segment.duration}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {segment.type === "checkin" && (() => {
                          // Get actual hotel name from API data instead of backend generic "Hotel"
                          const hotelMeta = selectedHotelMetaByRoute.get(day.id);
                          const actualHotelName = hotelMeta?.hotelName || segment.hotelName || "Hotel";
                          const hotelForDay = hotelDetails?.hotels?.find(h =>
                            h.itineraryRouteId === day.id
                          );
                          const hotelAddress = hotelForDay?.hotelAddress || segment.hotelAddress;

                          return (
                            <div className="bg-[#e8f9fd] rounded-lg p-3 mb-3 border border-[#4ba3c3]">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-6 w-6 text-[#4ba3c3]" />
                                <div
                                  className={`flex-1 rounded-lg p-2 -m-2 transition-colors ${hotelReadOnly ? '' : 'cursor-pointer hover:bg-white/50'}`}
                                  onClick={() => {
                                    if (hotelReadOnly) return;
                                    // Get city code from hotel details if available, otherwise use default
                                    let cityCode = "1"; // Default city code
                                    if (hotelForDay?.destination) {
                                      // Try to map destination to code or use as-is
                                      const cityMap: { [key: string]: string } = {
                                        'Delhi': '1',
                                        'Agra': '2',
                                        'Jaipur': '3',
                                        'New Delhi': '1',
                                        'Mumbai': '4',
                                        'Bangalore': '5',
                                      };
                                      cityCode = cityMap[hotelForDay.destination] || "1";
                                    }

                                    openHotelSelectionModal(
                                      itinerary.planId || 0,
                                      day.id,
                                      day.date,
                                      cityCode,
                                      day.arrival || "Hotel"
                                    );
                                  }}
                                >
                                  <p className="text-sm font-semibold text-[#4a4260] mb-1">
                                    Check-in to {actualHotelName}
                                  </p>
                                  {hotelAddress && (
                                    <p className="text-xs text-[#6c6c6c] mb-2">
                                      {hotelAddress}
                                    </p>
                                  )}
                                  {segment.time && (
                                    <p className="text-xs text-[#6c6c6c]">
                                      <Clock className="inline h-3 w-3 mr-1" />
                                      {segment.time}
                                    </p>
                                  )}
                                  {!hotelReadOnly && (
                                    <p className="text-xs text-[#d546ab] mt-2">
                                      Click to change hotel
                                    </p>
                                  )}
                                </div>

                                {/* Room Category Selection Button */}
                                {!hotelReadOnly && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-[#d546ab]/10 hover:bg-[#d546ab]/20 text-[#d546ab] shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // For confirmed itineraries, only show hotels that are actually confirmed (itineraryPlanHotelDetailsId > 0)
                                      const confirmedHotels = hotelDetails?.hotels?.filter(h =>
                                        itinerary?.isConfirmed ? h.itineraryPlanHotelDetailsId > 0 : true
                                      );
                                      const hotelForDay = confirmedHotels?.find(h =>
                                        h.itineraryRouteId === day.id
                                      );

                                      if (hotelForDay) {
                                        setRoomSelectionModal({
                                          open: true,
                                          itinerary_plan_hotel_details_ID: hotelForDay.itineraryPlanHotelDetailsId,
                                          itinerary_plan_id: itinerary.planId || 0,
                                          itinerary_route_id: day.id,
                                          hotel_id: hotelForDay.hotelId,
                                          group_type: hotelForDay.groupType,
                                          hotel_name: hotelForDay.hotelName || segment.hotelName,
                                        });
                                      } else {
                                        toast.error('Hotel information not available');
                                      }
                                    }}
                                    title="Select room categories"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {segment.type === "return" && (
                          <div className="flex items-center gap-3 text-sm text-[#6c6c6c]">
                            <Car className="h-5 w-5" />
                            <div>
                              <p className="font-medium text-[#4a4260]">
                                Return to Origin and Relax
                              </p>
                              <p>
                                <Clock className="inline h-3 w-3 mr-1" />
                                {segment.time}
                                {segment.note && (
                                  <span className="ml-2">🔘 {segment.note}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>{/* end timeline row wrapper */}
                                     </div>
                  );
                })}


                </div>
  );
};
