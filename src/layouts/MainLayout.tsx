// src/layouts/MainLayout.tsx

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const shell =
    "mx-auto w-full max-w-[1920px] 2xl:max-w-[2048px] px-4 lg:px-6";

  const contentShell = "w-full px-4 lg:px-6";

  return (
    <div className="min-h-screen w-full bg-background flex">

      {/* SIDEBAR */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOPBAR */}
        <div className={shell}>
          <Topbar
            onMobileMenuToggle={() =>
              setMobileMenuOpen(!mobileMenuOpen)
            }
          />
        </div>

        {/* PAGE CONTENT */}
        <main className="flex-1 w-full relative">
          <div className={contentShell}>{children}</div>
        </main>

        {/* FOOTER */}
        <footer className="bg-white border-t border-border py-4">
          <div className={shell}>
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              DVI Holidays @ {new Date().getFullYear()}
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
};