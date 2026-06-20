"use client";

import { useSidebar } from "./SidebarContext";

/** Contenido principal del dashboard, con offset dinámico según la sidebar. */
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main
      className="pt-16 min-h-screen bg-blueprint transition-[padding] duration-200 ease-out"
      style={{ paddingLeft: collapsed ? "64px" : "256px" }}
    >
      {children}
    </main>
  );
}
