import { Button } from "@/components/ui/button";
import { clearToken, getToken } from "@/lib/api";
import { ChevronRight, Home, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface TopbarProps {
  onMobileMenuToggle: () => void;
}

export const Topbar = ({ onMobileMenuToggle }: TopbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const authed = !!getToken();

  const path = location.pathname.toLowerCase();
  const isDownloadPackagesPage = path.includes("/download-packages");

  const getPageTitle = () => {
    if (path.includes("/create-itinerary")) return "Create Itinerary";
    if (path.includes("/latest-itinerary")) return "Latest Itinerary";
    if (path.includes("/confirmed-itinerary")) return "Confirmed Itinerary";
    if (path.includes("/cancelled-itinerary")) return "Cancelled Itinerary";
    if (path.includes("/accounts-ledger")) return "Accounts Ledger";
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
    if (path.includes("/profile")) return "Profile";
    if (path.includes("/settings")) return "Settings";
    if (path.includes("/download-packages")) return "Download Packages";
    return "Dashboard";
  };

  const pageTitle = getPageTitle();

  return (
    <div className="border-b border-border bg-white">
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
          <nav aria-label="breadcrumb" className="hidden sm:block">
            <ol className="flex items-center gap-2 text-sm">
              <li className="flex items-center">
                <Home className="h-4 w-4 text-muted-foreground" />
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-primary">
                  {isDownloadPackagesPage ? "Dashboard" : pageTitle}
                </span>
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
              <li className="flex items-center">
                <Home className="h-4 w-4 text-muted-foreground" />
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-primary">{pageTitle}</span>
              </li>
            </ol>
          </nav>
        </div>
      )}
    </div>
  );
};