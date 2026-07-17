/* eslint-disable @typescript-eslint/no-explicit-any */
import { Users, Calendar, Wallet, FileText, UserCheck, Plus, CheckCircle, Clock, Car, Hotel, Building2, Truck, ChevronRight, ChevronDown, MapPin, CheckCircle2, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmedDashboardTabs, liveVehicleStatusTabs } from "./dashboard.constants";
import type { AgentDashboardStats, AccountsDashboardStats, VendorDashboardStats } from "@/services/dashboard";

export function DashboardRoleViews({ context }: { context: Record<string, any> }) {
  const { dashboardData, loading, isAgent, isTravelExpert, isGuide, isAccounts, isVendor, isProcessingPayment, isTopUpModalOpen, setIsTopUpModalOpen, topUpAmount, setTopUpAmount, handleTopUp, handleRenew } = context;
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

    return `â‚¹ ${amount.toLocaleString("en-IN", {
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
            Welcome back, Agent ðŸ‘‹
          </h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            Here's what's happening with your account today.
          </p>
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

  if (isTravelExpert) {
    const teData = dashboardData as any;
    return (
      <div className="p-8 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            Welcome back, Travel Expert ðŸ‘‹
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
            Welcome back, Guide ðŸ‘‹
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
            Welcome back, Accounts ðŸ‘‹
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
                <p className="text-2xl font-bold text-blue-600">â‚¹{accountsData.totalPayable.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-green-600">â‚¹{accountsData.totalPaid.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-orange-600">â‚¹{accountsData.totalBalance.toLocaleString()}</p>
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
            Welcome back, Vendor ðŸ‘‹
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
  return null;
}
