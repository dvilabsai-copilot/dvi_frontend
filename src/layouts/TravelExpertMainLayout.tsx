import { ImpersonationBanner } from "@/components/auth/ImpersonationBanner";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./TravelExpertSidebar";
import "./dvi-mmt-hero.css";
import { Topbar, getDviPageTitle } from "./TravelExpertTopbar";
import { getAuthenticatedRoleId } from "@/services/accessControl";
import { isTravelExpertUIAccount } from "@/services/accessControl";
import { USER_ROLES } from "@/constants/systemRoles";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // kept for future use, currently driven by Sidebar internally via callback
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  // DVI unified sticky navigation
  const [isDviMenuCompact, setIsDviMenuCompact] = useState(false);

  useEffect(() => {
    // DVI_SCROLL_NAV_SMOOTH_V2: passive scroll + one animation frame per viewport refresh.
    // Keep previous thresholds: collapse below the fold, expand near the top.
    let compact = window.scrollY > 24;
    let frame: number | null = null;
    setIsDviMenuCompact(compact);

    const measure = () => {
      frame = null;
      const y = window.scrollY;
      // DVI_NAV_EARLY_COLLAPSE_V5_20261027: compact early to avoid overlaying scrolling page content.
      const nextCompact = compact ? y > 6 : y > 24;
      if (compact === nextCompact) return;
      compact = nextCompact;
      setIsDviMenuCompact(compact);
    };

    const onScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);
  // DVI_ROLE8_ONLY_GUARD_20261027: UI redesign belongs ONLY to Travel Expert login (role 8).
  const isTravelExpertLayout = isTravelExpertUIAccount();
  const horizontalNavOnCreateItinerary = isTravelExpertLayout;
  // Agent accounts retain their original Topbar banner layout.
  const compactNavInHeader = isTravelExpertLayout;

  const isDownloadPackagesPage =
    location.pathname.toLowerCase().includes("/download-packages");

  const shell =
    "mx-auto w-full max-w-[1920px] 2xl:max-w-[2048px] px-4 lg:px-6";

  const contentShell = isDownloadPackagesPage ? "w-full" : "w-full px-4 lg:px-6";

  // The nav surface uses a stable document height; no scroll-time DOM measurement.
  // Its desktop positions transition in CSS without altering content margins.


  return (
    <>
      <ImpersonationBanner />
      <div className={isTravelExpertLayout ? "dvi-mmt-root flex min-h-screen w-full bg-background" : "flex min-h-screen w-full bg-background"} data-dvi-mmt={compactNavInHeader ? "true" : "false"} data-dvi-scroll-mini={isDviMenuCompact ? "true" : "false"} style={{ overflowX: "clip" }}>
      {/* Reserve sidebar space only on desktop; mobile uses overlay sheet. */}
      <div
        className={horizontalNavOnCreateItinerary ? "hidden" : "hidden md:block transition-all duration-300 shrink-0"}
        style={{ width: sidebarCollapsed ? "5rem" : "16rem" }}
      />



      <div className="flex min-w-0 flex-1 flex-col min-h-screen">
        {compactNavInHeader ? (
          <div className="dvi-mmt-hero">
            <div className={`${shell} dvi-mmt-hero-shell`}>
  <div className="dvi-mmt-brand">
    <button
  type="button"
  onClick={() => window.location.reload()}
  aria-label="Refresh current DVI page"
  title="Refresh page"
  className="inline-flex cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
>
  <img src={isDviMenuCompact ? "/assets/img/dvi-header-transparent.png" : "/assets/img/dvi-header-white-red-v2.png"} alt="DVI Holidays" />
</button>
  </div>
            <div className="dvi-mmt-nav-slot hidden min-w-0 md:block">
              <Sidebar
                mobileOpen={mobileMenuOpen}
                onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
                horizontalDesktop={horizontalNavOnCreateItinerary}
              />
            </div>
            <div className="dvi-mmt-actions-slot min-w-0">
              <Topbar
                onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                movePageTitleBelowNav={horizontalNavOnCreateItinerary}
                compactHorizontalHeader
              />
            </div>
            </div>
          </div>
        ) : (
          <>
            <div className={shell}>
              <Topbar
                onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                movePageTitleBelowNav={horizontalNavOnCreateItinerary}
              />
            </div>
            <Sidebar
              mobileOpen={mobileMenuOpen}
              onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
              horizontalDesktop={horizontalNavOnCreateItinerary}
            />
          </>
        )}
        {horizontalNavOnCreateItinerary && !isDownloadPackagesPage && !["/confirmed-itinerary", "/agent"].includes(location.pathname.toLowerCase().replace(/\/+$/, "") || "/") && (
          <div className={`${shell} dvi-mmt-page-title`}>
            <h4 className="py-3 text-xl font-bold text-foreground sm:text-2xl">
              {getDviPageTitle(location.pathname.toLowerCase(), getAuthenticatedRoleId() === USER_ROLES.AGENT)}
            </h4>
          </div>
        )}

        <main className="dvi-mmt-main relative flex-1 min-h-0 w-full">
          <div className={contentShell}>{children}</div>
        </main>

        {!isDownloadPackagesPage && (
          <footer className="border-t border-border bg-white py-4">
            <div className={shell}>
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                DVI Holidays @ {new Date().getFullYear()}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
    </>
  );
};
