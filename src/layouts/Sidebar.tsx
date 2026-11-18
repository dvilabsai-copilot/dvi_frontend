import { AgentBrandHeader } from "./AgentBrandHeader";
import "./agent-real-brand.css";
// DVI_AGENT_BRAND_SYNC_V2
// DVI_AGENT_EXISTING_PROFILE_BRAND_V1
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

  Car,
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
  isCarRentalManagementAccount,
} from "@/services/accessControl";
import {
  LEGACY_B2B_URL,
  LEGACY_SSO_ENABLED,
  openLegacyB2B,
} from "@/services/legacySso";
import { USER_ROLES } from "@/constants/systemRoles";
import { getAgentDisplayName, unpackAgentProfile } from "@/services/agentDisplayIdentity";
import "./agent-sidebar-reference-v2.css";

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
  {
    id: "transport-allocation",
    title: "Transport Allocation",
    icon: Car,
    path: "/transport-allocation",
  },
  { id: "download-packages", title: "Download Packages", icon: FileText, path: "/download-packages" },
  { id: "book-activities", title: "Book Activities", icon: TicketCheck, path: "/book-activities" },
   {
    id: "accounts",
    title: "Accounts & Finance",
    icon: Wallet,
    path: "/accounts",
    hasSubmenu: true,
    children: [
      { id: "accounts-overview", title: "Overview", path: "/accounts-overview" },
      { id: "accounts-search-booking", title: "Search Booking", path: "/accounts-search-booking" },
      { id: "accounts-invoices", title: "Invoices", path: "/accounts-invoices" },
      { id: "accounts-vendor-bills", title: "Vendor Bills", path: "/accounts-vendor-bills" },
      { id: "accounts-payments", title: "Payments", path: "/accounts-payments" },
      { id: "accounts-ledgers", title: "Ledgers", path: "/accounts-ledgers" },
      { id: "accounts-gst", title: "GST", path: "/accounts-gst" },
      { id: "accounts-reports", title: "Reports", path: "/accounts-reports" },
      { id: "accounts-sync", title: "Tally / Zoho Sync", path: "/accounts-sync" },
      { id: "accounts-settings", title: "Settings", path: "/accounts-settings" },
    ],
  },

  {
    id: "vendor-dashboard",
    title: "Vendor Dashboard",
    icon: Gauge,
    path: "/vendor-dashboard",
  },
  {
    id: "my-bank-details",
    title: "My Bank Details",
    icon: Wallet,
    path: "/my-bank-details",
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
      { id: "locations-cities", title: "Cities", path: "/locations/cities" },
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
      { id: "agent-advertisements", title: "Advertisement", path: "/settings/advertisements" },
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
// Same DVI sidebar UI; the CRM role receives ONLY these six menu entries.
const carRentalMenuItems: MenuItem[] = [
  { id: "crm-dashboard", title: "Dashboard", icon: Home, path: "/car-rental" },
  { id: "crm-enquiries", title: "Enquiries", icon: FileText, path: "/car-rental/enquiries" },
  { id: "crm-bookings", title: "Bookings", icon: CheckCircle, path: "/car-rental/bookings" },
  { id: "crm-fleet", title: "Fleet", icon: Car, path: "/car-rental/fleet" },
  { id: "crm-accounts", title: "Accounts", icon: Wallet, path: "/car-rental/accounts" },
  { id: "crm-reports", title: "Reports", icon: Gauge, path: "/car-rental/reports" },
  { id: "crm-settings", title: "CRM Settings", icon: Settings, path: "/car-rental/permissions" },
];
interface SidebarProps { mobileOpen: boolean; onMobileToggle: () => void; collapsed?: boolean; onCollapsedChange?: (v: boolean) => void }

export const Sidebar = ({ mobileOpen, onMobileToggle, collapsed: collapsedProp, onCollapsedChange }: SidebarProps) => {
  const navigate = useNavigate();

  const [openParentId, setOpenParentId] = useState<string | null>(null);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : localCollapsed;
  const setCollapsed = (v: boolean) => { setLocalCollapsed(v); onCollapsedChange?.(v); };
  // DVI_AGENT_SIDEBAR_STABLE_V1: keep the last loaded Agent wallet value when the sidebar remounts.
const [sidebarWalletAmount, setSidebarWalletAmount] = useState<number>(() => {
  const identity = getAuthenticatedUser();
  if (getAuthenticatedRoleId(identity) !== USER_ROLES.AGENT) return 0;
  const sub = String(identity?.sub ?? "").trim();
  if (!sub) return 0;
  try {
    const cached = window.sessionStorage.getItem(`dvi.agent.sidebar.wallet.v1:${sub}`);
    if (cached !== null && cached !== "" && Number.isFinite(Number(cached))) {
      return Number(cached);
    }
  } catch { /* Session storage might be blocked. */ }
  return 0;
});

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

const [
  passwordMode,
  setPasswordMode,
] = useState<"change" | "set">(
  "change",
);

const [
  checkingPasswordStatus,
  setCheckingPasswordStatus,
] = useState(false);

 const resetPasswordForm = () => {
  setCurrentPassword("");
  setNewPassword("");
  setConfirmPassword("");
};

const openPasswordDialog = async () => {
  try {
    setCheckingPasswordStatus(true);

    const status = await api(
      "/auth/password-status",
      {
        method: "GET",
      },
    );

    setPasswordMode(
      status?.mode === "set"
        ? "set"
        : "change",
    );

    resetPasswordForm();
    setChangePasswordOpen(true);
  } catch (error: any) {
    toast.error(
      error?.message ||
        "Unable to load password status",
    );
  } finally {
    setCheckingPasswordStatus(false);
  }
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
    !newPassword ||
    !confirmPassword ||
    (
      passwordMode === "change" &&
      !currentPassword
    )
  ) {
    toast.error(
      passwordMode === "change"
        ? "Please fill all password fields"
        : "Please enter and confirm your new password",
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

  if (
    passwordMode === "change" &&
    currentPassword === newPassword
  ) {
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
        currentPassword:
          passwordMode === "change"
            ? currentPassword
            : undefined,
        newPassword,
        confirmPassword,
      },
    });

    toast.success(
      passwordMode === "set"
        ? "Password set successfully"
        : "Password changed successfully",
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
const isCarRental = isCarRentalManagementAccount(user);
// Scope these display changes to the Accounts login (role 6) only.
const isAccountsPanel = role === USER_ROLES.ACCOUNTS;
const accountsLoginName = isAccountsPanel
  ? ([user?.fullName, user?.name]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) ||
    String(user?.email ?? "").split("@")[0].trim() ||
    "Accounts User")
  : "";

const isStaff =
  role === USER_ROLES.STAFF;

const isVendor =
  role === USER_ROLES.VENDOR;

const isAgent =
  role === USER_ROLES.AGENT;

const isTravelExpert =
  role ===
  USER_ROLES.TRAVEL_EXPERT;

const agentName = String(
  user?.agentName ||
    user?.name ||
    user?.fullName ||
    "",
).trim();

const agentCompanyName = String(
  user?.companyName || "",
).trim();

const agentSidebarIdentity = agentBrandingProfile as (AgentBrandingProfile & {
  agent_ID?: number | null;
  agent_name?: string | null;
  agent_lastname?: string | null;
}) | null;
const agentSidebarFullName = getAgentDisplayName(agentBrandingProfile, user);
const agentSidebarBrandText = String(
  agentBrandingProfile?.config?.companyName ||
  user?.companyName ||
  agentSidebarFullName ||
  user?.agentName ||
  user?.name ||
  "Agent"
).trim();
const [agentSidebarLogoError, setAgentSidebarLogoError] = useState<string | null>(null);

const profileName = String(
  isAccountsPanel
    ? accountsLoginName
    : role === USER_ROLES.VEHICLE_AGENT
    ? "DVI Demo Itinerary Agent"
    : isAgent
      ? agentName ||
        agentCompanyName ||
        "Partner"
      : user?.name ||
        user?.fullName ||
        (
          isTravelExpert
            ? "Travel Expert"
            : isStaff
              ? "Staff"
              : "AdminDvi"
        ),
);

const profileRoleLabel =
  isAccountsPanel ? "Accounts" :
  isCarRental ? "Car Rental Management" :
  role === USER_ROLES.ADMIN
    ? "Super Admin"
    : isStaff
      ? "Staff"
      : isTravelExpert
        ? "Travel Expert"
        : isVendor
          ? "Vendor"
          : role ===
              USER_ROLES.VEHICLE_AGENT
            ? "Itinerary Agent"
            : isAgent
              ? "Agent"
              : "User";

const liveAgentSiteLogo =
  String(
    agentBrandingProfile
      ?.config
      ?.siteLogo || user?.siteLogo || "",
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
        liveAgentSiteLogo || user?.siteLogo || liveAgentInvoiceLogo
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
  isCarRental ? "DVI Car Rental CRM" :
  isAgent
    ? (liveAgentCompanyName || agentSidebarBrandText || "Agent")
    : "DoView Holidays";


const profileInitial = (isAccountsPanel ? accountsLoginName : isAgent ? agentSidebarFullName : profileName).trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    const loadSidebarWallet = async () => {
      if (role !== USER_ROLES.AGENT) return;

      try {
        const agentId = getAgentId() || Number(agentSidebarIdentity?.agent_ID || 0);

        if (!agentId) return;

        const data = await walletService.getWallet(
          Number(agentId),
        );

        const fetchedBalance = Number(data.summary.cashWalletBalance);
        if (Number.isFinite(fetchedBalance)) {
          setSidebarWalletAmount(fetchedBalance);
          const sub = String(getAuthenticatedUser()?.sub ?? "").trim();
          if (sub) {
            try {
              window.sessionStorage.setItem(`dvi.agent.sidebar.wallet.v1:${sub}`, String(fetchedBalance));
            } catch { /* Session storage might be blocked. */ }
          }
        }
      } catch (error) {
        console.error(
          "Failed to load sidebar wallet amount:",
          error,
        );
      }
    };

    loadSidebarWallet();
  }, [role, agentSidebarIdentity?.agent_ID]);


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

    setAgentBrandingProfile(unpackAgentProfile(profile) as AgentBrandingProfile);
  };

  // DVI_AGENT_CONFIG_FALLBACK_V1
  const loadAgentBranding = async () => {
    let existingProfile: AgentBrandingProfile | null = null;

    try {
      const response = await api("/agents/profile", {
        cache: "no-store",
      });

      const profile = unpackAgentProfile(
        response,
      ) as AgentBrandingProfile;

      existingProfile = profile;

      if (
        profile.config?.siteLogo ||
        profile.config?.invoiceLogo ||
        profile.config?.companyName
      ) {
        applyProfile(profile);
        return;
      }
    } catch (error) {
      console.warn(
        "Agent profile unavailable. Checking saved agent configuration.",
        error,
      );
    }

    const agentId = getAgentId();

    if (agentId > 0) {
      try {
        const response = await api(
          `/agents/${agentId}/config`,
          { cache: "no-store" },
        );

        const result = unpackAgentProfile(response) as
          AgentBrandingProfile & {
            siteLogo?: string | null;
            invoiceLogo?: string | null;
            companyName?: string | null;
          };

        const config = result.config || {
          siteLogo: result.siteLogo ?? null,
          invoiceLogo: result.invoiceLogo ?? null,
          companyName: result.companyName ?? null,
        };

        if (
          config.siteLogo ||
          config.invoiceLogo ||
          config.companyName
        ) {
          applyProfile({
            ...(existingProfile || {}),
            config,
          });
          return;
        }
      } catch (error) {
        console.error(
          "Unable to load saved Agent company configuration:",
          error,
        );
      }
    }

    if (existingProfile) {
      applyProfile(existingProfile);
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
  if (item.id === "transport-allocation") {
    return role === USER_ROLES.ADMIN;
  }
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

// DVI_ACCOUNTS_MENU_ROLE6_20261118: add Super Admin navigation ONLY for role 6.
if (role === USER_ROLES.ACCOUNTS) {
  return [
    "dashboard",
    "create-itinerary",
    "latest-itinerary",
    "confirmed-itinerary",
    "accounts", // keep Accounts & Finance
    "hotels",
    "tbo-master-hotels",
    "axisrooms-hotels",
    "daily-moment",
    "vendor-management",
    "hotspot",
    "activity",
    "guide",
    "staff",
    "pricebook",
    "settings",
  ].includes(item.id);
}

if (isVendor) {
  return [
    "dashboard",
    "download-packages",
    "confirmed-itinerary",
    "accounts",
    "vendor-dashboard",
    "my-bank-details",
    "vendor-management",
    "hotspot",
    "locations",
  ].includes(item.id);
}

/*
 * Travel Expert sidebar.
 *
 * Keep this aligned with the existing
 * Travel Expert panel in DVI.
 */
if (isTravelExpert) {
  return [
    "dashboard",
    "create-itinerary",
    "smart-booking",
    "latest-itinerary",
    "confirmed-itinerary",
    "daily-moment",
    "vendor-management",
    "hotspot",
    "activity",
    "agent",
    "settings",
  ].includes(item.id);
}

/*
 * Admin and Staff continue using
 * the existing internal menu set.
 */
if (
  role === USER_ROLES.ADMIN ||
  isStaff
) {
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
  },
);

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
              (child) => child.id.startsWith("accounts-"),
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

// DVI_ACCOUNTS_HIDE_ROLE_PERMISSION_20261118: Accounts-only Settings submenu filter.
const accountsScopedMenuItems =
  role === USER_ROLES.ACCOUNTS
    ? vendorScopedMenuItems.map((item) =>
        item.id === "settings"
          ? { ...item, children: item.children?.filter((child) => child.id !== "role-permission") }
          : item
      )
    : vendorScopedMenuItems;
const filteredMenuItems = isCarRental
  ? carRentalMenuItems
  : filterMenuItemsForStaff(
      accountsScopedMenuItems.map((item) => item.id === "settings" && role !== USER_ROLES.ADMIN && role !== USER_ROLES.ACCOUNTS
        ? { ...item, children: item.children?.filter((child) => child.id !== "agent-advertisements") }
        : item),
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
{/* DVI_AGENT_REAL_BRAND_HEADER_20261111 */}
{isAgent ? (
  <AgentBrandHeader collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
) : (
  <>

{/* DVI_AGENT_REAL_LOGO_COMPACT_FOOTER_V3 */}
<div className={isAgent ? "dvi-agent-sidebar-header flex items-center justify-between px-4 py-4 border-b" : isAccountsPanel ? "flex items-center justify-between gap-1.5 border-b px-2 py-3" : "flex items-center justify-between px-4 py-4 border-b"}>
  <div className={isAgent ? "flex min-w-0 flex-col items-start gap-1" : isAccountsPanel ? "flex min-w-0 flex-1 items-center gap-2" : "flex min-w-0 items-center gap-3"}>
{isAgent ? (
  (sidebarSiteLogo || sidebarInvoiceLogo) && agentSidebarLogoError !== (sidebarSiteLogo || sidebarInvoiceLogo) && (
    <img
      src={sidebarSiteLogo || sidebarInvoiceLogo}
      alt={agentSidebarBrandText}
      className="dvi-agent-sidebar-logo h-auto max-h-[60px] max-w-[180px] object-contain"
      onError={() => setAgentSidebarLogoError(sidebarSiteLogo || sidebarInvoiceLogo)}
    />
  )
) : (
  sidebarBrandLogo && (
    <img
      src={sidebarBrandLogo}
      alt={isAgent ? agentSidebarBrandText : sidebarBrandName}
      className={isAccountsPanel ? (collapsed ? "h-7 w-7 shrink-0 object-contain" : "h-10 w-10 shrink-0 object-contain") : "h-8 max-w-[110px] object-contain"}
    />
  )
)}
  {!collapsed && (
    <span className={isAccountsPanel ? "min-w-0 truncate whitespace-nowrap text-[17px] font-bold tracking-tight leading-tight" : "max-w-[180px] break-words text-sm font-semibold leading-snug"}>
      {sidebarBrandName}
    </span>
  )}
</div>

  <button
    onClick={() => setCollapsed(!collapsed)}
    className={isAccountsPanel ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs hover:bg-gray-100" : "w-6 h-6 rounded-full border flex items-center justify-center text-xs hover:bg-gray-100"}
  >
    ●
  </button>
</div>

      
  </>
)}

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


  return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.id === "crm-dashboard" || item.id === "hotels" || item.id === "axisrooms-hotels"}
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
          className="dvi-agent-profile-trigger w-full border-t p-4 text-left hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center text-white font-semibold">
              {profileInitial}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {agentSidebarFullName || profileName}
              </p>

              <p className="text-xs text-pink-500">
                {isAgent ? "Partner" : profileRoleLabel}
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
         disabled={
  checkingPasswordStatus
}
onSelect={() => {
  void openPasswordDialog();
}}
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

  <div className={isAccountsPanel ? "min-w-0 flex-1" : "min-w-0"}>
    <p className={isAccountsPanel ? "break-words text-xs font-semibold leading-snug" : "truncate text-sm font-semibold"} title={isAccountsPanel ? profileName : undefined}>
      {profileName}
    </p>

    <p className="text-xs text-pink-500">
      {isAgent ? "Partner" : profileRoleLabel}
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
  {passwordMode === "set"
    ? "Set Password"
    : "Change Password"}
</DialogTitle>

<DialogDescription>
  {passwordMode === "set"
    ? "Create a password for your Agent account."
    : "Enter your current password and choose a new password."}
</DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleChangePassword}
        className="space-y-4"
      >
        {passwordMode === "change" && (
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
)}

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
        <SheetContent data-agent-reference={isAgent ? "true" : undefined} data-sidebar-shell data-agent-panel={isAgent ? "true" : undefined} side="left" className="w-64 p-0 md:hidden">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <aside
        data-sidebar-shell
        data-agent-reference={isAgent ? "true" : undefined} data-agent-panel={isAgent ? "true" : undefined}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-white border-r flex-col transition-all duration-300"
        style={{ width: collapsed ? "5rem" : "16rem" }}
      >
        <SidebarContent />
      </aside>
    </>
  );
};


