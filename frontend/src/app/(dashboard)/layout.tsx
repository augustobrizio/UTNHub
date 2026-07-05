import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { SidebarProvider } from "@/components/SidebarContext";
import { DashboardMain } from "@/components/DashboardMain";

/**
 * Shell del dashboard: sidebar colapsable (256px / 64px), topbar fija de 64px,
 * contenido con offset dinámico + pt-16. El bg-blueprint es el dotted
 * radial-gradient que define el sistema "Kinetic Blueprint".
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <TopNav />
      <Sidebar />
      <DashboardMain>{children}</DashboardMain>
    </SidebarProvider>
  );
}
