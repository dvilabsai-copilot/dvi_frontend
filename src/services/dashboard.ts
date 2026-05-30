import { api } from "@/lib/api";

export interface AgentDashboardStats {
  totalCustomers: number;
  paidInvoices: number;
  validityEnds: string | null;
  planId: number | null;
  staffCount: number;
  lastMonthProfit: number;
  totalCashWallet: number;
}

export interface AccountsDashboardStats {
  totalPayable: number;
  totalPaid: number;
  totalBalance: number;
  pendingPayouts: number;
}

export interface VendorDashboardStats {
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
}

export interface DashboardStats {
  stats: {
    totalAgents: number;
    totalDrivers: number;
    totalGuides: number;
    totalItineraries: number;
    totalRevenue: number;
    confirmedBookings: number;
    cancelledBookings: number;
  };
  profit: {
    lastMonth: number;
    currentMonth: number;
    percentageChange: number;
  };
  vehicles: {
    total: number;
    onRoute: number;
    available: number;
    upcoming: number;
  };
  vendors: {
    total: number;
    branches: number;
    inactive: number;
  };
  drivers: {
    total: number;
    active: number;
    inactive: number;
    onRoute: number;
    available: number;
  };
  hotels: {
    total: number;
    rooms: number;
    amenities: number;
    bookings: number;
  };
  dailyMoment: Array<{
    quoteId: string;
    location: string;
  }>;
  starPerformer: {
    name: string;
    phone: string;
    performance: number;
  } | null;
}

export interface MostVisitedHotelRow {
  hotel_name: string;
  hotel_location: string;
  visit_count: number;
  visit_percentage: number;
}

export const DashboardService = {
  async getStats(): Promise<DashboardStats | AgentDashboardStats> {
    return api('dashboard/stats', {
      method: 'GET',
    });
  },


async getMostVisitedHotels(year: number): Promise<MostVisitedHotelRow[]> {
    const queryParams = new URLSearchParams();

    queryParams.set("year", String(year));
    queryParams.set("limit", "5");

    const response: any = await api(`dashboard/most-visited-hotels?${queryParams.toString()}`, {
      method: "GET",
    });

    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.rows)) return response.rows;

    return [];
  },
};