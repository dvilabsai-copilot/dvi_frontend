import { useRef, useState } from "react";

export function useHotelWorkflowState() {
  const [hotelSelectionModal, setHotelSelectionModal] = useState<any>({ open: false, planId: null, routeId: null, routeDate: "" });
  const [hotelSearchChildAges, setHotelSearchChildAges] = useState<string[]>([]);
  const [isResolvingArrivalPolicy, setIsResolvingArrivalPolicy] = useState(false);
  const [latestArrivalPolicy, setLatestArrivalPolicy] = useState<any | null>(null);
  const [pendingRouteTimeUpdate, setPendingRouteTimeUpdate] = useState<any | null>(null);
  const [lastArrivalPolicyDecisionKey, setLastArrivalPolicyDecisionKey] = useState<string | null>(null);
  const [arrivalPolicyConfirmModal, setArrivalPolicyConfirmModal] = useState<any>({ open: false, arrivalDate: "", previousDayDate: "", request: null });
  const [roomSelectionModal, setRoomSelectionModal] = useState<any | null>(null);
  const [availableHotels, setAvailableHotels] = useState<any[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [isRebuildingHotels, setIsRebuildingHotels] = useState(false);
  const [isApplyingRouteTimeUpdate, setIsApplyingRouteTimeUpdate] = useState(false);
  const [routeTimeProgressPercent, setRouteTimeProgressPercent] = useState(0);
  const [routeTimeEstimatedMs, setRouteTimeEstimatedMs] = useState(0);
  const [routeProgressTitle, setRouteProgressTitle] = useState("Updating itinerary");
  const [routeProgressDetail, setRouteProgressDetail] = useState("Preparing the next step.");
  const [routeProgressHistory, setRouteProgressHistory] = useState<string[]>([]);
  const [pendingScrollDayNumber, setPendingScrollDayNumber] = useState<number | null>(null);
  const routeTimeProgressTimerRef = useRef<number | null>(null);
  const [isSelectingHotel, setIsSelectingHotel] = useState(false);
  const [hotelSearchQuery, setHotelSearchQuery] = useState("");
  const [selectedMealPlan, setSelectedMealPlan] = useState({ all: false, breakfast: false, lunch: false, dinner: false });

  return {
    hotelSelectionModal, setHotelSelectionModal, hotelSearchChildAges, setHotelSearchChildAges,
    isResolvingArrivalPolicy, setIsResolvingArrivalPolicy, latestArrivalPolicy, setLatestArrivalPolicy,
    pendingRouteTimeUpdate, setPendingRouteTimeUpdate, lastArrivalPolicyDecisionKey, setLastArrivalPolicyDecisionKey,
    arrivalPolicyConfirmModal, setArrivalPolicyConfirmModal, roomSelectionModal, setRoomSelectionModal,
    availableHotels, setAvailableHotels, loadingHotels, setLoadingHotels, isRebuildingHotels, setIsRebuildingHotels,
    isApplyingRouteTimeUpdate, setIsApplyingRouteTimeUpdate, routeTimeProgressPercent, setRouteTimeProgressPercent,
    routeTimeEstimatedMs, setRouteTimeEstimatedMs, routeProgressTitle, setRouteProgressTitle,
    routeProgressDetail, setRouteProgressDetail, routeProgressHistory, setRouteProgressHistory,
    pendingScrollDayNumber, setPendingScrollDayNumber, routeTimeProgressTimerRef,
    isSelectingHotel, setIsSelectingHotel, hotelSearchQuery, setHotelSearchQuery, selectedMealPlan, setSelectedMealPlan,
  };
}
