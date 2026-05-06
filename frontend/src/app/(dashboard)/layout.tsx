import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";

/**
 * Shell del dashboard: sidebar fija de 256px, topbar fija de 64px,
 * contenido offset con pl-64 + pt-16. El bg-blueprint es el dotted
 * radial-gradient que define el sistema "Kinetic Blueprint".
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <Sidebar />
      <main className="pl-64 pt-16 min-h-screen bg-blueprint">{children}</main>
    </>
  );
}
