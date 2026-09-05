import { useState } from "react";
import {
  BedDouble,
  Building2,
  CalendarDays,
  ChevronRight,
  Gauge,
  Hotel,
  LogOut,
  Menu,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { clearToken } from "@/lib/api";
import { cn } from "@/lib/utils";

const hotelAdminMenu = [
  {
    title: "Dashboard",
    path: "/hotel-admin/dashboard",
    icon: Gauge,
  },
  {
    title: "Hotels",
    path: "/hotel-admin/hotels",
    icon: Hotel,
  },
  {
    title: "Hotel Details",
    path: "/hotel-admin/hotel-details",
    icon: Building2,
  },
  {
    title: "Rooms",
    path: "/hotel-admin/rooms",
    icon: BedDouble,
  },
  {
    title: "Rates / Pricing",
    path: "/hotel-admin/rates",
    icon: Tags,
  },
  {
    title: "Availability",
    path: "/hotel-admin/availability",
    icon: CalendarDays,
  },
  {
    title: "Bookings",
    path: "/hotel-admin/bookings",
    icon: ShieldCheck,
  },
  {
    title: "Hotel Users",
    path: "/hotel-admin/users",
    icon: Users,
  },
  {
    title: "Permissions",
    path: "/hotel-admin/permissions",
    icon: ShieldCheck,
  },
];

function getPageTitle(pathname: string) {
  const path = pathname.toLowerCase();

  if (path.endsWith("/hotels")) return "Hotels";
  if (path.endsWith("/hotel-details")) return "Hotel Details";
  if (path.endsWith("/rooms")) return "Rooms";
  if (path.endsWith("/rates")) return "Rates / Pricing";
  if (path.endsWith("/availability")) return "Availability";
  if (path.endsWith("/bookings")) return "Bookings";
  if (path.endsWith("/users")) return "Hotel Users";
  if (path.endsWith("/permissions")) return "Permissions";

  return "Hotel Dashboard";
}

type SidebarContentProps = {
  onNavigate?: () => void;
};

function HotelAdminSidebarContent({
  onNavigate,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <img
          src="/assets/img/DVi-Logo1-2048x1860.png"
          alt="DoView Holidays"
          className="h-8 w-8 object-contain"
        />

        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">
            DoView Holidays
          </div>
          <div className="text-xs text-muted-foreground">
            Hotel Administration
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {hotelAdminMenu.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors",
                      "hover:bg-[#f5e8ff]",
                      isActive &&
                        "bg-[#f5e8ff] font-medium text-pink-500",
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted/40 px-3 py-3">
          <div className="text-sm font-semibold">
            Hotel Admin
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Hotel management portal
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HotelAdminShell() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = getPageTitle(location.pathname);

  const logout = () => {
    clearToken();
    navigate("/login");
  };

  return (
    <div
      className="flex min-h-screen w-full bg-background"
      style={{ overflowX: "clip" }}
    >
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white md:block">
        <HotelAdminSidebarContent />
      </aside>

      <Sheet
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
      >
        <SheetContent
          side="left"
          className="w-72 p-0"
        >
          <HotelAdminSidebarContent
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-64">
        <header className="border-b border-border bg-white">
          <div className="mx-auto w-full max-w-[1920px] px-4 lg:px-6">
            <div className="flex items-center justify-between py-4 sm:py-6">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </Button>

                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">
                    {pageTitle}
                  </h1>

                  <div className="mt-1 hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <span>Hotel Administration</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>{pageTitle}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Logout
                </span>
              </Button>
            </div>
          </div>
        </header>

        <main className="relative min-h-0 flex-1">
          <div className="mx-auto w-full max-w-[1920px] px-4 py-5 lg:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border bg-white py-4">
          <div className="mx-auto w-full max-w-[1920px] px-4 lg:px-6">
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              DVI Holidays @ {new Date().getFullYear()}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}