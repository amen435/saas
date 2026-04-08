import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import MobileBottomNav from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [isMobile]);

  const marginLeft = isMobile ? 0 : collapsed ? 68 : 220;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <AppSidebar
        collapsed={isMobile ? false : collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className="transition-all duration-300"
        style={{ marginLeft }}
      >
        <TopBar onMenuToggle={() => setMobileOpen(true)} />
        <main className="p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
