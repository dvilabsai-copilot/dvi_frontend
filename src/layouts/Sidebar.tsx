import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  FileText,
  CheckCircle,
  Wallet,
  Clock,
  Users,
  ChevronRight,
  History,
  Settings,
  MapPin,
  LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getToken } from "@/lib/api";
import { walletService } from "@/api/walletService";

// Helper functions
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getAgentId() {
  const token = getToken();
  const user = token ? parseJwt(token) : null;
  return user?.agentId || user?.id || user?.agent_ID;
}

function formatCurrency(amount: number) {
  return `₹ ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Menu types
type MenuChild = { id: string; title: string; path: string };
type MenuItem = { id: string; title: string; icon: LucideIcon; path: string; hasSubmenu?: boolean; children?: MenuChild[] };

// Menu items
const menuItems: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", icon: Home, path: "/" },
  { id: "create-itinerary", title: "Create Itinerary", icon: FileText, path: "/create-itinerary" },
  { id: "download-packages", title: "Download Packages", icon: FileText, path: "/download-packages" },
  { id: "latest-itinerary", title: "Latest Itinerary", icon: FileText, path: "/latest-itinerary" },
  { id: "confirmed-itinerary", title: "Confirmed Itinerary", icon: CheckCircle, path: "/confirmed-itinerary" },
  {
    id: "accounts",
    title: "Accounts",
    icon: Wallet,
    path: "/accounts",
    hasSubmenu: true,
    children: [
      { id: "accounts-manager", title: "Accounts Manager", path: "/accounts-manager" },
      { id: "accounts-ledger", title: "Accounts Ledger", path: "/accounts-ledger" },
    ],
  },
  { id: "hotels", title: "Hotels", icon: FileText, path: "/hotels" },
  { id: "daily-moment", title: "Daily Moment Tracker", icon: Clock, path: "/daily-moment" },
  {
    id: "vendor-management",
    title: "Vendor Management",
    icon: Users,
    path: "/vendor-management",
    hasSubmenu: true,
    children: [
      { id: "vendor", title: "Vendor", path: "/vendor" },
      { id: "driver", title: "Driver", path: "/driver" },
      { id: "vehicle-chart", title: "Vehicle Availability Chart", path: "/vehicle-availability" },
    ],
  },
  {
    id: "hotspot",
    title: "Hotspot",
    icon: MapPin,
    path: "/hotspot",
    hasSubmenu: true,
    children: [
      { id: "new-hotspot", title: "New Hotspot", path: "/hotspots" },
      { id: "parking-charge", title: "Parking Charge", path: "/parking-charge-bulk-import" },
    ],
  },
  { id: "activity", title: "Activity", icon: FileText, path: "/activities" },
  {
    id: "locations",
    title: "Locations",
    icon: MapPin,
    path: "/locations",
    hasSubmenu: true,
    children: [
      { id: "locations-main", title: "Locations", path: "/locations" },
      { id: "toll-charge", title: "Toll Charge", path: "/toll-charge" },
    ],
  },
  { id: "guide", title: "Guide", icon: Users, path: "/guide" },
  { id: "staff", title: "Staff", icon: Users, path: "/staff" },
  { id: "agent", title: "Agent", icon: Users, path: "/agent" },
  { id: "wallet", title: "Wallet", icon: Wallet, path: "/wallet" },
  { id: "subscription-history", title: "Subscription History", icon: History, path: "/subscription-history" },
  { id: "pricebook", title: "Pricebook Export", icon: FileText, path: "/pricebook-export" },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    path: "/settings",
    hasSubmenu: true,
    children: [
      { id: "global-settings", title: "Global Settings", path: "/settings/global" },
      { id: "gst", title: "GST Setting", path: "/settings/gst" },
      { id: "hotel-category", title: "Hotel Category", path: "/settings/hotel-category" },
      { id: "amenities", title: "Inbuild Amenities", path: "/settings/amenities" },
      { id: "vehicle-type", title: "Vehicle Type", path: "/settings/vehicle-type" },
      { id: "cities", title: "Cities", path: "/settings/cities" },
      { id: "language", title: "Language", path: "/settings/language" },
      { id: "role-permission", title: "Role Permission", path: "/settings/role-permission" },
      { id: "subscription-plan", title: "Agent Subscription Plan", path: "/settings/subscription-plan" },
    ],
  },
];

interface SidebarProps { mobileOpen: boolean; onMobileToggle: () => void }

export const Sidebar = ({ mobileOpen, onMobileToggle }: SidebarProps) => {
  const [openParentId, setOpenParentId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWalletAmount, setSidebarWalletAmount] = useState<number>(0);

  const token = localStorage.getItem("accessToken");
  const user = token ? parseJwt(token) : null;
  const role = user?.role;

  useEffect(() => {
    const loadSidebarWallet = async () => {
      try {
        const agentId = getAgentId();
        if (!agentId) return;

        const data = await walletService.getWallet(Number(agentId));
        setSidebarWalletAmount(data.summary.cashWalletBalance || 0);
      } catch (error) {
        console.error("Failed to load sidebar wallet amount:", error);
      }
    };
    loadSidebarWallet();
  }, []);

  const filteredMenuItems = menuItems.filter((item) => {
    if (role === 4) {
      return ["dashboard","create-itinerary","download-packages","latest-itinerary","confirmed-itinerary","staff","wallet","subscription-history"].includes(item.id);
    }
    if (role === 1) {
      return ["dashboard","create-itinerary","download-packages","latest-itinerary","confirmed-itinerary","accounts","hotels","daily-moment","vendor-management","hotspot","activity","locations","guide","staff","agent","pricebook","settings"].includes(item.id);
    }
    return false;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <div className="flex items-center gap-3">
          <img src="/assets/img/DVi-Logo1-2048x1860.png" alt="DoView Holidays" className="h-8 object-contain" />
          {!collapsed && <span className="font-semibold text-lg">DoView Holidays</span>}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="w-6 h-6 rounded-full border flex items-center justify-center text-xs hover:bg-gray-100">●</button>
      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;

            if (item.hasSubmenu && item.children && !collapsed) {
              const isOpen = openParentId === item.id;
              return (
                <li key={item.id}>
                  <button onClick={() => setOpenParentId(prev => prev === item.id ? null : item.id)} className="flex items-center w-full gap-3 px-4 py-2 rounded-lg hover:bg-[#f5e8ff]">
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-sm text-left">{item.title}</span>
                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                  </button>
                  {isOpen && (
                    <ul className="pl-8 mt-1 space-y-1 border-l border-gray-200">
                      {item.children.map(child => (
                        <li key={child.id}>
                          <NavLink to={child.path} className={({ isActive }) => cn("block py-1 pl-3 text-sm rounded hover:text-pink-500", isActive && "text-pink-500 font-medium")}>
                            {child.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.id}>
                <NavLink to={item.path} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#f5e8ff]", isActive && "bg-gradient-to-r from-primary to-pink-500 text-white")}>
                  <Icon className="h-5 w-5" />
                  {!collapsed && <span className="text-sm">{item.title}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* AGENT WALLET */}
      {role === 4 && !collapsed && (
        <div className="px-4 py-3 border-t">
          <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-3">
            <Wallet className="text-yellow-500" />
            <div>
              <p className="text-sm font-semibold">
                {formatCurrency(sidebarWalletAmount)}
              </p>
              <p className="text-xs text-pink-500">
                Cash Wallet Amount
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE */}
      {!collapsed && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center text-white font-semibold">A</div>
            <div>
              <p className="text-sm font-semibold">
                {role === 4 ? "DVI Demo Agent" : user?.name || "AdminDvi"}
              </p>
              <p className="text-xs text-pink-500">
                {role === 1 ? "Super Admin" : "Agent"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={onMobileToggle}>
        <SheetContent side="left" className="w-64 p-0 md:hidden">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <aside className={cn("hidden md:flex fixed left-0 top-0 h-screen bg-white border-r flex-col transition-all duration-300", collapsed ? "w-20" : "w-64")}>
        <SidebarContent />
      </aside>
    </>
  );
};