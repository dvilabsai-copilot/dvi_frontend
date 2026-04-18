import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isDownloadPackagesPage =
    location.pathname.toLowerCase().includes("/download-packages");

  const shell =
    "mx-auto w-full max-w-[1920px] 2xl:max-w-[2048px] px-4 lg:px-6";

  const contentShell = isDownloadPackagesPage ? "w-full" : "w-full px-4 lg:px-6";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <Sidebar
  mobileOpen={mobileMenuOpen}
  onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
/>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className={shell}>
          <Topbar
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
        </div>

        <main className="relative flex-1 w-full">
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
  );
};