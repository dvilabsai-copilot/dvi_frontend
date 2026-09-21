import {
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  api,
  clearToken,
  getToken,
} from "@/lib/api";

import {
  ChevronRight,
  ExternalLink,
  Menu,
  UserCog,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthenticatedRoleId } from "@/services/accessControl";
import {
  LEGACY_B2B_URL,
  LEGACY_SSO_ENABLED,
  openLegacyB2B,
} from "@/services/legacySso";
import { USER_ROLES } from "@/constants/systemRoles";
import { toast } from "sonner";

type AgentTravelExpertProfile = {
  travel_expert_id?: number | null;
  travel_expert_label?: string | null;
  travel_expert_mobile?: string | null;
};

interface TopbarProps {
  onMobileMenuToggle: () => void;
}
export const Topbar = ({ onMobileMenuToggle }: TopbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const authed = !!getToken();

const path = location.pathname.toLowerCase();
const isDownloadPackagesPage = path.includes("/download-packages");

const role = getAuthenticatedRoleId();
const isAgent = role === USER_ROLES.AGENT;

const [
  travelExpertProfile,
  setTravelExpertProfile,
] = useState<AgentTravelExpertProfile | null>(
  null,
);

const getPageTitle = () => {
    if (path.includes("/smart-booking")) return "Smart Booking";
    if (path.includes("/create-itinerary")) return "Create Itinerary";
    if (path.includes("/latest-itinerary")) return "Latest Itinerary";
    if (path.includes("/confirmed-itinerary")) return "Confirmed Itinerary";
  if (path.includes("/subscription-history")) return "Subscription History";
if (path.includes("/profile")) return "Profile";
    if (path.includes("/accounts-manager")) return "Accounts Manager";
    if (path.includes("/accounts")) return "Accounts";
    if (path.includes("/daily-moment")) return "Daily Moment Tracker";
    if (path.includes("/vendor")) return "Vendor";
    if (path.includes("/drivers")) return "Drivers";
    if (path.includes("/vehicles")) return "Vehicles";
    if (path.includes("/guide")) return "Guide";
    if (path.includes("/activities")) return "Activity";
    if (path.includes("/activity")) return "Activity";
    if (path.includes("/hotspots")) return "Hotspot";
    if (path.includes("/hotspot")) return "Hotspot";
    if (path.includes("/hotels")) return "Hotels";
    if (path.includes("/locations")) return "Locations";
    if (path.includes("/staff")) return "Staff";
    if (path.includes("/agent")) return "Agent";
    if (path.includes("/wallet-history")) return "Wallet History";
   if (path.includes("/subscription-history")) return "Subscription History";
if (path.includes("/travel-expert-settings")) return "My Travel Expert";
if (path.includes("/profile")) return "Profile";

if (path.includes("/settings")) {
  return isAgent
    ? "Travel Agent Settings"
    : "Settings";
}
    if (path.includes("/download-packages")) return "Download Packages";
    return "Dashboard";
  };

const pageTitle = getPageTitle();

useEffect(() => {
  if (!isAgent) {
    setTravelExpertProfile(null);
    return;
  }

  let alive = true;

  const loadTravelExpert = async () => {
    try {
      const profile =
        (await api(
          "/agents/profile",
          {
            cache: "no-store",
          },
        )) as AgentTravelExpertProfile;

      if (alive) {
        setTravelExpertProfile(
          profile,
        );
      }
    } catch (error) {
      console.error(
        "Failed to load Travel Expert details:",
        error,
      );

      if (alive) {
        setTravelExpertProfile(
          null,
        );
      }
    }
  };

  void loadTravelExpert();

  return () => {
    alive = false;
  };
}, [isAgent]);

const travelExpertName =
  String(
    travelExpertProfile
      ?.travel_expert_label ??
      "",
  ).trim();

const travelExpertMobile =
  String(
    travelExpertProfile
      ?.travel_expert_mobile ??
      "",
  ).trim();

const hasTravelExpert =
  Number(
    travelExpertProfile
      ?.travel_expert_id ??
      0,
  ) > 0 ||
  Boolean(
    travelExpertName ||
      travelExpertMobile,
  );

return (
  <div className="border-b border-border bg-white">
    {isAgent && !isDownloadPackagesPage && (
      <div className="flex justify-center overflow-hidden bg-[#fff9fd]">
        <div className="w-full bg-[#6878d5] px-4 py-2 text-white sm:w-auto sm:min-w-[560px] sm:-skew-x-12">
          <div className="flex items-center justify-center gap-2 text-center text-sm font-semibold sm:skew-x-12 sm:text-base">
            <UserCog className="h-5 w-5 shrink-0" />

            {hasTravelExpert ? (
              <span>
                Travel Expert -{" "}
                {travelExpertName ||
                  "Not Entered"}
                {travelExpertMobile
                  ? ` - ${travelExpertMobile}`
                  : ""}
              </span>
            ) : (
              <span>
                Travel Expert - Not Assigned
              </span>
            )}
          </div>
        </div>
      </div>
    )}

    <div className="flex items-center justify-between py-4 sm:py-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {!isDownloadPackagesPage && (
            <h4 className="text-xl font-bold text-foreground sm:text-2xl">
              {pageTitle}
            </h4>
          )}
        </div>

        <div className="flex items-center gap-3">
          {authed && !isDownloadPackagesPage && (
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
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
            >
              <ExternalLink className="h-4 w-4" />
              Old Site (B2B)
            </a>
          )}

          <nav aria-label="breadcrumb" className="hidden sm:block">

            <ol className="flex items-center gap-2 text-sm">
  <li>
   <button
  type="button"
  onClick={() => navigate("/")}
  className="flex items-center gap-2 font-medium text-primary hover:underline"
>
  Dashboard
  <ChevronRight className="h-4 w-4 text-muted-foreground" />
</button>
  </li>
</ol>

          </nav>

          {!isDownloadPackagesPage &&
            (authed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearToken();
                  navigate("/login");
                }}
              >
                Logout
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            ))}
        </div>
      </div>

     {!isDownloadPackagesPage && (
  <div className="px-4 pb-3 sm:hidden">
    <nav aria-label="breadcrumb">
      <ol className="flex items-center gap-2 text-sm">
        <li>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="font-medium text-primary hover:underline"
          >
            Dashboard 
          </button>
        </li>
      </ol>
    </nav>
  </div>
)}

    </div>
  );
};
