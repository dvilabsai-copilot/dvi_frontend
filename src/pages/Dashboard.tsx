
import { Users, Car, UserSquare2, TrendingDown, Calendar, Truck, Hotel, Building2, Wallet, FileText, UserCheck, Plus, CheckCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { Link } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { useState, useEffect } from "react";
import { DashboardService, DashboardStats, AgentDashboardStats, AccountsDashboardStats, VendorDashboardStats } from "@/services/dashboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paymentService } from "@/services/paymentService";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

export default function Dashboard() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardStats | AgentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment states
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const token = localStorage.getItem("accessToken");
  const user = token ? parseJwt(token) : null;
  const isAgent = user?.role === 4;
  const isAccounts = user?.role === 6;
  const isVendor = user?.role === 2;
  const isTravelExpert = (user?.role === 3 || user?.role === 8 || (user?.staffId && user.staffId > 0)) && !isAgent && !isAccounts;
  const isGuide = user?.role === 5 || (user?.guideId && user.guideId > 0);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleTopUp = async () => {
    if (!topUpAmount || isNaN(Number(topUpAmount)) || Number(topUpAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsProcessingPayment(true);
      const order = await paymentService.createOrder(Number(topUpAmount));

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "DVI Fullstack",
        description: "Wallet Top Up",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment successful! Wallet updated.");
            setIsTopUpModalOpen(false);
            setTopUpAmount("");
            // Refresh dashboard data
            const data = await DashboardService.getStats();
            setDashboardData(data);
          } catch (error) {
            console.error("Payment verification failed:", error);
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#ec4899",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Failed to initiate payment:", error);
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRenew = async (planId: number, staffCount: number) => {
    try {
      setIsProcessingPayment(true);
      const order = await paymentService.createSubscriptionOrder(planId, staffCount);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "DVI Fullstack",
        description: "Subscription Renewal",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Subscription renewed successfully!");
            // Refresh dashboard data
            const data = await DashboardService.getStats();
            setDashboardData(data);
          } catch (error) {
            console.error("Payment verification failed:", error);
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#ec4899",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
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
                      onClick={() => agentData.planId && handleRenew(agentData.planId, agentData.staffCount)}
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
                />
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
    </div>
  );
}
