
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
  
  
  // Payment states
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { openCheckout } = useRazorpayCheckout();

  const token = localStorage.getItem("accessToken");
  const user = token ? parseJwt(token) : null;
  const isAgent = user?.role === 4;
  const isAccounts = user?.role === 6;
  const isVendor = user?.role === 2;
  const isTravelExpert = (user?.role === 3 || user?.role === 8 || (user?.staffId && user.staffId > 0)) && !isAgent && !isAccounts;
  const isGuide = user?.role === 5 || (user?.guideId && user.guideId > 0);

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
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  if (isAgent) {
    const agentData = dashboardData as AgentDashboardStats;
    return (
      <div className="p-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
              Welcome back, Agent 👋
            </h3>
            <p className="text-muted-foreground">
              Here's what's happening with your account today.
            </p>
          </div>
          <Button 
            onClick={() => setIsTopUpModalOpen(true)}
            className="bg-gradient-to-r from-primary to-pink-500 hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" /> Top Up Wallet
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Customers */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Customers</p>
                <p className="text-3xl font-bold text-purple-600">{agentData.totalCustomers}</p>
              </div>
            </div>
          </Card>

          {/* Validity Ends */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Validity Ends</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-blue-600">
                    {agentData.validityEnds ? new Date(agentData.validityEnds).toLocaleDateString() : 'N/A'}
                  </p>
                  {agentData.validityEnds && new Date(agentData.validityEnds) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                    <Button 
                      variant="link" 
                      className="text-xs text-blue-600 p-0 h-auto"
                      onClick={() => agentData.planId && handleRenew(agentData.planId)}
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? "Processing..." : "Renew"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Paid Invoice */}
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Paid Invoice</p>
                <p className="text-3xl font-bold text-orange-600">{agentData.paidInvoices}</p>
              </div>
            </div>
          </Card>

          {/* Last Month Profit */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Month Profit</p>
                <p className="text-3xl font-bold text-green-600">₹{agentData.lastMonthProfit}</p>
              </div>
            </div>
          </Card>

          {/* Wallet Balance */}
          <Card className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Wallet className="h-6 w-6 text-pink-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-pink-600">₹{agentData.totalCashWallet}</p>
                  <Link 
                    to="/wallet-history" 
                    className="text-xs text-pink-600 hover:underline font-medium"
                  >
                    View History
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Up Modal */}
        <Dialog open={isTopUpModalOpen} onOpenChange={setIsTopUpModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Top Up Wallet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  placeholder="Enter amount"
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  min="1"
                  step="0.01"
                />
                <p className="text-sm text-muted-foreground">
                  Gateway fees/tax can vary by payment method and will be shown by Razorpay at checkout.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTopUpModalOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleTopUp} 
                disabled={isProcessingPayment}
                className="bg-gradient-to-r from-primary to-pink-500"
              >
                {isProcessingPayment ? "Processing..." : "Pay Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isTravelExpert) {
    const teData = dashboardData as any;
    return (
      <div className="p-8 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            Welcome back, Travel Expert 👋
          </h3>
          <p className="text-muted-foreground">
            Here's an overview of the agents and itineraries you're managing.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Managed Agents */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Managed Agents</p>
                <p className="text-3xl font-bold text-purple-600">{teData.totalAgents}</p>
              </div>
            </div>
          </Card>

          {/* Total Itineraries */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Itineraries</p>
                <p className="text-3xl font-bold text-blue-600">{teData.totalItineraries}</p>
              </div>
            </div>
          </Card>

          {/* Confirmed Bookings */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Confirmed Bookings</p>
                <p className="text-3xl font-bold text-green-600">{teData.confirmedBookings}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isGuide) {
    const guideData = dashboardData as any;
    return (
      <div className="p-8 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            Welcome back, Guide 👋
          </h3>
          <p className="text-muted-foreground">
            Here's an overview of your assignments.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Assignments */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Assignments</p>
                <p className="text-3xl font-bold text-purple-600">{guideData.totalAssignments}</p>
              </div>
            </div>
          </Card>

          {/* Completed Assignments */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{guideData.completedAssignments}</p>
              </div>
            </div>
          </Card>

          {/* Pending Assignments */}
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold text-orange-600">{guideData.pendingAssignments}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isAccounts) {
    const accountsData = dashboardData as AccountsDashboardStats;
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            Welcome back, Accounts 👋
          </h3>
          <p className="text-muted-foreground">
            Here's a financial overview of the system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Payable</p>
                <p className="text-2xl font-bold text-blue-600">₹{accountsData.totalPayable.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">₹{accountsData.totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
                <p className="text-2xl font-bold text-orange-600">₹{accountsData.totalBalance.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Payouts</p>
                <p className="text-2xl font-bold text-purple-600">{accountsData.pendingPayouts}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isVendor) {
    const vendorData = dashboardData as VendorDashboardStats;
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            Welcome back, Vendor 👋
          </h3>
          <p className="text-muted-foreground">
            Here's an overview of your vehicle assignments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Assignments</p>
                <p className="text-3xl font-bold text-purple-600">{vendorData.totalAssignments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{vendorData.completedAssignments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-none">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold text-orange-600">{vendorData.pendingAssignments}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const adminData = dashboardData as DashboardStats;

const confirmedTotalPages = Math.max(1, Math.ceil(confirmedTotal / confirmedEntries));
const confirmedStartEntry =
  confirmedTotal === 0 ? 0 : (confirmedPage - 1) * confirmedEntries + 1;
const confirmedEndEntry = Math.min(confirmedPage * confirmedEntries, confirmedTotal);

const agentWiseTotalPages = Math.max(1, Math.ceil(agentWiseTotal / agentWiseEntries));
const agentWiseStartEntry =
  agentWiseTotal === 0 ? 0 : (agentWisePage - 1) * agentWiseEntries + 1;
const agentWiseEndEntry = Math.min(agentWisePage * agentWiseEntries, agentWiseTotal);

const liveVehicleTotalPages = Math.max(1, Math.ceil(liveVehicleTotal / liveVehicleEntries));
const liveVehicleStartEntry =
  liveVehicleTotal === 0 ? 0 : (liveVehiclePage - 1) * liveVehicleEntries + 1;
const liveVehicleEndEntry = Math.min(liveVehiclePage * liveVehicleEntries, liveVehicleTotal);

return (
    <div className="p-8 space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
          Welcome back, Admin HII👋
        </h3>
        <p className="text-muted-foreground">
          Your progress this week is Awesome. Let's keep it up and get a lot of points reward!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Agents */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-none">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Agents</p>
              <p className="text-3xl font-bold text-purple-600">{adminData.stats.totalAgents}</p>
            </div>
          </div>
        </Card>

        {/* Total Driver */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-none">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Driver</p>
              <p className="text-3xl font-bold text-blue-600">{adminData.stats.totalDrivers}</p>
            </div>
          </div>
        </Card>

        {/* Total Guide */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-none">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <UserSquare2 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Guide</p>
              <p className="text-3xl font-bold text-orange-600">{adminData.stats.totalGuides}</p>
            </div>
          </div>
        </Card>
      </div>
      {/* ... rest of the admin dashboard ... */}


      {/* Profit Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last Month Profit */}
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Last Month Profit</p>
            <p className="text-xs text-muted-foreground">October 2025</p>
            <p className="text-3xl font-bold">₹ {adminData.profit.lastMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </Card>

        {/* Current Month Profit */}
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Current Month Profit</p>
            <p className="text-xs text-muted-foreground">November 2025</p>
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold">₹ {adminData.profit.currentMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                adminData.profit.percentageChange >= 0 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-red-600 bg-red-50'
              }`}>
                <TrendingDown className="h-3 w-3" />
                {Math.abs(adminData.profit.percentageChange).toFixed(2)}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Itineraries */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold mb-1">{adminData.stats.totalItineraries}</p>
              <p className="text-sm text-muted-foreground">Total Itineraries</p>
            </div>
            <div className="text-6xl">🧳</div>
          </div>
        </Card>

        {/* Total Revenue */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold mb-1">₹ {adminData.stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <div className="text-6xl">💰</div>
          </div>
        </Card>

        {/* Overview Carousel */}
        <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none row-span-2 relative overflow-hidden">
          {/* Dot indicators */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  current === index ? "bg-white w-4" : "bg-white/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 5000,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent>
              {/* Slide 1: Vehicle Overview */}
              <CarouselItem>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Vehicle Overview</h3>
                    <p className="text-sm text-white/90">Insights into Fleet Performance</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.vehicles.total}</p>
                      <p className="text-xs text-white/90">Total Vehicles</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.vehicles.onRoute}</p>
                      <p className="text-xs text-white/90">On Route Vehicles</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.vehicles.available}</p>
                      <p className="text-xs text-white/90">Available Vehicles</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.vehicles.upcoming}</p>
                      <p className="text-xs text-white/90">Upcoming Vehicles</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="text-8xl opacity-30">🚗</div>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 2: Vendor Overview */}
              <CarouselItem>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Vendor Overview</h3>
                    <p className="text-sm text-white/90">Vendor into Hotel Performance</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.vendors.total}</p>
                      <p className="text-xs text-white/90">Total Vendors</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.vendors.branches}</p>
                      <p className="text-xs text-white/90">Total Branches</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.vendors.inactive}</p>
                      <p className="text-xs text-white/90">In Active Vendors</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="text-8xl opacity-30">🏪</div>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 3: Driver Overview */}
              <CarouselItem>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Driver Overview</h3>
                    <p className="text-sm text-white/90">Driver Performance Overview</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.drivers.active}</p>
                      <p className="text-xs text-white/90">Active Drivers</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.drivers.onRoute}</p>
                      <p className="text-xs text-white/90">On Route Drivers</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.drivers.inactive}</p>
                      <p className="text-xs text-white/90">In-active Drivers</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.drivers.available}</p>
                      <p className="text-xs text-white/90">Available Drivers</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="text-8xl opacity-30">🚘</div>
                  </div>
                </div>
              </CarouselItem>

              {/* Slide 4: Hotel Overview */}
              <CarouselItem>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Hotel Overview</h3>
                    <p className="text-sm text-white/90">Insights into Hotel Performance</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.hotels.total}</p>
                      <p className="text-xs text-white/90">Hotel Count</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.hotels.rooms}</p>
                      <p className="text-xs text-white/90">Room Count</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.hotels.amenities}</p>
                      <p className="text-xs text-white/90">Amenities Count</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{adminData.hotels.bookings}</p>
                      <p className="text-xs text-white/90">Total Bookings</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="text-8xl opacity-30">🏨</div>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </Card>

        {/* Total Confirm Bookings */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold mb-1">{adminData.stats.confirmedBookings}</p>
              <p className="text-sm text-muted-foreground">Total Confirm Bookings</p>
            </div>
            <div className="text-6xl">📅</div>
          </div>
        </Card>

        {/* Cancelled Booking */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold mb-1">{adminData.stats.cancelledBookings}</p>
              <p className="text-sm text-muted-foreground">Cancelled Booking</p>
            </div>
            <div className="text-6xl">📆</div>
          </div>
        </Card>
      </div>

            {/* Confirmed Itinerary List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-700">
          Confirmed Itinerary List
        </h2>

        <Card className="overflow-hidden border-none bg-white shadow-md">
          <div className="border-b border-gray-200">
  <div className="flex flex-wrap">
    {confirmedDashboardTabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        onClick={() => {
          setConfirmedActiveTab(tab.key);
          setConfirmedPage(1);
        }}
        className={`px-7 py-4 text-base font-medium border-b-2 transition-colors ${
          confirmedActiveTab === tab.key
            ? "text-pink-600 border-pink-600"
            : "text-gray-600 border-transparent hover:text-pink-600"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>

          <div className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-gray-600">
                <span>Show</span>
                <select
                  value={confirmedEntries}
                  onChange={(e) => {
                    setConfirmedEntries(Number(e.target.value));
                    setConfirmedPage(1);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-pink-500"
                >
                  {[5, 10, 25, 50].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="confirmed-search" className="text-gray-600">
                  Search:
                </label>
                <Input
                  id="confirmed-search"
                  value={confirmedSearch}
                  onChange={(e) => {
                    setConfirmedSearch(e.target.value);
                    setConfirmedPage(1);
                  }}
                  className="w-full md:w-[280px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      S.NO
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Quote ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Source
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Destination
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Start Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
  End Date
</th>
<th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
  Guest Name
</th>
                  </tr>
                </thead>

                <tbody>
                  {confirmedLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Loading confirmed itineraries...
                      </td>
                    </tr>
                  ) : confirmedItineraries.length > 0 ? (
                    confirmedItineraries.map((itinerary, index) => (
                      <tr
                    
  key={`${itinerary.itinerary_plan_ID}-${itinerary.booking_quote_id}`}
  className="border-b border-gray-100 hover:bg-slate-50"
>
  <td className="px-4 py-4 text-gray-700">
    {(confirmedPage - 1) * confirmedEntries + index + 1}
  </td>

  <td className="px-4 py-4">
    <Link
      to={`/itinerary-details/${encodeURIComponent(itinerary.booking_quote_id)}`}
      className="font-medium text-pink-600 hover:underline"
    >
      {itinerary.booking_quote_id}
    </Link>
  </td>

  <td className="px-4 py-4 text-gray-700">
    {itinerary.arrival_location || "-"}
  </td>

  <td className="px-4 py-4 text-gray-700">
    {itinerary.departure_location || "-"}
  </td>

  <td className="whitespace-nowrap px-4 py-4 text-gray-700">
    {formatDashboardDate(itinerary.arrival_date)}
  </td>

<td className="whitespace-nowrap px-4 py-4 text-gray-700">
  {formatDashboardDate(itinerary.departure_date)}
</td>

<td className="whitespace-nowrap px-4 py-4 text-gray-700">
  {itinerary.primary_customer_name || "-"}
</td>
</tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No confirmed itineraries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                Showing {confirmedStartEntry} to {confirmedEndEntry} of {confirmedTotal} entries
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={confirmedPage <= 1}
                  onClick={() => setConfirmedPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, confirmedTotalPages) }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={confirmedPage === pageNumber ? "default" : "secondary"}
                      onClick={() => setConfirmedPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                {confirmedTotalPages > 5 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <Button
                      type="button"
                      variant={confirmedPage === confirmedTotalPages ? "default" : "secondary"}
                      onClick={() => setConfirmedPage(confirmedTotalPages)}
                    >
                      {confirmedTotalPages}
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={confirmedPage >= confirmedTotalPages}
                  onClick={() =>
                    setConfirmedPage((prev) => Math.min(confirmedTotalPages, prev + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
                </Card>
      </div>

      {/* Agents wise Confirmed Itinerary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-700">
          Agents wise Confirmed Itinerary
        </h2>

        <Card className="overflow-hidden border-none bg-white shadow-md">
          <div className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-gray-600">
                <span>Show</span>

                <select
                  value={agentWiseEntries}
                  onChange={(e) => {
                    setAgentWiseEntries(Number(e.target.value));
                    setAgentWisePage(1);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-pink-500"
                >
                  {[5, 10, 25, 50].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>

                <span>entries</span>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="agent-wise-confirmed-search" className="text-gray-600">
                  Search:
                </label>

                <Input
                  id="agent-wise-confirmed-search"
                  value={agentWiseSearch}
                  onChange={(e) => {
                    setAgentWiseSearch(e.target.value);
                    setAgentWisePage(1);
                  }}
                  className="w-full md:w-[280px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      S.NO
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Quote ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Agent
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Source
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Destination
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Start Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      End Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Guest Name
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {agentWiseLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Loading agents wise confirmed itineraries...
                      </td>
                    </tr>
                  ) : agentWiseItineraries.length > 0 ? (
                    agentWiseItineraries.map((itinerary, index) => (
                      <tr
                        key={`agent-wise-${itinerary.itinerary_plan_ID}-${itinerary.booking_quote_id}`}
                        className="border-b border-gray-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 text-gray-700">
                          {(agentWisePage - 1) * agentWiseEntries + index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            to={`/itinerary-details/${encodeURIComponent(itinerary.booking_quote_id)}`}
                            className="font-medium text-pink-600 hover:underline"
                          >
                            {itinerary.booking_quote_id}
                          </Link>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {itinerary.agent_name || "-"}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {itinerary.arrival_location || "-"}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {itinerary.departure_location || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {formatDashboardDate(itinerary.arrival_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {formatDashboardDate(itinerary.departure_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {itinerary.primary_customer_name || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No agents wise confirmed itineraries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                Showing {agentWiseStartEntry} to {agentWiseEndEntry} of {agentWiseTotal} entries
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={agentWisePage <= 1}
                  onClick={() => setAgentWisePage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, agentWiseTotalPages) }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={agentWisePage === pageNumber ? "default" : "secondary"}
                      onClick={() => setAgentWisePage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                {agentWiseTotalPages > 5 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <Button
                      type="button"
                      variant={agentWisePage === agentWiseTotalPages ? "default" : "secondary"}
                      onClick={() => setAgentWisePage(agentWiseTotalPages)}
                    >
                      {agentWiseTotalPages}
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={agentWisePage >= agentWiseTotalPages}
                  onClick={() =>
                    setAgentWisePage((prev) => Math.min(agentWiseTotalPages, prev + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Moment and Star Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Moment */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Daily Moment</h3>
            <input 
              type="date" 
              defaultValue="2025-11-01"
              className="px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-3">
            {adminData.dailyMoment.length > 0 ? (
              adminData.dailyMoment.map((moment, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer">
                  <Truck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary">{moment.quoteId}</p>
                    <p className="text-sm text-muted-foreground">{moment.location}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No itineraries for today</p>
            )}
          </div>
        </Card>

        {/* Star Performers */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold mb-1">Star Performers</h3>
            <p className="text-sm text-muted-foreground">
              Top-Rated Agents, Travel Expert, Guides and Vendors
            </p>
          </div>
          
          <div className="flex gap-2 mb-4 border-b border-border">
            <button className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary">
              Agents
            </button>
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Travel Expert
            </button>
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Guides
            </button>
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Vendors
            </button>
          </div>

          {adminData.starPerformer ? (
            <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium">{adminData.starPerformer.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{adminData.starPerformer.name}</p>
                <p className="text-sm text-muted-foreground">{adminData.starPerformer.phone}</p>
              </div>
              <div className="flex items-center gap-1 text-green-600 font-medium">
                <span className="text-lg">▲</span>
                <span>{adminData.starPerformer.performance}%</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No performer data available</p>
          )}
                </Card>
      </div>

      {/* Live Vehicle Status */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-700">
          Live Vehicle Status
        </h2>

        <Card className="overflow-hidden border-none bg-white shadow-md">
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap">
              {liveVehicleStatusTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setLiveVehicleActiveTab(tab.key);
                    setLiveVehiclePage(1);
                  }}
                  className={`px-7 py-4 text-base font-medium border-b-2 transition-colors ${
                    liveVehicleActiveTab === tab.key
                      ? "text-pink-600 border-pink-600"
                      : "text-gray-600 border-transparent hover:text-pink-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-gray-600">
                <span>Show</span>

                <select
                  value={liveVehicleEntries}
                  onChange={(e) => {
                    setLiveVehicleEntries(Number(e.target.value));
                    setLiveVehiclePage(1);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-pink-500"
                >
                  {[5, 10, 25, 50].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>

                <span>entries</span>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="live-vehicle-search" className="text-gray-600">
                  Search:
                </label>

                <Input
                  id="live-vehicle-search"
                  value={liveVehicleSearch}
                  onChange={(e) => {
                    setLiveVehicleSearch(e.target.value);
                    setLiveVehiclePage(1);
                  }}
                  className="w-full md:w-[280px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      S.NO
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Booking ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Start Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      End Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Vendor
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Branch
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Vehicle
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Driver
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-left text-sm font-semibold uppercase tracking-widest text-gray-600">
                      Driver No
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {liveVehicleLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        Loading live vehicle status...
                      </td>
                    </tr>
                  ) : liveVehicleRows.length > 0 ? (
                    liveVehicleRows.map((row, index) => (
                      <tr
                        key={`${liveVehicleActiveTab}-${row.booking_id}-${index}`}
                        className="border-b border-gray-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 text-gray-700">
                          {(liveVehiclePage - 1) * liveVehicleEntries + index + 1}
                        </td>

                        <td className="px-4 py-4">
                          {row.booking_id && row.booking_id !== "-" ? (
                            <Link
                              to={`/itinerary-details/${encodeURIComponent(row.booking_id)}`}
                              className="font-medium text-pink-600 hover:underline"
                            >
                              {row.booking_id}
                            </Link>
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {formatDashboardDate(row.start_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {formatDashboardDate(row.end_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.vendor_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.branch_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.vehicle_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.driver_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                          {row.driver_no || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        No data available in table
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                Showing {liveVehicleStartEntry} to {liveVehicleEndEntry} of {liveVehicleTotal} entries
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={liveVehiclePage <= 1}
                  onClick={() => setLiveVehiclePage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, liveVehicleTotalPages) }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <Button
                      key={pageNumber}
                      type="button"
                      variant={liveVehiclePage === pageNumber ? "default" : "secondary"}
                      onClick={() => setLiveVehiclePage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}

                {liveVehicleTotalPages > 5 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <Button
                      type="button"
                      variant={liveVehiclePage === liveVehicleTotalPages ? "default" : "secondary"}
                      onClick={() => setLiveVehiclePage(liveVehicleTotalPages)}
                    >
                      {liveVehicleTotalPages}
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={liveVehiclePage >= liveVehicleTotalPages}
                  onClick={() =>
                    setLiveVehiclePage((prev) => Math.min(liveVehicleTotalPages, prev + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
                </Card>
      </div>

      {/* Most Visited Hotels */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <Card className="border-none bg-white p-7 shadow-md">
    <div className="mb-11 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold leading-tight text-slate-700">
          Most Visited Hotels
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Top 5 Picks by Visitors
        </p>
      </div>

      <Input
        type="number"
        value={mostVisitedHotelsYear}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (Number.isFinite(value)) {
            setMostVisitedHotelsYear(value);
          }
        }}
        className="h-12 w-full rounded-lg border-gray-200 text-base sm:w-[220px]"
      />
    </div>

    <div className="space-y-6">
      {mostVisitedHotelsLoading ? (
        <p className="py-12 text-center text-gray-500">
          Loading most visited hotels...
        </p>
      ) : mostVisitedHotels.length > 0 ? (
        mostVisitedHotels.map((hotel, index) => {
          const percentage = Math.max(
            0,
            Math.min(100, Number(hotel.visit_percentage || 0))
          );

          return (
<div
  key={`${hotel.hotel_name}-${hotel.hotel_location}-${index}`}
  className="grid grid-cols-[42px_minmax(0,1fr)_minmax(120px,180px)_42px] items-center gap-4"
>
              <div className="flex h-10 w-10 items-center justify-center rounded-md text-3xl leading-none">
                🏨
              </div>

              <div className="min-w-0">
                <p
                  className={`truncate text-base font-semibold uppercase text-slate-600 ${
                    index === 0 && (!hotel.hotel_name || hotel.hotel_name === "-")
                      ? "opacity-0"
                      : ""
                  }`}
                >
                  {hotel.hotel_name || "-"}
                </p>
                <p
                  className={`truncate text-sm text-gray-400 ${
                    index === 0 && (!hotel.hotel_location || hotel.hotel_location === "-")
                      ? "opacity-0"
                      : ""
                  }`}
                >
                  {hotel.hotel_location || "-"}
                </p>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
  <div
    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
    style={{ width: `${percentage}%` }}
  />
</div>

              <p className="text-right text-base text-gray-400">
                {percentage}%
              </p>
            </div>
          );
        })
      ) : (
        <p className="py-12 text-center text-gray-500">
          No hotel visit data available
        </p>
      )}
    </div>
  </Card>
</div>
</div>
  );
}
