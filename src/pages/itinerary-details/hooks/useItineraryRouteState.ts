import { useRef, useState } from "react";
import type {
  ItineraryDetailsResponse,
  ItineraryHotelDetailsResponse,
  ItineraryPlanRouteOption,
} from "../itinerary-details.types";
import { PAGE_LOADER_STAGE_DETAILS } from "../itinerary-details.constants";

export function useItineraryRouteState(quoteId?: string) {
  const [itinerary, setItinerary] = useState<ItineraryDetailsResponse | null>(null);
  const [hotelDetails, setHotelDetails] = useState<ItineraryHotelDetailsResponse | null>(null);
  const [routeHotelDetailsByQuoteId, setRouteHotelDetailsByQuoteId] = useState<Record<string, ItineraryHotelDetailsResponse | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageLoaderStage, setPageLoaderStage] = useState("Building itinerary details");
  const [pageLoaderDetail, setPageLoaderDetail] = useState(PAGE_LOADER_STAGE_DETAILS["Building itinerary details"]);
  const [pageLoaderHistory, setPageLoaderHistory] = useState<string[]>(["Building itinerary details"]);
  const [pageReady, setPageReady] = useState(false);
  const [sourcePreviewOpen, setSourcePreviewOpen] = useState(false);
  const [sourcePreviewLoading, setSourcePreviewLoading] = useState(false);
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(null);
  const [sourcePreviewMarkdown, setSourcePreviewMarkdown] = useState("");
  const [sourcePreviewHeading, setSourcePreviewHeading] = useState("");
  const [vehicleBuildStatus, setVehicleBuildStatus] = useState<"PENDING" | "PROCESSING" | "READY" | "FAILED">("PENDING");
  const [vehicleBuildError, setVehicleBuildError] = useState<string | null>(null);
  const [activeRouteQuoteId, setActiveRouteQuoteId] = useState<string | null>(null);
  const [isSwitchingRouteOption, setIsSwitchingRouteOption] = useState(false);
  const [latestRouteOptions, setLatestRouteOptions] = useState<ItineraryPlanRouteOption[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(`itinerary-route-options:${quoteId}`);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) return [];
      return parsed.map((option, index: number) => ({
        quoteId: String(option?.quoteId || option?.routeQuoteId || option?.quotationNo || option?.quotation_no || option?.itinerary_quote_ID || option?.itinerary_quote_id || option?.quote_id || "").trim(),
        label: option?.label || option?.routeName || `Route ${index + 1}`,
      })).filter((option) => option.quoteId && option.quoteId.startsWith("DVI"));
    } catch {
      return [];
    }
  });

  const itineraryDaysCountRef = useRef(0);
  const routeHotelFetchPromisesRef = useRef<Map<string, Promise<ItineraryHotelDetailsResponse | null>>>(new Map());
  const routeHotelPrefetchedRef = useRef<Set<string>>(new Set());
  const routeHotelFamilyKeyRef = useRef("");
  const fetchCompleteHotelDetailsRef = useRef<((currentQuoteId: string) => Promise<ItineraryHotelDetailsResponse>) | null>(null);

  return {
    itinerary, setItinerary, hotelDetails, setHotelDetails, routeHotelDetailsByQuoteId, setRouteHotelDetailsByQuoteId,
    loading, setLoading, error, setError, pageLoaderStage, setPageLoaderStage, pageLoaderDetail, setPageLoaderDetail,
    pageLoaderHistory, setPageLoaderHistory, pageReady, setPageReady, sourcePreviewOpen, setSourcePreviewOpen,
    sourcePreviewLoading, setSourcePreviewLoading, sourcePreviewError, setSourcePreviewError, sourcePreviewMarkdown,
    setSourcePreviewMarkdown, sourcePreviewHeading, setSourcePreviewHeading, vehicleBuildStatus, setVehicleBuildStatus,
    vehicleBuildError, setVehicleBuildError, activeRouteQuoteId, setActiveRouteQuoteId, isSwitchingRouteOption,
    setIsSwitchingRouteOption, latestRouteOptions, setLatestRouteOptions, itineraryDaysCountRef,
    routeHotelFetchPromisesRef, routeHotelPrefetchedRef, routeHotelFamilyKeyRef, fetchCompleteHotelDetailsRef,
  };
}
