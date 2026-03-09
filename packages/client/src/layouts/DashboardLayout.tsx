import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/dashboard/Sidebar";
import { Header } from "../components/dashboard/Header";
import { BetaBanner } from "../components/billing/BetaBanner";
import { MobileBottomNav } from "../components/dashboard/MobileBottomNav";
import { InstallBanner } from "../components/pwa/InstallBanner";

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BetaBanner />
        <Header />
        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <InstallBanner />
    </div>
  );
}
