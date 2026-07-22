import type { Dispatch, SetStateAction } from "react";
import {
  Users,
  UserSquare2,
  Car,
  Briefcase,
  Wallet,
  Truck,
  Store,
  Hotel,
  Calendar,
  FileText,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { type DashboardStats } from "@/services/dashboard";
import Autoplay from "embla-carousel-autoplay";

export type DashboardAdminOverviewProps = {
  adminData: DashboardStats;
  api: CarouselApi | undefined;
  setApi: Dispatch<SetStateAction<CarouselApi | undefined>>;
  current: number;
};

export function DashboardAdminOverview({ adminData, api, setApi, current }: DashboardAdminOverviewProps) {
  return (
    <>
 {/* Welcome + Stats + Profit Section */}
<Card className="border-none bg-white p-8 shadow-md">
  <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
    <div>
      <h3 className="mb-4 text-4xl font-bold text-slate-700">
        Welcome back, Admin <Sparkles className="inline h-8 w-8 text-pink-500" aria-hidden="true" />
      </h3>

      <p className="mb-8 max-w-[650px] text-xl leading-8 text-gray-400">
        Your progress this week is Awesome. Let's keep it up and get
        a lot of points reward!
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
    </div>

    <div className="flex flex-col justify-center gap-10">
      <div>
        <p className="mb-3 text-xl font-semibold text-gray-400">
          Last Month Profit
        </p>
        <p className="mb-4 text-lg text-gray-400">October 2025</p>
        <p className="text-3xl font-bold text-slate-700">
              {"\u20B9"} {adminData.profit.lastMonth.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      <div>
        <p className="mb-3 text-xl font-semibold text-gray-400">
          Current Month Profit
        </p>
        <p className="mb-4 text-lg text-gray-400">November 2025</p>

        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold text-slate-700">
              {"\u20B9"} {adminData.profit.currentMonth.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>

          <span
            className={`rounded px-3 py-1 text-sm font-semibold ${
              adminData.profit.percentageChange >= 0
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-500"
            }`}
          >
              {adminData.profit.percentageChange >= 0 ? "\u2191" : "\u25BC"}{" "}
            {Math.abs(adminData.profit.percentageChange).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  </div>
</Card>

{/* Stats Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Itineraries */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold mb-1">{adminData.stats.totalItineraries}</p>
              <p className="text-sm text-muted-foreground">Total Itineraries</p>
            </div>
            <Briefcase className="h-16 w-16 text-slate-700" aria-hidden="true" />
          </div>
        </Card>

        {/* Total Revenue */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
          <p className="text-2xl font-bold mb-1">{"\u20B9"} {adminData.stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <Wallet className="h-16 w-16 text-slate-700" aria-hidden="true" />
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
                    <Truck className="h-32 w-32 text-white opacity-30" aria-hidden="true" />
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
                    <Store className="h-32 w-32 text-white opacity-30" aria-hidden="true" />
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
                    <Car className="h-32 w-32 text-white opacity-30" aria-hidden="true" />
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
                    <Hotel className="h-32 w-32 text-white opacity-30" aria-hidden="true" />
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
            <Calendar className="h-16 w-16 text-slate-700" aria-hidden="true" />
          </div>
        </Card>

        {/* Cancelled Booking */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold mb-1">{adminData.stats.cancelledBookings}</p>
              <p className="text-sm text-muted-foreground">Cancelled Booking</p>
            </div>
            <FileText className="h-16 w-16 text-slate-700" aria-hidden="true" />
          </div>
        </Card>
      </div>
    </>
  );
}

