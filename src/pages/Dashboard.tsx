/* eslint-disable @typescript-eslint/no-explicit-any */
import { Users, Car, UserSquare2, TrendingDown, Calendar, Truck, Hotel, Building2, Wallet, FileText, UserCheck, Plus, CheckCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { Link, useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { useState, useEffect } from "react";
import {
  DashboardService,
  DashboardStats,
  AgentDashboardStats,
  AccountsDashboardStats,
  VendorDashboardStats,
  MostVisitedHotelRow,
} from "@/services/dashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paymentService } from "@/services/paymentService";
import { ItineraryService } from "@/services/itinerary";
import { fetchVehicleAvailability } from "@/services/vehicle-availability";
import { toast } from "sonner";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { ChevronRight, ChevronDown, MapPin, CheckCircle2 } from "lucide-react";

import { DashboardRoleViews } from "./dashboard/DashboardRoleViews";
import { DashboardAdminView } from "./dashboard/DashboardAdminView";
function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

type ConfirmedDashboardTab = "overall" | "upcoming" | "ongoing" | "cancellation";

type ConfirmedDashboardItinerary = {
  itinerary_plan_ID: number;
  booking_quote_id: string;
  agent_name: string;
  arrival_location: string;
  departure_location: string;
  arrival_date: string;
  departure_date: string;
  primary_customer_name: string;
};

const confirmedDashboardTabs: { key: ConfirmedDashboardTab; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "cancellation", label: "Cancellation" },
];

type LiveVehicleStatusTab = "onRoute" | "upcoming" | "idle" | "inService";

type LiveVehicleStatusRow = {
  booking_id: string;
  start_date: string;
  end_date: string;
  vendor_name: string;
  branch_name: string;
  vehicle_name: string;
  driver_name: string;
  driver_no: string;
};

const liveVehicleStatusTabs: { key: LiveVehicleStatusTab; label: string }[] = [
  { key: "onRoute", label: "On Route Vehicle" },
  { key: "upcoming", label: "Upcoming Vehicle" },
  { key: "idle", label: "Idle Vehicle" },
  { key: "inService", label: "In Service Vehicle" },
];

const toDashboardYmd = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const normalizeLiveVehicleStatusRow = (row: any): LiveVehicleStatusRow => {
  return {
    booking_id: String(
      row.booking_id ||
      row.booking_quote_id ||
      row.quote_id ||
      row.quoteId ||
      row.itineraryQuoteId ||
      "-"
    ),
    start_date: String(row.start_date || row.arrival_date || row.startDate || ""),
    end_date: String(row.end_date || row.departure_date || row.endDate || ""),
    vendor_name: String(row.vendor_name || row.vendor || row.vendorName || "-"),
    branch_name: String(row.branch_name || row.vendor_branch || row.vendorBranch || "-"),
    vehicle_name: String(
      row.vehicle_name ||
      row.vehicle_no ||
      row.vehicleNo ||
      row.registration_number ||
      row.registrationNumber ||
      row.vehicle_type_title ||
      row.vehicleTypeTitle ||
      "-"
    ),
    driver_name: String(row.driver_name || row.driverName || "-"),
    driver_no: String(row.driver_no || row.driver_mobile || row.driverMobile || row.driver_phone || "-"),
  };
};

const DASHBOARD_CONFIRMED_FETCH_LIMIT = 5000;

const normalizeMostVisitedHotel = (row: any): MostVisitedHotelRow => {
  return {
    hotel_name: String(
      row.hotel_name ||
      row.hotelName ||
      row.name ||
      row.hotel ||
      "-"
    ),
    hotel_location: String(
      row.hotel_location ||
      row.location ||
      row.place ||
      row.city ||
      "-"
    ),
    visit_count: Number(
      row.visit_count ||
      row.visitCount ||
      row.total_visits ||
      row.totalVisits ||
      row.count ||
      0
    ),
    visit_percentage: Number(
      row.visit_percentage ||
      row.visitPercentage ||
      row.percentage ||
      row.percent ||
      0
    ),
  };
};

const isLiveVehicleOnRoute = (row: LiveVehicleStatusRow) => {
  const startDate = getDateOnly(row.start_date);
  const endDate = getDateOnly(row.end_date);

  if (!startDate || !endDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return startDate <= today && endDate >= today;
};

const isLiveVehicleUpcoming = (row: LiveVehicleStatusRow) => {
  const startDate = getDateOnly(row.start_date);
  if (!startDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return startDate > today;
};

const hasLiveVehicleAssignment = (row: LiveVehicleStatusRow) => {
  return (
    row.vendor_name !== "-" ||
    row.vehicle_name !== "-" ||
    row.driver_name !== "-" ||
    row.driver_no !== "-"
  );
};


const formatDashboardDate = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getDateOnly = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date;
};

const isUpcomingDashboardItinerary = (row: ConfirmedDashboardItinerary) => {
  const startDate = getDateOnly(row.arrival_date);
  if (!startDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return startDate > today;
};

const isOngoingDashboardItinerary = (row: ConfirmedDashboardItinerary) => {
  const startDate = getDateOnly(row.arrival_date);
  const endDate = getDateOnly(row.departure_date);

  if (!startDate || !endDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return startDate <= today && endDate >= today;
};

const normalizeConfirmedItinerary = (row: any): ConfirmedDashboardItinerary => {
  return {
    itinerary_plan_ID: Number(row.itinerary_plan_ID || row.confirmed_itinerary_plan_ID || row.id || 0),
    booking_quote_id: String(row.booking_quote_id || row.quote_id || row.quoteId || "-"),
    agent_name: String(row.agent_name || row.agentName || row.created_by_name || "-"),
    arrival_location: String(row.arrival_location || row.source || row.source_location || "-"),
    departure_location: String(row.departure_location || row.destination || row.destination_location || "-"),
    arrival_date: String(row.arrival_date || row.start_date || row.startDate || ""),
    departure_date: String(row.departure_date || row.end_date || row.endDate || ""),
    primary_customer_name: String(
      row.primary_customer_name ||
      row.guest_name ||
      row.customer_name ||
      row.customerName ||
      row.guestName ||
      "-"
    ),
  };
};

const extractHotelNamesFromConfirmedRow = (row: any): { hotel_name: string; hotel_location: string }[] => {
  const hotels: { hotel_name: string; hotel_location: string }[] = [];

  const pushHotel = (name: any, location: any) => {
    const hotelName = String(name || "").trim();
    if (!hotelName || hotelName === "-") return;

    hotels.push({
      hotel_name: hotelName,
      hotel_location: String(location || row.arrival_location || row.destination || row.departure_location || "-"),
    });
  };

  pushHotel(row.hotel_name, row.hotel_location);
  pushHotel(row.selected_hotel_name, row.selected_hotel_location);
  pushHotel(row.recommended_hotel_name, row.recommended_hotel_location);

  if (Array.isArray(row.hotels)) {
    row.hotels.forEach((hotel: any) => {
      pushHotel(
        hotel.hotel_name || hotel.name || hotel.title,
        hotel.hotel_location || hotel.location || hotel.city || hotel.place
      );
    });
  }

  if (Array.isArray(row.recommended_hotels)) {
    row.recommended_hotels.forEach((hotel: any) => {
      pushHotel(
        hotel.hotel_name || hotel.name || hotel.title,
        hotel.hotel_location || hotel.location || hotel.city || hotel.place
      );
    });
  }

  return hotels;
};

const buildMostVisitedHotelsFromConfirmedRows = (rows: any[]): MostVisitedHotelRow[] => {
  const hotelMap = new Map<string, MostVisitedHotelRow>();

  rows.forEach((row) => {
    extractHotelNamesFromConfirmedRow(row).forEach((hotel) => {
      const key = `${hotel.hotel_name.toLowerCase()}__${hotel.hotel_location.toLowerCase()}`;
      const existing = hotelMap.get(key);

      if (existing) {
        existing.visit_count += 1;
      } else {
        hotelMap.set(key, {
          hotel_name: hotel.hotel_name,
          hotel_location: hotel.hotel_location,
          visit_count: 1,
          visit_percentage: 0,
        });
      }
    });
  });

  const sortedRows = Array.from(hotelMap.values())
    .sort((a, b) => b.visit_count - a.visit_count)
    .slice(0, 5);

  const totalVisits = sortedRows.reduce((sum, row) => sum + row.visit_count, 0);

  return sortedRows.map((row) => ({
    ...row,
    visit_percentage: totalVisits > 0 ? Math.round((row.visit_count / totalVisits) * 100) : 0,
  }));
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [dashboardData, setDashboardData] = useState<
  | DashboardStats
  | AgentDashboardStats
  | AccountsDashboardStats
  | VendorDashboardStats
  | null
>(null);
const [loading, setLoading] = useState(true);

const [confirmedItineraries, setConfirmedItineraries] = useState<ConfirmedDashboardItinerary[]>([]);
const [confirmedLoading, setConfirmedLoading] = useState(false);
const [confirmedSearch, setConfirmedSearch] = useState("");
const [confirmedEntries, setConfirmedEntries] = useState(5);
const [confirmedPage, setConfirmedPage] = useState(1);
const [confirmedTotal, setConfirmedTotal] = useState(0);
const [confirmedActiveTab, setConfirmedActiveTab] = useState<ConfirmedDashboardTab>("overall");

const [agentWiseItineraries, setAgentWiseItineraries] = useState<ConfirmedDashboardItinerary[]>([]);
const [agentWiseLoading, setAgentWiseLoading] = useState(false);
const [agentWiseSearch, setAgentWiseSearch] = useState("");
const [agentWiseEntries, setAgentWiseEntries] = useState(5);
const [agentWisePage, setAgentWisePage] = useState(1);
const [agentWiseTotal, setAgentWiseTotal] = useState(0);

const [liveVehicleRows, setLiveVehicleRows] = useState<LiveVehicleStatusRow[]>([]);
const [liveVehicleLoading, setLiveVehicleLoading] = useState(false);
const [liveVehicleSearch, setLiveVehicleSearch] = useState("");
const [liveVehicleEntries, setLiveVehicleEntries] = useState(5);
const [liveVehiclePage, setLiveVehiclePage] = useState(1);
const [liveVehicleTotal, setLiveVehicleTotal] = useState(0);
const [liveVehicleActiveTab, setLiveVehicleActiveTab] = useState<LiveVehicleStatusTab>("onRoute");

const [mostVisitedHotels, setMostVisitedHotels] = useState<MostVisitedHotelRow[]>([]);
const [mostVisitedHotelsLoading, setMostVisitedHotelsLoading] = useState(false);
const [mostVisitedHotelsYear, setMostVisitedHotelsYear] = useState(new Date().getFullYear());
const [starPerformerTab, setStarPerformerTab] = useState<
  "Agents" | "Travel Expert" | "Guides" | "Vendors"
>("Agents");

const [openDailyMomentQuote, setOpenDailyMomentQuote] = useState<string | null>(null);
  
  
  // Payment states
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { openCheckout } = useRazorpayCheckout();

  const token = localStorage.getItem("accessToken");
const user = token ? parseJwt(token) : null;

const role = Number(user?.role || 0);
const staffId = Number(user?.staffId || 0);
const guideId = Number(user?.guideId || 0);

const isAdmin = role === 1;
const isStaff = role === 3;
const isAgent = role === 4;
const isGuide = role === 5 || guideId > 0;
const isAccounts = role === 6;
const isVendor = role === 2;

// Staff role 3 must use the full Admin dashboard.
// Role 8 and other non-admin staff-linked users retain the Travel Expert view.
const isTravelExpert =
  !isAdmin &&
  !isStaff &&
  !isAgent &&
  !isAccounts &&
  !isVendor &&
  !isGuide &&
  (role === 8 || staffId > 0);

  const handleTopUp = async () => {
    if (!topUpAmount || isNaN(Number(topUpAmount)) || Number(topUpAmount) < 1) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsProcessingPayment(true);
      const order = await paymentService.createWalletTopupOrder(Number(topUpAmount));

      await openCheckout({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        name: "DVI Holidays",
        description: "Wallet Top Up",
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        onSuccess: async (response) => {
          await paymentService.confirmWalletTopup(response);
          setIsTopUpModalOpen(false);
          setTopUpAmount("");
          const data = await DashboardService.getStats();
          setDashboardData(data);
          navigate(`/payments/success?flow=wallet_topup&orderId=${encodeURIComponent(order.orderId)}`);
        },
        onFailure: (error) => {
          console.error("Payment confirmation failed:", error);
          toast.error("Payment verification failed. Please contact support.");
        },
        onDismiss: () => {
          toast.error("Payment cancelled");
        },
      });
    } catch (error) {
      console.error("Failed to initiate payment:", error);
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRenew = async (planId: number) => {
    try {
      setIsProcessingPayment(true);
      const order = await paymentService.createSubscriptionRenewalOrder(planId);

      await openCheckout({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        name: "DVI Holidays",
        description: "Subscription Renewal",
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        onSuccess: async (response) => {
          await paymentService.confirmSubscriptionRenewal(response);
          const data = await DashboardService.getStats();
          setDashboardData(data);
          navigate(`/payments/success?flow=subscription_renewal&orderId=${encodeURIComponent(order.orderId)}`);
        },
        onFailure: (error) => {
          console.error("Payment verification failed:", error);
          toast.error("Payment verification failed. Please contact support.");
        },
        onDismiss: () => {
          toast.error("Payment cancelled");
        },
      });
    } catch (error) {
      console.error("Failed to initiate renewal:", error);
      toast.error("Failed to initiate renewal. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await DashboardService.getStats();
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchDashboardData();
}, []);

useEffect(() => {
  if (isAgent || isAccounts || isVendor || isGuide) return;

  const fetchConfirmedItineraries = async () => {
    try {
      setConfirmedLoading(true);

      if (confirmedActiveTab === "cancellation") {
        const response = await ItineraryService.getCancelledItineraries({
          draw: 1,
          start: 0,
          length: DASHBOARD_CONFIRMED_FETCH_LIMIT,
          search_value: confirmedSearch.trim(),
        });

        const rows = Array.isArray(response?.data)
          ? response.data.map(normalizeConfirmedItinerary)
          : [];

        const pageRows = rows.slice(
          (confirmedPage - 1) * confirmedEntries,
          confirmedPage * confirmedEntries
        );

        setConfirmedItineraries(pageRows);
        setConfirmedTotal(rows.length);
        return;
      }

      const response = await ItineraryService.getConfirmedItineraries({
        draw: 1,
        start: 0,
        length: DASHBOARD_CONFIRMED_FETCH_LIMIT,
        search_value: confirmedSearch.trim(),
      });

      const rows = Array.isArray(response?.data)
        ? response.data.map(normalizeConfirmedItinerary)
        : [];

      const filteredRows = rows.filter((row) => {
        if (confirmedActiveTab === "upcoming") {
          return isUpcomingDashboardItinerary(row);
        }

        if (confirmedActiveTab === "ongoing") {
          return isOngoingDashboardItinerary(row);
        }

        return true;
      });

      const pageRows = filteredRows.slice(
        (confirmedPage - 1) * confirmedEntries,
        confirmedPage * confirmedEntries
      );

      setConfirmedItineraries(pageRows);
      setConfirmedTotal(filteredRows.length);
    } catch (error: any) {
      console.error("Failed to fetch confirmed itinerary list:", error);
      setConfirmedItineraries([]);
      setConfirmedTotal(0);
    } finally {
      setConfirmedLoading(false);
    }
  };

  fetchConfirmedItineraries();
}, [
  confirmedPage,
  confirmedEntries,
  confirmedSearch,
  confirmedActiveTab,
  isAgent,
  isAccounts,
  isVendor,
  isGuide,
]);

useEffect(() => {
  if (isAgent || isAccounts || isVendor || isGuide) return;

  const fetchAgentWiseConfirmedItineraries = async () => {
    try {
      setAgentWiseLoading(true);

      const start = (agentWisePage - 1) * agentWiseEntries;

      const response = await ItineraryService.getConfirmedItineraries({
        draw: agentWisePage,
        start,
        length: agentWiseEntries,
        search_value: agentWiseSearch.trim(),
      });

      const rows = Array.isArray(response?.data)
        ? response.data.map(normalizeConfirmedItinerary)
        : [];

      setAgentWiseItineraries(rows);
      setAgentWiseTotal(Number(response?.recordsFiltered || response?.recordsTotal || rows.length));
    } catch (error: any) {
      console.error("Failed to fetch agents wise confirmed itinerary list:", error);
      setAgentWiseItineraries([]);
      setAgentWiseTotal(0);
    } finally {
      setAgentWiseLoading(false);
    }
  };

  fetchAgentWiseConfirmedItineraries();
}, [
  agentWisePage,
  agentWiseEntries,
  agentWiseSearch,
  isAgent,
  isAccounts,
  isVendor,
  isGuide,
]);


useEffect(() => {
  if (isAgent || isAccounts || isVendor || isGuide) return;

  const fetchLiveVehicleStatus = async () => {
    try {
      setLiveVehicleLoading(true);

      if (liveVehicleActiveTab === "idle" || liveVehicleActiveTab === "inService") {
        const todayYmd = toDashboardYmd(new Date());

        const availability = await fetchVehicleAvailability({
          dateFrom: todayYmd,
          dateTo: todayYmd,
        });

        const availabilityRows = Array.isArray(availability?.rows) ? availability.rows : [];

        const mappedRows: LiveVehicleStatusRow[] = availabilityRows
          .map((vehicleRow: any) => {
            const todayCell = Array.isArray(vehicleRow.cells)
              ? vehicleRow.cells.find((cell: any) => cell.date === todayYmd)
              : null;

            return {
              booking_id: String(todayCell?.itineraryQuoteId || "-"),
              start_date: todayYmd,
              end_date: todayYmd,
              vendor_name: String(vehicleRow.vendorName || "-"),
              branch_name: "-",
              vehicle_name: String(
                vehicleRow.registrationNumber ||
                vehicleRow.vehicleTypeTitle ||
                "-"
              ),
              driver_name: todayCell?.driverId ? `Driver #${todayCell.driverId}` : "-",
              driver_no: "-",
              isWithinTrip: Boolean(todayCell?.isWithinTrip),
              isVehicleAssigned: Boolean(todayCell?.isVehicleAssigned),
              hasDriver: Boolean(todayCell?.hasDriver),
            } as LiveVehicleStatusRow & {
              isWithinTrip: boolean;
              isVehicleAssigned: boolean;
              hasDriver: boolean;
            };
          })
          .filter((row: any) => {
            if (liveVehicleActiveTab === "idle") {
              return !row.isWithinTrip && !row.isVehicleAssigned && !row.hasDriver;
            }

            return row.isWithinTrip || row.isVehicleAssigned || row.hasDriver;
          })
          .filter((row) => {
            const search = liveVehicleSearch.trim().toLowerCase();
            if (!search) return true;

            return Object.values(row).join(" ").toLowerCase().includes(search);
          });

        const pageRows = mappedRows.slice(
          (liveVehiclePage - 1) * liveVehicleEntries,
          liveVehiclePage * liveVehicleEntries
        );

        setLiveVehicleRows(pageRows);
        setLiveVehicleTotal(mappedRows.length);
        return;
      }

      const response = await ItineraryService.getConfirmedItineraries({
        draw: 1,
        start: 0,
        length: DASHBOARD_CONFIRMED_FETCH_LIMIT,
        search_value: liveVehicleSearch.trim(),
      });

      const rows = Array.isArray(response?.data)
        ? response.data.map(normalizeLiveVehicleStatusRow)
        : [];

      const filteredRows = rows.filter((row) => {
        if (liveVehicleActiveTab === "upcoming") {
          return isLiveVehicleUpcoming(row);
        }

        if (liveVehicleActiveTab === "onRoute") {
          return isLiveVehicleOnRoute(row);
        }

        return true;
      });

      const pageRows = filteredRows.slice(
        (liveVehiclePage - 1) * liveVehicleEntries,
        liveVehiclePage * liveVehicleEntries
      );

      setLiveVehicleRows(pageRows);
      setLiveVehicleTotal(filteredRows.length);
    } catch (error: any) {
      console.error("Failed to fetch live vehicle status:", error);
      setLiveVehicleRows([]);
      setLiveVehicleTotal(0);
    } finally {
      setLiveVehicleLoading(false);
    }
  };

  fetchLiveVehicleStatus();
}, [
  liveVehiclePage,
  liveVehicleEntries,
  liveVehicleSearch,
  liveVehicleActiveTab,
  isAgent,
  isAccounts,
  isVendor,
  isGuide,
]);


useEffect(() => {
  if (isAgent || isAccounts || isVendor || isGuide) return;

  const fetchMostVisitedHotels = async () => {
    try {
      setMostVisitedHotelsLoading(true);

      const rows = await DashboardService.getMostVisitedHotels(mostVisitedHotelsYear);

      setMostVisitedHotels(Array.isArray(rows) ? rows.slice(0, 5) : []);
    } catch (error) {
      console.error("Failed to fetch most visited hotels:", error);
      setMostVisitedHotels([]);
    } finally {
      setMostVisitedHotelsLoading(false);
    }
  };

  fetchMostVisitedHotels();
}, [mostVisitedHotelsYear, isAgent, isAccounts, isVendor, isGuide]);
  const dashboardViewContext = {
    dashboardData,
    loading,
    isAgent,
    isTravelExpert,
    isGuide,
    isAccounts,
    isVendor,
    isProcessingPayment,
    isTopUpModalOpen,
    setIsTopUpModalOpen,
    topUpAmount,
    setTopUpAmount,
    handleTopUp,
    handleRenew,
    navigate,
    api,
    setApi,
    current,
    confirmedItineraries,
    confirmedLoading,
    confirmedSearch,
    confirmedEntries,
    confirmedPage,
    confirmedTotal,
    confirmedActiveTab,
    agentWiseItineraries,
    agentWiseLoading,
    agentWiseSearch,
    agentWiseEntries,
    agentWisePage,
    agentWiseTotal,
    liveVehicleRows,
    liveVehicleLoading,
    liveVehicleSearch,
    liveVehicleEntries,
    liveVehiclePage,
    liveVehicleTotal,
    liveVehicleActiveTab,
    mostVisitedHotels,
    mostVisitedHotelsLoading,
    mostVisitedHotelsYear,
    starPerformerTab,
    openDailyMomentQuote,
    setConfirmedActiveTab,
    setConfirmedSearch,
    setConfirmedEntries,
    setConfirmedPage,
    setAgentWiseSearch,
    setAgentWiseEntries,
    setAgentWisePage,
    setLiveVehicleActiveTab,
    setLiveVehicleSearch,
    setLiveVehicleEntries,
    setLiveVehiclePage,
    setMostVisitedHotelsYear,
    setStarPerformerTab,
    setOpenDailyMomentQuote,
    confirmedDashboardTabs,
    liveVehicleStatusTabs,
    toDashboardYmd,
    formatDashboardDate,
  };
  const roleView = <DashboardRoleViews context={dashboardViewContext} />;
  if (loading || !dashboardData || isAgent || isTravelExpert || isGuide || isAccounts || isVendor) {
    return roleView;
  }

  const adminData = dashboardData as DashboardStats;

  const confirmedTotalPages = Math.max(1, Math.ceil(confirmedTotal / confirmedEntries));
  const confirmedStartEntry = confirmedTotal === 0 ? 0 : (confirmedPage - 1) * confirmedEntries + 1;
  const confirmedEndEntry = Math.min(confirmedPage * confirmedEntries, confirmedTotal);
  const agentWiseTotalPages = Math.max(1, Math.ceil(agentWiseTotal / agentWiseEntries));
  const agentWiseStartEntry = agentWiseTotal === 0 ? 0 : (agentWisePage - 1) * agentWiseEntries + 1;
  const agentWiseEndEntry = Math.min(agentWisePage * agentWiseEntries, agentWiseTotal);
  const liveVehicleTotalPages = Math.max(1, Math.ceil(liveVehicleTotal / liveVehicleEntries));
  const liveVehicleStartEntry = liveVehicleTotal === 0 ? 0 : (liveVehiclePage - 1) * liveVehicleEntries + 1;
  const liveVehicleEndEntry = Math.min(liveVehiclePage * liveVehicleEntries, liveVehicleTotal);
  const dailyMomentRows = adminData.dailyMoment.length > 0 ? adminData.dailyMoment : agentWiseItineraries.slice(0, 5).map((item) => ({ quoteId: item.booking_quote_id, location: isOngoingDashboardItinerary(item) ? "Ongoing" : "Arrival" }));
  const keepCurrentScroll = () => {
    const currentScrollY = window.scrollY;
    window.setTimeout(() => window.scrollTo({ top: currentScrollY, left: 0, behavior: "auto" }), 0);
  };
  return <DashboardAdminView context={{ ...dashboardViewContext, adminData, confirmedTotalPages, confirmedStartEntry, confirmedEndEntry, agentWiseTotalPages, agentWiseStartEntry, agentWiseEndEntry, liveVehicleTotalPages, liveVehicleStartEntry, liveVehicleEndEntry, dailyMomentRows, keepCurrentScroll }} />;

}
