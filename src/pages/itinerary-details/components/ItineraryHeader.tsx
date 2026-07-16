import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, CreditCard, FileText, Loader2, Plus, Receipt, RefreshCw, Trash2 } from "lucide-react";
import type { ItineraryDetailsResponse, ItineraryPlanRouteOption } from "../itinerary-details.types";

interface ItineraryHeaderProps {
  summaryStickyRef: React.RefObject<HTMLDivElement>;
  itineraryRouteOptions: ItineraryPlanRouteOption[];
  activeRouteQuoteId: string | null;
  quoteId?: string;
  isSwitchingRouteOption: boolean;
  handleItineraryRouteOptionClick: (routeQuoteId: string) => void | Promise<void>;
  itineraryPreference: number;
  scrollToVehicleList: () => void;
  vehicleBuildStatus: string;
  scrollToHotelList: () => void;
  backToListHref: string;
  itinerary: ItineraryDetailsResponse;
  isAgentLogin: boolean;
  handleDownloadPluckCard: () => void | Promise<void>;
  setVoucherModal: (open: boolean) => void;
  setIncidentalModal: (open: boolean) => void;
  modifyItineraryHref: string;
  handleDownloadInvoice: (type: "tax" | "proforma") => void | Promise<void>;
  shouldShowRebuildHotelsButton: boolean;
  hotelReadOnly: boolean;
  handleRebuildHotels: () => void | Promise<void>;
  isRebuildingHotels: boolean;
  overallTripCostWithHotels: string;
}

export function ItineraryHeader(props: ItineraryHeaderProps) {
  const { summaryStickyRef, itineraryRouteOptions, activeRouteQuoteId, quoteId,
    isSwitchingRouteOption, handleItineraryRouteOptionClick, itineraryPreference,
    scrollToVehicleList, vehicleBuildStatus, scrollToHotelList, backToListHref,
 itinerary, isAgentLogin, handleDownloadPluckCard, setVoucherModal,
setIncidentalModal, modifyItineraryHref, handleDownloadInvoice,
shouldShowRebuildHotelsButton,
    hotelReadOnly, handleRebuildHotels, isRebuildingHotels, overallTripCostWithHotels } = props;

  const itineraryStartDate = String(
    itinerary.days?.[0]?.date ||
      itinerary.dateRange?.split(/\s+to\s+/i)[0] ||
      ""
  )
    .trim()
    .slice(0, 10);

  const shouldShowInvoiceButtons =
    /^\d{4}-\d{2}-\d{2}$/.test(itineraryStartDate) &&
    itineraryStartDate >= "2026-08-15";

  return (
      <div ref={summaryStickyRef} className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
        <Card className="border-none shadow-none bg-white">
          <CardContent className="pt-4 pb-0">
  {itineraryRouteOptions.length > 1 && (
  <div className="mb-2 rounded-lg border border-[#f0d7ff] bg-[#fff7fd] px-3 py-2">
    <div className="max-h-[78px] overflow-y-auto pr-1">
      <div className="flex flex-wrap gap-1.5">
        {itineraryRouteOptions.map((route, index) => {
          const selectedRouteQuoteId =
            activeRouteQuoteId || quoteId || itinerary.quoteId;
          const isActive = route.quoteId === selectedRouteQuoteId;

          return (
            <button
              key={`${route.quoteId}-${index}`}
              type="button"
              disabled={isSwitchingRouteOption}
              onClick={() => handleItineraryRouteOptionClick(route.quoteId || "")}
              className={`min-w-[92px] px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-pink-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${isSwitchingRouteOption ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {route.label || `Route ${index + 1}`}
            </button>
          );
        })}
      </div>
    </div>
  </div>
)}

  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <h1 className="text-xl font-semibold text-[#4a4260] flex flex-wrap items-center gap-1">
                <span>Tour Itinerary Plan</span>
                <span className="text-[#6c6c6c]">(</span>
                {itineraryPreference === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={scrollToVehicleList}
                      disabled={vehicleBuildStatus !== "READY"}
                      className="text-[#6c6c6c] hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40 rounded disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-[#6c6c6c] disabled:no-underline"
                    title={vehicleBuildStatus !== "READY" ? "Transportation details are preparing" : "Go to Transportation"}
>
  Transportation
</button>
                    <span className="text-[#6c6c6c]">Only</span>                   
                  </>
                )}
                {itineraryPreference === 1 && (
                  <>
                    <button
                      type="button"
                      onClick={scrollToHotelList}
                      className="text-[#6c6c6c] hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40 rounded"
                      title="Go to Hotel List"
                    >
                      Hotel
                    </button>
                    <span className="text-[#6c6c6c]">Only</span>
                  </>
                )}
                {itineraryPreference !== 1 && itineraryPreference !== 2 && (
                  <>
                    <button
  type="button"
  onClick={scrollToVehicleList}
  disabled={vehicleBuildStatus !== "READY"}
  className="text-[#6c6c6c] hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40 rounded disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-[#6c6c6c] disabled:no-underline"
  title={vehicleBuildStatus !== "READY" ? "Transportation details are preparing" : "Go to Transportation"}
>
  Transportation
</button>
                    <span className="text-[#6c6c6c]">+</span>
                    <button
                      type="button"
                      onClick={scrollToHotelList}
                      className="text-[#6c6c6c] hover:text-[#d546ab] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab]/40 rounded"
                      title="Go to Hotel List"
                    >
                      Hotel
                    </button>
                  </>
                )}
                <span className="text-[#6c6c6c]">)</span>
              </h1>
              <div className="flex flex-wrap gap-2">
                <Link to={backToListHref}>
                  <Button
                    variant="outline"
                    className="border-[#d546ab] text-[#d546ab] hover:bg-[#fdf6ff]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to List
                  </Button>
                </Link>

                {itinerary.isConfirmed && (
                  <>
                  {!isAgentLogin && (
  <Button
    variant="outline"
    className="border-[#6f42c1] text-[#6f42c1] hover:bg-[#6f42c1] hover:text-white"
    onClick={() => void handleDownloadPluckCard()}
  >
    <CreditCard className="mr-2 h-4 w-4" />
    Download Pluck Card
  </Button>
)}
                    <Button
                      variant="outline"
                      className="border-[#28a745] text-[#28a745] hover:bg-[#28a745] hover:text-white"
                      onClick={() => setVoucherModal(true)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Voucher Details
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fd7e14] hover:text-white"
                      onClick={() => setIncidentalModal(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Incidental Expenses
                    </Button>
                    <Link to={modifyItineraryHref}>
                      <Button
                        variant="outline"
                        className="border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545] hover:text-white"
                      >
                       <Trash2 className="mr-2 h-4 w-4" />
                     Extend Trip
                      </Button>
                    </Link>
                  {shouldShowInvoiceButtons && (
  <>
    <Button
      variant="outline"
      className="border-[#17a2b8] text-[#17a2b8] hover:bg-[#17a2b8] hover:text-white"
      onClick={() => void handleDownloadInvoice("tax")}
    >
      <Receipt className="mr-2 h-4 w-4" />
      Invoice Tax
    </Button>

    <Button
      variant="outline"
      className="border-[#fd7e14] text-[#fd7e14] hover:bg-[#fd7e14] hover:text-white"
      onClick={() => void handleDownloadInvoice("proforma")}
    >
      <FileText className="mr-2 h-4 w-4" />
      Invoice Proforma
    </Button>
  </>
)}
                  </>
                )}
              </div>
            </div>

            {/* Responsive two-row trip summary */}
            <div
              className="-mx-6 -mt-2 rounded-lg bg-[#fff0fc]"
              aria-label="Trip summary"
            >
              <div className="grid gap-x-6 gap-y-2 px-4 py-3 text-sm text-[#6c6c6c] sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="shrink-0 text-lg font-bold text-[#d546ab] sm:text-xl">
                    {itinerary.quoteId}
                  </span>

                  <span className="hidden h-6 w-px shrink-0 bg-[#e1dfe6] sm:block" aria-hidden="true" />

                  <span className="flex min-w-0 items-center gap-2 font-semibold text-[#4a4260]">
                    <Calendar className="h-5 w-5 shrink-0 text-[#6c6c6c]" />
                    <span>{itinerary.dateRange}</span>
                  </span>

                  {(itinerary.nightCount !== undefined || itinerary.dayCount !== undefined) && (
                    <span className="shrink-0 font-semibold text-[#4a4260]">
                      ({itinerary.nightCount ?? 0} N, {itinerary.dayCount ?? 0} D)
                    </span>
                  )}

                  {shouldShowRebuildHotelsButton && !hotelReadOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRebuildHotels}
                      disabled={isRebuildingHotels}
                      className="h-7 rounded-lg border-[#d546ab] px-2 text-[inherit] text-[#d546ab] hover:bg-[#fdf6ff]"
                    >
                      {isRebuildingHotels ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Rebuilding...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          Rebuild Hotels
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:justify-self-end">
                  <span className="flex items-center gap-2">
                    Adults
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 font-semibold text-[#4a4260]">
                      {itinerary.adults}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    Child
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 font-semibold text-[#4a4260]">
                      {itinerary.children}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    Infants
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 font-semibold text-[#4a4260]">
                      {itinerary.infants}
                    </span>
                  </span>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                  {[
                    ["Room Count", itinerary.roomCount],
                    ["Extra Bed", itinerary.extraBed],
                    ["Child with bed", itinerary.childWithBed],
                    ["Child without bed", itinerary.childWithoutBed],
                  ].map(([label, value]) => (
                    <span key={String(label)} className="flex items-center gap-2">
                      {label}
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 font-semibold text-[#4a4260]">
                        {value}
                      </span>
                    </span>
                  ))}
                </div>

                <span className="shrink-0 whitespace-nowrap text-left text-base font-medium text-[#4a4260] md:justify-self-end md:text-right">
                  Overall Trip Cost :{" "}
                  <span className="text-xl font-bold text-[#d546ab] sm:text-2xl">
                    ₹ {overallTripCostWithHotels}
                  </span>
                </span>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
  );
}
