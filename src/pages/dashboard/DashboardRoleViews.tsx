/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Users, Calendar, Wallet, FileText, UserCheck, Plus, CheckCircle, Clock, Car, Hotel, Building2, Truck, ChevronRight, ChevronDown, MapPin, CheckCircle2, TrendingDown, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmedDashboardTabs, liveVehicleStatusTabs } from "./dashboard.constants";
import type { AgentDashboardStats, AccountsDashboardStats, VendorDashboardStats, VehicleAgentDashboardStats } from "@/services/dashboard";

export function DashboardRoleViews({ context }: { context: Record<string, any> }) {
  const { dashboardData, loading, isAgent, isVehicleAgent, isTravelExpert, isGuide, isAccounts, isVendor, isProcessingPayment, isTopUpModalOpen, setIsTopUpModalOpen, topUpAmount, setTopUpAmount, handleTopUp, handleRenew } = context;

  const vendorNow = new Date();

  const vendorToday =
    `${vendorNow.getFullYear()}-` +
    `${String(vendorNow.getMonth() + 1).padStart(2, "0")}-` +
    `${String(vendorNow.getDate()).padStart(2, "0")}`;

  const [vendorOverview, setVendorOverview] =
    useState<"vehicle" | "driver">("vehicle");

  const [vendorLiveTab, setVendorLiveTab] =
    useState<"onRoute" | "upcoming" | "idle" | "inService">("onRoute");

  const [vendorLiveSearch, setVendorLiveSearch] = useState("");
  const [vendorLiveEntries, setVendorLiveEntries] = useState(5);
  const [vendorLivePage, setVendorLivePage] = useState(1);

  const [vendorDailyDate, setVendorDailyDate] =
    useState(vendorToday);

  const [vendorShowAllBranches, setVendorShowAllBranches] =
    useState(false);

  const [vendorFcSearch, setVendorFcSearch] = useState("");
  const [vendorFcEntries, setVendorFcEntries] = useState(5);
  const [vendorFcPage, setVendorFcPage] = useState(1);

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

  const formatAgentMoney = (value: number | string) => {
    const amount = Number(value || 0);

    return `\u20B9 ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
  <div className="min-h-[calc(100vh-88px)] w-full max-w-full overflow-x-hidden bg-gray-50/40 px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      {/* Welcome Section */}
      <div className="flex w-full flex-col gap-4 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h3 className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
            Welcome back, Agent
          </h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            Here's what's happening with your account today.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-pink-100 bg-pink-50/60 px-4 py-2.5 shadow-sm">
          <a
            href="tel:+919843288844"
            aria-label="Call Srinivas Vemuri"
            title="Call Srinivas Vemuri"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-105 hover:bg-pink-50"
          >
            <Phone className="h-4 w-4 text-pink-500" />
          </a>

          <div>
            <p className="text-xs font-medium text-purple-600">
              Customer Care
            </p>
            <p className="text-sm font-semibold text-gray-900">
              Srinivas Vemuri
            </p>
            <a
              href="tel:+919843288844"
              className="text-xs font-medium text-pink-500 hover:underline"
            >
              +91 98432 88844
            </a>
          </div>
        </div>
        </div>

        <Button
          onClick={() => setIsTopUpModalOpen(true)}
          className="w-full shrink-0 bg-gradient-to-r from-primary to-pink-500 hover:opacity-90 sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Top Up Wallet
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {/* Total Customers */}
        <Card className="min-w-0 overflow-hidden border-none bg-gradient-to-br from-purple-50 to-pink-50 p-5 shadow-sm">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-xl bg-white p-3 shadow-sm">
              <Users className="h-6 w-6 text-purple-600" />
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-sm text-muted-foreground">
                Total Customers
              </p>
              <p className="truncate text-3xl font-bold text-purple-600">
                {agentData.totalCustomers}
              </p>
            </div>
          </div>
        </Card>

        {/* Validity Ends */}
        <Card className="min-w-0 overflow-hidden border-none bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-xl bg-white p-3 shadow-sm">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm text-muted-foreground">
                Validity Ends
              </p>

              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="min-w-0 break-words text-xl font-bold leading-tight text-blue-600">
                  {agentData.validityEnds
                    ? new Date(agentData.validityEnds).toLocaleDateString()
                    : "N/A"}
                </p>

                {agentData.validityEnds &&
                  new Date(agentData.validityEnds) <
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs text-blue-600"
                      onClick={() =>
                        agentData.planId && handleRenew(agentData.planId)
                      }
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
        <Card className="min-w-0 overflow-hidden border-none bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-xl bg-white p-3 shadow-sm">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-sm text-muted-foreground">
                Paid Invoice
              </p>
              <p className="truncate text-3xl font-bold text-orange-600">
                {agentData.paidInvoices}
              </p>
            </div>
          </div>
        </Card>

        {/* Last Month Profit */}
        <Card className="min-w-0 overflow-hidden border-none bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-sm">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-xl bg-white p-3 shadow-sm">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-sm text-muted-foreground">
                Last Month Profit
              </p>
              <p className="break-words text-2xl font-bold leading-tight text-green-600">
                {formatAgentMoney(agentData.lastMonthProfit)}
              </p>
            </div>
          </div>
        </Card>

        {/* Wallet Balance */}
        <Card className="min-w-0 overflow-hidden border-none bg-gradient-to-br from-pink-50 to-rose-50 p-5 shadow-sm">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-xl bg-white p-3 shadow-sm">
              <Wallet className="h-6 w-6 text-pink-600" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm text-muted-foreground">
                Wallet Balance
              </p>

              <p className="break-words text-[22px] font-bold leading-tight text-pink-600">
                {formatAgentMoney(agentData.totalCashWallet)}
              </p>

              <Link
                to="/wallet-history"
                className="mt-1 inline-block text-xs font-medium text-pink-600 hover:underline"
              >
                View History
              </Link>
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
                Gateway fees/tax can vary by payment method and will be shown by
                Razorpay at checkout.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTopUpModalOpen(false)}
            >
              Cancel
            </Button>

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

if (isVehicleAgent) {
  const vehicleData = dashboardData as VehicleAgentDashboardStats;
  return (
    <div className="min-h-[calc(100vh-88px)] bg-gray-50/40 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-bold text-[#4a4260]">Itinerary Demo Dashboard</h3>
          <p className="mt-1 text-sm text-muted-foreground">Itineraries assigned to your account.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="p-5"><p className="text-sm text-muted-foreground">Itineraries</p><p className="mt-2 text-3xl font-bold text-purple-600">{vehicleData.totalItineraries}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">Confirmed itineraries</p><p className="mt-2 text-3xl font-bold text-pink-600">{vehicleData.confirmedItineraries}</p></Card>
        </div>
      </div>
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
            Welcome back, Travel Expert
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
            Welcome back, Guide
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
            Welcome back, Accounts
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
          <p className="text-2xl font-bold text-blue-600">{"\u20B9"}{accountsData.totalPayable.toLocaleString()}</p>
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
          <p className="text-2xl font-bold text-green-600">{"\u20B9"}{accountsData.totalPaid.toLocaleString()}</p>
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
          <p className="text-2xl font-bold text-orange-600">{"\u20B9"}{accountsData.totalBalance.toLocaleString()}</p>
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

  const formatVendorMoney = (value: number | string) => {
    const amount = Number(value || 0);

    return `₹ ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatVendorDate = (value?: string | null) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return [
      String(date.getDate()).padStart(2, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      date.getFullYear(),
    ].join("-");
  };

  const formatVendorSelectedDate = (value: string) => {
    const [year, month, day] = String(value || "").split("-");

    if (!year || !month || !day) {
      return value;
    }

    return `${day}-${month}-${year}`;
  };

  const currentLiveRows =
    vendorData.liveVehicleStatus?.[vendorLiveTab] ?? [];

  const liveSearch =
    vendorLiveSearch.trim().toLowerCase();

  const filteredLiveRows =
    currentLiveRows.filter((row) => {
      if (!liveSearch) return true;

      return Object.values(row)
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(liveSearch));
    });

  const liveTotalPages = Math.max(
    1,
    Math.ceil(filteredLiveRows.length / vendorLiveEntries),
  );

  const safeLivePage = Math.min(
    vendorLivePage,
    liveTotalPages,
  );

  const liveStart =
    (safeLivePage - 1) * vendorLiveEntries;

  const pagedLiveRows =
    filteredLiveRows.slice(
      liveStart,
      liveStart + vendorLiveEntries,
    );

  const liveStartEntry =
    filteredLiveRows.length === 0
      ? 0
      : liveStart + 1;

  const liveEndEntry =
    Math.min(
      liveStart + vendorLiveEntries,
      filteredLiveRows.length,
    );

  const currentDailyRows =
    (vendorData.dailyMoment ?? []).filter(
      (row) => row.date === vendorDailyDate,
    );

  const branchRows =
    vendorShowAllBranches
      ? vendorData.branches ?? []
      : (vendorData.branches ?? []).slice(0, 5);

  const fcSearch =
    vendorFcSearch.trim().toLowerCase();

  const filteredFcRows =
    (vendorData.fcOverview ?? []).filter((row) => {
      if (!fcSearch) return true;

      return Object.values(row)
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(fcSearch));
    });

  const fcTotalPages = Math.max(
    1,
    Math.ceil(filteredFcRows.length / vendorFcEntries),
  );

  const safeFcPage = Math.min(
    vendorFcPage,
    fcTotalPages,
  );

  const fcStart =
    (safeFcPage - 1) * vendorFcEntries;

  const pagedFcRows =
    filteredFcRows.slice(
      fcStart,
      fcStart + vendorFcEntries,
    );

  const fcStartEntry =
    filteredFcRows.length === 0
      ? 0
      : fcStart + 1;

  const fcEndEntry =
    Math.min(
      fcStart + vendorFcEntries,
      filteredFcRows.length,
    );

  return (
    <div className="min-h-[calc(100vh-88px)] bg-[#fdf9ff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px] space-y-8">

              {/* B2B Vendor Welcome */}
        <div>
          <h2 className="text-3xl font-medium text-[#ba34c9]">
            Welcome, {vendorData.vendorName}
          </h2>
        </div>

        {/* B2B Vehicle / Driver Overview */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_2fr]">
          {/* Vehicle Overview */}
          <Card className="border border-purple-100 bg-white p-7 shadow-sm">
            <h3 className="text-2xl font-medium text-[#57536a]">
              Vehicle Overview
            </h3>

            <div className="mt-8 grid grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-cyan-50 p-3">
                    <Car className="h-7 w-7 text-purple-600" />
                  </div>

                  <span className="text-3xl font-medium text-[#57536a]">
                    {vendorData.vehicles.onRoute}
                  </span>
                </div>

                <p className="mt-4 text-base leading-6 text-[#696579]">
                  On Route
                  <br />
                  Vehicles
                </p>
              </div>

              <div>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-pink-50 p-3">
                    <Car className="h-7 w-7 text-pink-500" />
                  </div>

                  <span className="text-3xl font-medium text-[#57536a]">
                    {vendorData.vehicles.available}
                  </span>
                </div>

                <p className="mt-4 text-base leading-6 text-[#696579]">
                  Available
                  <br />
                  Vehicles
                </p>
              </div>
            </div>
          </Card>

          {/* Drivers Overview */}
          <Card className="border border-purple-100 bg-white p-7 shadow-sm">
            <h3 className="text-2xl font-medium text-[#57536a]">
              Drivers Overview
            </h3>

            <div className="mt-8 grid grid-cols-2 gap-7 xl:grid-cols-4">
              <div>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-50 p-3">
                    <Users className="h-7 w-7 text-green-500" />
                  </div>

                  <span className="text-3xl font-medium text-[#57536a]">
                    {vendorData.drivers.active}
                  </span>
                </div>

                <p className="mt-4 text-base text-[#696579]">
                  Active Drivers
                </p>
              </div>

              <div>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-red-50 p-3">
                    <Users className="h-7 w-7 text-red-500" />
                  </div>

                  <span className="text-3xl font-medium text-[#57536a]">
                    {vendorData.drivers.inactive}
                  </span>
                </div>

                <p className="mt-4 text-base text-[#696579]">
                  In-active Drivers
                </p>
              </div>

              <div>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-cyan-50 p-3">
                    <Car className="h-7 w-7 text-purple-600" />
                  </div>

                  <span className="text-3xl font-medium text-[#57536a]">
                    {vendorData.drivers.onRoute}
                  </span>
                </div>

                <p className="mt-4 text-base text-[#696579]">
                  On Route Drivers
                </p>
              </div>

              <div>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-pink-50 p-3">
                    <Car className="h-7 w-7 text-pink-500" />
                  </div>

                  <span className="text-3xl font-medium text-[#57536a]">
                    {vendorData.drivers.available}
                  </span>
                </div>

                <p className="mt-4 text-base text-[#696579]">
                  Available Drivers
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Trips + Overview */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">

            <Card className="border-b-2 border-orange-300 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-slate-600">
                    {vendorData.totalTrips}
                  </p>

                  <p className="mt-2 text-base text-slate-600">
                    Total Trips
                  </p>
                </div>

                <Truck className="h-11 w-11 text-orange-400" />
              </div>
            </Card>

            <Card className="border-b-2 border-cyan-300 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold text-slate-600">
                    {formatVendorMoney(vendorData.totalRevenue)}
                  </p>

                  <p className="mt-2 text-base text-slate-600">
                    Total Revenue
                  </p>
                </div>

                <Wallet className="h-11 w-11 text-amber-500" />
              </div>
            </Card>

            <Card className="border-b-2 border-purple-300 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-slate-600">
                    {vendorData.scheduledTrips}
                  </p>

                  <p className="mt-2 text-base text-slate-600">
                    Scheduled Trips
                  </p>
                </div>

                <Calendar className="h-11 w-11 text-purple-500" />
              </div>
            </Card>

            <Card className="border-b-2 border-pink-300 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-slate-600">
                    {vendorData.completedTrips}
                  </p>

                  <p className="mt-2 text-base text-slate-600">
                    Completed Trips
                  </p>
                </div>

                <CheckCircle className="h-11 w-11 text-pink-500" />
              </div>
            </Card>
          </div>

          {/* Vehicle / Driver Overview */}
          <Card className="relative overflow-hidden border-none bg-gradient-to-r from-purple-600 to-pink-500 p-7 text-white lg:col-span-3">
            <div className="absolute right-6 top-6 flex gap-2">
              <button
                type="button"
                aria-label="Vehicle Overview"
                onClick={() => setVendorOverview("vehicle")}
                className={`h-3 w-3 rounded-full ${
                  vendorOverview === "vehicle"
                    ? "bg-white"
                    : "bg-white/40"
                }`}
              />

              <button
                type="button"
                aria-label="Driver Overview"
                onClick={() => setVendorOverview("driver")}
                className={`h-3 w-3 rounded-full ${
                  vendorOverview === "driver"
                    ? "bg-white"
                    : "bg-white/40"
                }`}
              />
            </div>

            {vendorOverview === "vehicle" ? (
              <>
                <h4 className="text-2xl font-bold">
                  Vehicle Overview
                </h4>

                <p className="mt-1 text-base text-white/90">
                  Insights into Fleet Performance
                </p>

                <div className="mt-10 grid grid-cols-2 gap-5">
                  <div className="flex items-center gap-3">
                    <span className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-lg font-bold text-purple-600">
                      {vendorData.vehicles.total}
                    </span>
                    <span>Total Vehicles</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-lg font-bold text-purple-600">
                      {vendorData.vehicles.onRoute}
                    </span>
                    <span>On Route Vehicles</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-lg font-bold text-purple-600">
                      {vendorData.vehicles.upcoming}
                    </span>
                    <span>Upcoming Vehicles</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-lg font-bold text-purple-600">
                      {vendorData.vehicles.available}
                    </span>
                    <span>Available Vehicles</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h4 className="text-2xl font-bold">
                  Driver Overview
                </h4>

                <p className="mt-1 text-base text-white/90">
                  Driver Performance Overview
                </p>

                <div className="mt-10 grid grid-cols-2 gap-5">
                  <div className="flex items-center gap-3">
                    <span className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-lg font-bold text-purple-600">
                      {vendorData.drivers.active}
                    </span>
                    <span>Active Drivers</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-lg font-bold text-purple-600">
                      {vendorData.drivers.onRoute}
                    </span>
                    <span>On Route Drivers</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-lg font-bold text-purple-600">
                      {vendorData.drivers.inactive}
                    </span>
                    <span>In-active Drivers</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="min-w-14 rounded-lg bg-white px-4 py-2 text-center text-lg font-bold text-purple-600">
                      {vendorData.drivers.available}
                    </span>
                    <span>Available Drivers</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Live Vehicle Status */}
        <div>
          <h3 className="mb-5 text-2xl font-semibold text-[#4a4260]">
            Live Vehicle Status
          </h3>

          <Card className="overflow-hidden">
            <div className="flex overflow-x-auto border-b">
              {liveVehicleStatusTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setVendorLiveTab(tab.key);
                    setVendorLivePage(1);
                  }}
                  className={`whitespace-nowrap border-b-2 px-7 py-4 text-base ${
                    vendorLiveTab === tab.key
                      ? "border-pink-500 text-pink-600"
                      : "border-transparent text-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span>Show</span>

                  <select
                    value={vendorLiveEntries}
                    onChange={(event) => {
                      setVendorLiveEntries(Number(event.target.value));
                      setVendorLivePage(1);
                    }}
                    className="h-10 rounded-md border bg-white px-3"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>

                  <span>entries</span>
                </div>

                <div className="flex items-center gap-3">
                  <Label htmlFor="vendor-live-search">
                    Search:
                  </Label>

                  <Input
                    id="vendor-live-search"
                    value={vendorLiveSearch}
                    onChange={(event) => {
                      setVendorLiveSearch(event.target.value);
                      setVendorLivePage(1);
                    }}
                    className="w-64"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#faf8fc] text-left uppercase text-slate-600">
                      <th className="px-4 py-4">S.NO</th>
                      <th className="px-4 py-4">BOOKING ID</th>
                      <th className="px-4 py-4">START DATE</th>
                      <th className="px-4 py-4">END DATE</th>
                      <th className="px-4 py-4">VENDOR</th>
                      <th className="px-4 py-4">BRANCH</th>
                      <th className="px-4 py-4">VEHICLE</th>
                      <th className="px-4 py-4">DRIVER</th>
                      <th className="px-4 py-4">DRIVER NO</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagedLiveRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="border-t px-4 py-7 text-center text-muted-foreground"
                        >
                          No data available in table
                        </td>
                      </tr>
                    ) : (
                      pagedLiveRows.map((row, index) => (
                        <tr
                          key={`${vendorLiveTab}-${liveStart + index}`}
                          className="border-t"
                        >
                          <td className="px-4 py-3">
                            {liveStart + index + 1}
                          </td>

                          <td className="px-4 py-3">
                            {row.bookingId}
                          </td>

                          <td className="px-4 py-3">
                            {formatVendorDate(row.startDate)}
                          </td>

                          <td className="px-4 py-3">
                            {formatVendorDate(row.endDate)}
                          </td>

                          <td className="px-4 py-3">
                            {row.vendorName}
                          </td>

                          <td className="px-4 py-3">
                            {row.branchName}
                          </td>

                          <td className="px-4 py-3">
                            {row.vehicleName}
                          </td>

                          <td className="px-4 py-3">
                            {row.driverName}
                          </td>

                          <td className="px-4 py-3">
                            {row.driverNo}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {liveStartEntry} to {liveEndEntry} of{" "}
                  {filteredLiveRows.length} entries
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={safeLivePage <= 1}
                    onClick={() =>
                      setVendorLivePage(
                        Math.max(1, safeLivePage - 1),
                      )
                    }
                  >
                    Previous
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={safeLivePage >= liveTotalPages}
                    onClick={() =>
                      setVendorLivePage(
                        Math.min(
                          liveTotalPages,
                          safeLivePage + 1,
                        ),
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Daily Moment */}
        <Card className="min-h-[220px] p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-2xl font-semibold text-[#4a4260]">
              Daily Moment
            </h3>

            <Input
              type="date"
              value={vendorDailyDate}
              onChange={(event) =>
                setVendorDailyDate(event.target.value)
              }
              className="w-full sm:w-72"
            />
          </div>

          {currentDailyRows.length === 0 ? (
            <div className="flex min-h-[130px] items-center justify-center text-xl font-medium text-pink-500">
              No Record Found in{" "}
              {formatVendorSelectedDate(vendorDailyDate)}
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead>
                  <tr className="bg-[#faf8fc] text-left">
                    <th className="px-4 py-3">
                      Booking ID
                    </th>
                    <th className="px-4 py-3">
                      From
                    </th>
                    <th className="px-4 py-3">
                      To
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentDailyRows.map((row, index) => (
                    <tr
                      key={`${row.quoteId}-${index}`}
                      className="border-t"
                    >
                      <td className="px-4 py-3">
                        {row.quoteId}
                      </td>
                      <td className="px-4 py-3">
                        {row.location}
                      </td>
                      <td className="px-4 py-3">
                        {row.nextLocation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Branch Details */}
        <Card className="min-h-[150px] p-7">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-[#4a4260]">
              Branch Details
            </h3>

            {(vendorData.branches ?? []).length > 5 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setVendorShowAllBranches(
                    (currentValue) => !currentValue,
                  )
                }
                className="text-purple-600"
              >
                {vendorShowAllBranches
                  ? "View Less"
                  : "View All"}
              </Button>
            )}
          </div>

          {branchRows.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-[#faf8fc] text-left">
                    <th className="px-4 py-3">
                      Branch
                    </th>
                    <th className="px-4 py-3">
                      Location
                    </th>
                    <th className="px-4 py-3">
                      Mobile
                    </th>
                    <th className="px-4 py-3">
                      Email
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {branchRows.map((branch) => (
                    <tr
                      key={branch.id}
                      className="border-t"
                    >
                      <td className="px-4 py-3">
                        {branch.name}
                      </td>

                      <td className="px-4 py-3">
                        {branch.location}
                      </td>

                      <td className="px-4 py-3">
                        {branch.mobile}
                      </td>

                      <td className="px-4 py-3">
                        {branch.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* FC Overview */}
        <div>
          <h3 className="text-2xl font-semibold text-[#4a4260]">
            FC Overview
          </h3>

          <p className="mb-4 text-muted-foreground">
            Fitness Certificate Overview
          </p>

          <Card className="p-6">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span>Show</span>

                <select
                  value={vendorFcEntries}
                  onChange={(event) => {
                    setVendorFcEntries(Number(event.target.value));
                    setVendorFcPage(1);
                  }}
                  className="h-10 rounded-md border bg-white px-3"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>

                <span>entries</span>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="vendor-fc-search">
                  Search:
                </Label>

                <Input
                  id="vendor-fc-search"
                  value={vendorFcSearch}
                  onChange={(event) => {
                    setVendorFcSearch(event.target.value);
                    setVendorFcPage(1);
                  }}
                  className="w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-[#faf8fc] text-left uppercase text-slate-600">
                    <th className="px-4 py-4">S.NO</th>
                    <th className="px-4 py-4">
                      VEHICLE NUMBER
                    </th>
                    <th className="px-4 py-4">
                      VEHICLE TYPE
                    </th>
                    <th className="px-4 py-4">
                      FC DATE
                    </th>
                    <th className="px-4 py-4">
                      FC STATUS
                    </th>
                    <th className="px-4 py-4">
                      INSURANCE DATE
                    </th>
                    <th className="px-4 py-4">
                      INSURANCE STATUS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pagedFcRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="border-t px-4 py-7 text-center text-muted-foreground"
                      >
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    pagedFcRows.map((row, index) => (
                      <tr
                        key={row.vehicleId}
                        className="border-t"
                      >
                        <td className="px-4 py-3">
                          {fcStart + index + 1}
                        </td>

                        <td className="px-4 py-3">
                          {row.vehicleNumber}
                        </td>

                        <td className="px-4 py-3">
                          {row.vehicleType}
                        </td>

                        <td className="px-4 py-3">
                          {formatVendorDate(row.fcDate)}
                        </td>

                        <td className="px-4 py-3">
                          {row.fcStatus}
                        </td>

                        <td className="px-4 py-3">
                          {formatVendorDate(
                            row.insuranceDate,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {row.insuranceStatus}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {fcStartEntry} to {fcEndEntry} of{" "}
                {filteredFcRows.length} entries
              </p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={safeFcPage <= 1}
                  onClick={() =>
                    setVendorFcPage(
                      Math.max(1, safeFcPage - 1),
                    )
                  }
                >
                  Previous
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={safeFcPage >= fcTotalPages}
                  onClick={() =>
                    setVendorFcPage(
                      Math.min(
                        fcTotalPages,
                        safeFcPage + 1,
                      ),
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
  return null;
}

