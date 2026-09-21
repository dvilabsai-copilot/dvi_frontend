import {
  useState,
  useEffect,
  type FormEvent,
} from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import {
  Home,
  FileText,
  CheckCircle,
  TicketCheck,
  Wallet,
  Clock,
  Users,
  ChevronRight,
  History,
  Settings,
  User,
  KeyRound,
  LogOut,
  ExternalLink,
  MapPin,
  Gauge,
  LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { walletService } from "@/api/walletService";
import {
  api,
  API_BASE_URL,
  clearToken,
} from "@/lib/api";
import {
  filterMenuItemsForStaff,
  getAuthenticatedRoleId,
  getAuthenticatedUser,
} from "@/services/accessControl";
import {
  LEGACY_B2B_URL,
  LEGACY_SSO_ENABLED,
  openLegacyB2B,
} from "@/services/legacySso";
import { USER_ROLES } from "@/constants/systemRoles";

// Helper functions
function getAgentId() {
  const user = getAuthenticatedUser();

  return Number(user?.agentId || 0) || 0;
}

function formatCurrency(amount: number) {
  return `₹ ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const DVI_LOGO =
  "/assets/img/DVi-Logo1-2048x1860.png";

function resolveAgentLogo(
  siteLogo?: string | null,
) {
  const logo = String(
    siteLogo ?? "",
  ).trim();

  if (!logo) {
    return null;
  }

  if (
    /^https?:\/\//i.test(logo) ||
    logo.startsWith("//") ||
    logo.startsWith("data:") ||
    logo.startsWith("blob:")
  ) {
    return logo;
  }

  const apiBase = String(
    API_BASE_URL || "",
  ).replace(/\/+$/, "");

  const fileBase =
    apiBase.replace(
      /\/api\/v1$/i,
      "",
    );

  if (
    logo.startsWith(
      "/uploads/",
    )
  ) {
    return `${fileBase}${logo}`;
  }

  if (
    logo.startsWith(
      "uploads/",
    )
  ) {
    return `${fileBase}/${logo}`;
  }

  if (logo.startsWith("/")) {
    return logo;
  }

  return `${fileBase}/uploads/agent_gallery/${encodeURIComponent(
    logo,
  )}`;
}

// Menu types
type MenuChild = {
  id: string;
  title: string;
  path: string;
};

type AgentBrandingProfile = {
  config?: {
    siteLogo?: string | null;
    invoiceLogo?: string | null;
    companyName?: string | null;
  };
};
type MenuItem = { id: string; title: string; icon: LucideIcon; path: string; hasSubmenu?: boolean; children?: MenuChild[] };

// Menu items
const menuItems: MenuItem[] = [
  { id: "dashboard", title: "Dashboard", icon: Home, path: "/" },
  {
  id: "create-itinerary",
  title: "Create Itinerary",
  icon: FileText,
  path: "/create-itinerary",
  },
{
  id: "smart-booking",
  title: "Smart Booking",
  icon: FileText,
  path: "/smart-booking",
},
{
  id: "latest-itinerary",
  title: "Latest Itinerary",
  icon: FileText,
  path: "/latest-itinerary",
},
  {
    id: "confirmed-itinerary",
    title: "Confirmed Itinerary",
    icon: FileText,
    path: "/confirmed-itinerary",
  },
  { id: "download-packages", title: "Download Packages", icon: FileText, path: "/download-packages" },
  { id: "book-activities", title: "Book Activities", icon: TicketCheck, path: "/book-activities" },
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
  {
    id: "vendor-dashboard",
    title: "Vendor Dashboard",
    icon: Gauge,
    path: "/vendor-dashboard",
  },
  { id: "hotels", title: "Hotels", icon: FileText, path: "/hotels" },
  { id: "tbo-master-hotels", title: "VSR Master Hotels", icon: FileText, path: "/hotels/tbo-master" },
  { id: "axisrooms-hotels", title: "AxisRooms Hotels", icon: FileText, path: "/hotels/axisrooms" },
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
    { id: "vendor-vehicle-type", title: "Vehicle Type", path: "/settings/vehicle-type" },
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
      { id: "locations-between-hotspots", title: "Between Hotspots", path: "/locations/between-hotspots" },
      { id: "locations-vehicle-route-restrictions", title: "Vehicle Route Restrictions", path: "/locations/vehicle-route-restrictions" },
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
      { id: "holidays", title: "Holidays", path: "/settings/holidays" },
      { id: "amenities", title: "Inbuild Amenities", path: "/settings/amenities" },
      { id: "vehicle-type", title: "Vehicle Type", path: "/settings/vehicle-type" },
      { id: "cities", title: "Cities", path: "/settings/cities" },
      { id: "language", title: "Language", path: "/settings/language" },
      { id: "role-permission", title: "Role Permission", path: "/settings/role-permission" },
      { id: "subscription-plan", title: "Agent Subscription Plan", path: "/settings/subscription-plan" },
    ],
  },
  {
  id: "agent-profile",
  title: "Agent Profile",
  icon: User,
  path: "/profile",
},
];
interface SidebarProps { mobileOpen: boolean; onMobileToggle: () => void; collapsed?: boolean; onCollapsedChange?: (v: boolean) => void }

export const Sidebar = ({ mobileOpen, onMobileToggle, collapsed: collapsedProp, onCollapsedChange }: SidebarProps) => {
  const navigate = useNavigate();

  const [openParentId, setOpenParentId] = useState<string | null>(null);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : localCollapsed;
  const setCollapsed = (v: boolean) => { setLocalCollapsed(v); onCollapsedChange?.(v); };
  const [sidebarWalletAmount, setSidebarWalletAmount] =
  useState<number>(0);

const [
  agentBrandingProfile,
  setAgentBrandingProfile,
] =
  useState<AgentBrandingProfile | null>(
    null,
  );

const [changePasswordOpen, setChangePasswordOpen] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [changingPassword, setChangingPassword] =
    useState(false);

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSidebarLogout = () => {
    clearToken();
    navigate("/login");
  };

  const handleChangePassword = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      toast.error(
        "Please fill all password fields",
      );
      return;
    }

    if (newPassword.length < 6) {
      toast.error(
        "New password must be at least 6 characters",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        "New password and confirm password do not match",
      );
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(
        "New password must be different from current password",
      );
      return;
    }

    try {
      setChangingPassword(true);

      await api("/auth/change-password", {
        method: "POST",
        body: {
          currentPassword,
          newPassword,
          confirmPassword,
        },
      });

      toast.success(
        "Password changed successfully",
      );

      resetPasswordForm();
      setChangePasswordOpen(false);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "Unable to change password",
      );
    } finally {
      setChangingPassword(false);
    }
  };
  const toggleParentMenu = (itemId: string, trigger: HTMLButtonElement) => {
    const willOpen = openParentId !== itemId;
    setOpenParentId(willOpen ? itemId : null);

    if (!willOpen) return;

    const sidebarShell = trigger.closest("[data-sidebar-shell]");
    if (!sidebarShell) return;

    // SidebarContent remounts when its parent state changes, so query the live
    // menu after React has rendered the expanded submenu.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const menu = sidebarShell.querySelector<HTMLElement>("[data-sidebar-nav]");
        const menuItem = Array.from(
          sidebarShell.querySelectorAll<HTMLElement>("[data-sidebar-item]"),
        ).find((element) => element.dataset.sidebarItem === itemId);
        if (!menu || !menuItem) return;

        const menuRect = menu.getBoundingClientRect();
        const itemRect = menuItem.getBoundingClientRect();
        const edgePadding = 8;
        let nextScrollTop = menu.scrollTop;

        if (itemRect.bottom > menuRect.bottom - edgePadding) {
          nextScrollTop += itemRect.bottom - menuRect.bottom + edgePadding;
        } else if (itemRect.top < menuRect.top + edgePadding) {
          nextScrollTop -= menuRect.top - itemRect.top + edgePadding;
        }

        if (nextScrollTop !== menu.scrollTop) {
          menu.scrollTo({ top: Math.max(0, nextScrollTop), behavior: "smooth" });
        }
      });
    });
  };

const user = getAuthenticatedUser();
const role = getAuthenticatedRoleId(user);

const isStaff = role === USER_ROLES.STAFF;
const isVendor = role === USER_ROLES.VENDOR;
const isAgent = role === USER_ROLES.AGENT;

const agentName = String(
  user?.agentName ||
    user?.name ||
    user?.fullName ||
    "",
).trim();

const agentCompanyName = String(
  user?.companyName || "",
).trim();

const profileName = String(
  role === USER_ROLES.VEHICLE_AGENT
    ? "DVI Demo Itinerary Agent"
    : isAgent
      ? agentName ||
        agentCompanyName ||
        "Agent"
      : user?.name ||
        user?.fullName ||
        (isStaff ? "Staff" : "AdminDvi"),
);

const profileRoleLabel =
  role === USER_ROLES.ADMIN
    ? "Super Admin"
    : isStaff
      ? "Staff"
      : isVendor
        ? "Vendor"
        : role === USER_ROLES.VEHICLE_AGENT
          ? "Itinerary Agent"
          : isAgent
            ? "Agent"
            : "User";

const liveAgentSiteLogo =
  String(
    agentBrandingProfile
      ?.config
      ?.siteLogo ?? "",
  ).trim();

const liveAgentInvoiceLogo =
  String(
    agentBrandingProfile
      ?.config
      ?.invoiceLogo ?? "",
  ).trim();

const liveAgentCompanyName =
  String(
    agentBrandingProfile
      ?.config
      ?.companyName ?? "",
  ).trim();

const sidebarSiteLogo =
  isAgent
    ? resolveAgentLogo(
        liveAgentSiteLogo,
      )
    : null;

const sidebarInvoiceLogo =
  isAgent
    ? resolveAgentLogo(
        liveAgentInvoiceLogo,
      )
    : null;

const sidebarBrandLogo =
  !isAgent
    ? DVI_LOGO
    : null;
const sidebarBrandName =
  isAgent
    ? liveAgentCompanyName ||
      agentCompanyName ||
      agentName ||
      "DoView Holidays"
    : "DoView Holidays";

const profileInitial =
  profileName.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    const loadSidebarWallet = async () => {
      if (role !== USER_ROLES.AGENT) return;

      try {
        const agentId = getAgentId();

        if (!agentId) return;

        const data = await walletService.getWallet(
          Number(agentId),
        );

        setSidebarWalletAmount(
          data.summary.cashWalletBalance || 0,
        );
      } catch (error) {
        console.error(
          "Failed to load sidebar wallet amount:",
          error,
        );
      }
    };

    loadSidebarWallet();
  }, [role]);


  useEffect(() => {
  if (!isAgent) {
    setAgentBrandingProfile(
      null,
    );

    return;
  }

  let alive = true;

  const applyProfile = (
    profile:
      AgentBrandingProfile,
  ) => {
    if (!alive) {
      return;
    }

    setAgentBrandingProfile(
      profile,
    );
  };

  const loadAgentBranding =
    async () => {
      try {
        const profile =
          (await api(
            "/agents/profile",
            {
              cache:
                "no-store",
            },
          )) as
            AgentBrandingProfile;

        applyProfile(
          profile,
        );
      } catch (error) {
        console.error(
          "Failed to load Agent branding:",
          error,
        );
      }
    };

  const handleProfileUpdated =
    (
      event: Event,
    ) => {
      const detail =
        (
          event as CustomEvent<
            AgentBrandingProfile
          >
        ).detail;

      if (detail) {
        applyProfile(
          detail,
        );

        return;
      }

      void loadAgentBranding();
    };

  void loadAgentBranding();

  window.addEventListener(
    "agent-profile-updated",
    handleProfileUpdated,
  );

  return () => {
    alive = false;

    window.removeEventListener(
      "agent-profile-updated",
      handleProfileUpdated,
    );
  };
}, [isAgent]);
  const roleFilteredMenuItems = menuItems.filter(
    (item) => {
  if (role === USER_ROLES.VEHICLE_AGENT) {
    return [
      "dashboard",
      "create-itinerary",
      "smart-booking",
      "latest-itinerary",
      "confirmed-itinerary",
      "staff",
      "wallet",
      "subscription-history",
    ].includes(item.id);
  }

if (role === USER_ROLES.AGENT) {
  return [
    "dashboard",
    "create-itinerary",
    "smart-booking",
    "latest-itinerary",
    "confirmed-itinerary",
    "staff",
    "wallet",
    "subscription-history",
    "agent-profile",
  ].includes(item.id);
}

if (isVendor) {
  return [
    "dashboard",
    "download-packages",
    "confirmed-itinerary",
    "accounts",
    "vendor-dashboard",
    "vendor-management",
    "hotspot",
    "locations",
  ].includes(item.id);
}

    // Staff starts from the internal menu set.
  // Database permissions are applied below.
  if (role === 1 || isStaff) {
    return [
      "dashboard",
      "create-itinerary",
      "smart-booking",
      "download-packages",
      "latest-itinerary",
      "confirmed-itinerary",
      "book-activities",
      "accounts",
      "hotels",
      "tbo-master-hotels",
      "axisrooms-hotels",
      "daily-moment",
      "vendor-management",
      "hotspot",
      "activity",
      "locations",
      "guide",
      "staff",
      "agent",
      "pricebook",
      "settings",
    ].includes(item.id);
  }

  return false;
});

const agentScopedMenuItems = isAgent
  ? roleFilteredMenuItems.map((item) => {
      if (item.id === "settings") {
        return {
          ...item,
          children: item.children?.filter((child) =>
            [
              "gst",
              "holidays",
              "cities",
              "language",
              "subscription-plan",
            ].includes(child.id),
          ),
        };
      }

      return item;
    })
  : roleFilteredMenuItems;

const vendorScopedMenuItems = isVendor
  ? agentScopedMenuItems
      .map((item) => {
        if (item.id === "accounts") {
          return {
            ...item,
            children: item.children?.filter(
              (child) =>
                child.id === "accounts-ledger",
            ),
          };
        }

        if (item.id === "vendor-management") {
          return {
            ...item,
            children: item.children?.filter(
              (child) =>
                child.id === "vendor" ||
                child.id === "driver",
            ),
          };
        }

        if (item.id === "hotspot") {
          return {
            ...item,
            children: item.children?.filter(
              (child) =>
                child.id === "parking-charge",
            ),
          };
        }

        if (item.id === "locations") {
          return {
            ...item,
            children: item.children?.filter(
              (child) =>
                child.id === "toll-charge",
            ),
          };
        }

        return item;
      })
      .filter(
        (item) =>
          !item.hasSubmenu ||
          (item.children?.length ?? 0) > 0,
      )
  : agentScopedMenuItems;

const filteredMenuItems =
  filterMenuItemsForStaff(
    vendorScopedMenuItems,
    user,
  );

const getMenuItemTitle = (
  item: MenuItem,
) => {
  if (
    isAgent &&
    item.id === "settings"
  ) {
    return "Travel Agent Settings";
  }

  return item.title;
};

const SidebarContent = () => (
    <div className="flex flex-col h-full">
{/* HEADER */}
<div className="flex items-center justify-between px-4 py-4 border-b">
  <div className="flex min-w-0 items-center gap-3">
{isAgent ? (
  sidebarSiteLogo && (
    <img
      src={sidebarSiteLogo}
      alt="Site Logo"
      className="h-8 max-w-[80px] object-contain"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  )
) : (
  sidebarBrandLogo && (
    <img
      src={sidebarBrandLogo}
      alt={sidebarBrandName}
      className="h-8 max-w-[110px] object-contain"
    />
  )
)}
  {!collapsed && (
    <span className="truncate font-semibold text-lg">
      {sidebarBrandName}
    </span>
  )}
</div>

  <button
    onClick={() => setCollapsed(!collapsed)}
    className="w-6 h-6 rounded-full border flex items-center justify-center text-xs hover:bg-gray-100"
  >
    ●
  </button>
</div>

      {/* MENU */}
      <nav data-sidebar-nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;

            if (item.hasSubmenu && item.children && !collapsed) {
              const isOpen = openParentId === item.id;
              return (
                <li key={item.id} data-sidebar-item={item.id}>
                  <button
                    onClick={(event) => toggleParentMenu(item.id, event.currentTarget)}
                    className="flex items-center w-full gap-3 px-4 py-2 rounded-lg hover:bg-[#f5e8ff]"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-sm text-left">
  {getMenuItemTitle(item)}
</span>
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

  const ChangePasswordDialog = () => (
    <Dialog
      open={changePasswordOpen}
      onOpenChange={(open) => {
        setChangePasswordOpen(open);

        if (!open) {
          resetPasswordForm();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Change Password
          </DialogTitle>

          <DialogDescription>
            Enter your current password and choose a new password.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleChangePassword}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="current-password">
              Current Password
            </Label>

            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(
                  event.target.value,
                )
              }
              placeholder="Enter your current password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">
              New Password
            </Label>

            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value,
                )
              }
              placeholder="Enter your new password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              Confirm Password
            </Label>

            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Confirm your new password"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={changingPassword}
              onClick={() =>
                setChangePasswordOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={changingPassword}
            >
              {changingPassword
                ? "Changing..."
                : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.id === "hotels" || item.id === "axisrooms-hotels"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#f5e8ff]",
                      isActive && "bg-gradient-to-r from-primary to-pink-500 text-white",
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                 {!collapsed && (
  <span className="text-sm">
    {getMenuItemTitle(item)}
  </span>
)}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* AGENT WALLET */}
      {role === USER_ROLES.AGENT && !collapsed && (
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
  isAgent ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-full border-t p-4 text-left hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center text-white font-semibold">
              {profileInitial}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {profileName}
              </p>

              <p className="text-xs text-pink-500">
                {profileRoleLabel}
              </p>
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-56 p-1"
      >
        <DropdownMenuItem
          className="cursor-pointer gap-3 py-3 text-pink-500 focus:text-pink-500"
          onSelect={() =>
            setChangePasswordOpen(true)
          }
        >
          <KeyRound className="h-5 w-5" />
          <span>Change Password</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="cursor-pointer gap-3 py-3 text-pink-500 focus:text-pink-500"
        >
          <a
            href={LEGACY_B2B_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={
              LEGACY_SSO_ENABLED
                ? (event) => {
                    event.preventDefault();
                    void openLegacyB2B().catch(() => {
                      toast.error(
                        "Unable to open the legacy B2B site. Please try again.",
                      );
                    });
                  }
                : undefined
            }
          >
            <ExternalLink className="h-5 w-5" />
            <span>Old Site (Legacy)</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer gap-3 py-3 text-pink-500 focus:text-pink-500"
          onSelect={handleSidebarLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="border-t p-4">
      <div className="flex items-center gap-3">
  {sidebarInvoiceLogo ? (
    <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border bg-white p-1 shadow-sm">
      <img
        src={sidebarInvoiceLogo}
        alt="Invoice Logo"
        className="max-h-full max-w-full object-contain"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-500 font-semibold text-white">
      {profileInitial}
    </div>
  )}

  <div className="min-w-0">
    <p className="truncate text-sm font-semibold">
      {profileName}
    </p>

    <p className="text-xs text-pink-500">
      {profileRoleLabel}
    </p>
  </div>
</div>
    </div>
  )
)}
    </div>
  );

  const ChangePasswordDialog = () => (
  <Dialog
    open={changePasswordOpen}
    onOpenChange={(open) => {
      setChangePasswordOpen(open);

      if (!open) {
        resetPasswordForm();
      }
    }}
  >
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          Change Password
        </DialogTitle>

        <DialogDescription>
          Enter your current password and choose a new password.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleChangePassword}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="current-password">
            Current Password
          </Label>

          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) =>
              setCurrentPassword(event.target.value)
            }
            placeholder="Enter your current password"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">
            New Password
          </Label>

          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) =>
              setNewPassword(event.target.value)
            }
            placeholder="Enter your new password"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">
            Confirm Password
          </Label>

          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            placeholder="Confirm your new password"
            required
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={changingPassword}
            onClick={() => {
              resetPasswordForm();
              setChangePasswordOpen(false);
            }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={changingPassword}
          >
            {changingPassword
              ? "Changing..."
              : "Confirm"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

return (
  <>
    <ChangePasswordDialog />

    <Sheet
      open={mobileOpen}
      onOpenChange={onMobileToggle}
    >
        <SheetContent data-sidebar-shell side="left" className="w-64 p-0 md:hidden">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <aside
        data-sidebar-shell
        className="hidden md:flex fixed left-0 top-0 h-screen bg-white border-r flex-col transition-all duration-300"
        style={{ width: collapsed ? "5rem" : "16rem" }}
      >
        <SidebarContent />
      </aside>
    </>
  );
};
