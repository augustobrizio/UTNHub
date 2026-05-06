"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sidebar fija de 256px. Replica la estetica del Stitch (dark, sin
 * borders solidas, item activo con border-r-2 secondary y glow).
 *
 * El item activo se calcula con `usePathname` — basta con que la
 * pestana coincida con el primer segmento.
 */

interface NavItem {
  label: string;
  /** Material Symbol id (https://fonts.google.com/icons). */
  icon: string;
  href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/" },
  { label: "Chatbot", icon: "smart_toy", href: "/chat" },
  { label: "Calendario", icon: "calendar_month", href: "/calendario" },
  { label: "Grafo/Carrera", icon: "account_tree", href: "/materias" },
  { label: "Novedades", icon: "campaign", href: "/novedades" },
  { label: "Profesores", icon: "badge", href: "/profesores" },
  { label: "Perfil", icon: "person", href: "/perfil" },
] as const;

function isActive(currentPath: string, href: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-40 bg-[#0b1326] flex flex-col py-8 px-4 space-y-2 pt-20 bg-gradient-to-r from-transparent to-slate-800/20">
      <div className="px-4 mb-8">
        <h2 className="text-primary font-black uppercase tracking-widest text-xs mb-1 font-headline">
          Student Panel
        </h2>
        <p className="text-outline text-[10px] font-medium tracking-wide font-body">
          Engineering Blueprint
        </p>
      </div>

      <nav className="flex flex-col space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          const baseClasses =
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group";
          const stateClasses = active
            ? "bg-primary/10 text-primary border-r-2 border-secondary shadow-[0_0_15px_rgba(125,255,162,0.2)]"
            : "text-outline hover:text-on-surface hover:bg-surface-container/40";

          return (
            <Link key={item.href} href={item.href} className={`${baseClasses} ${stateClasses}`}>
              <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 duration-200">
                {item.icon}
              </span>
              <span className="font-body text-sm font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/5 px-4 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-primary/20 text-primary font-headline font-bold">
            JR
          </div>
          <div>
            <p className="text-on-surface font-semibold text-xs">Julian Rossi</p>
            <p className="text-outline text-[10px]">Legajo: 194.201</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
