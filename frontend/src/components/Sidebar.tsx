"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard",    icon: "dashboard",      href: "/"          },
  { label: "Chatbot",      icon: "smart_toy",       href: "/chat"      },
  { label: "Calendario",   icon: "calendar_month",  href: "/calendario"},
  { label: "Materias",     icon: "account_tree",    href: "/materias"  },
  { label: "Horarios",     icon: "schedule",        href: "/horarios"  },
  { label: "Novedades",    icon: "campaign",        href: "/novedades" },
  { label: "Profesores",   icon: "badge",           href: "/profesores"},
  { label: "Perfil",       icon: "person",          href: "/perfil"    },
] as const;

function isActive(currentPath: string, href: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-40 flex flex-col bg-surface-container-lowest border-r border-outline-variant/10">

      {/* Logo — altura alineada con el TopNav (h-16) */}
      <div className="h-16 flex items-center px-5 shrink-0 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              hub
            </span>
          </div>
          <div className="leading-none">
            <p className="text-[15px] font-black font-headline tracking-tight text-on-surface">UTNHub</p>
            <p className="text-[9px] text-outline tracking-[0.14em] uppercase font-label mt-0.5">ISI · UTN FRRO</p>
          </div>
        </div>
      </div>

      {/* Navegacion */}
      <nav className="flex-1 px-3 pt-5 pb-3 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] text-outline/50 uppercase tracking-[0.15em] px-3 pb-3 font-label select-none">
          Módulos
        </p>

        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-outline hover:text-on-surface hover:bg-surface-container/70",
              ].join(" ")}
            >
              {/* Accent pill para item activo */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.6)]" />
              )}
              <span
                className={[
                  "material-symbols-outlined text-[20px] transition-transform duration-200 shrink-0",
                  active ? "" : "group-hover:translate-x-0.5",
                ].join(" ")}
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium font-body">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Usuario */}
      <div className="px-3 pb-4 shrink-0 border-t border-outline-variant/10 pt-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container/60 cursor-pointer transition-colors group">
          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-headline font-black text-xs shrink-0">
            JR
          </div>
          <div className="flex-1 min-w-0 leading-none">
            <p className="text-on-surface font-semibold text-xs truncate">Julian Rossi</p>
            <p className="text-outline text-[10px] truncate mt-0.5">Leg. 194.201</p>
          </div>
          <span className="material-symbols-outlined text-[16px] text-outline/50 group-hover:text-outline transition-colors">
            unfold_more
          </span>
        </div>
      </div>
    </aside>
  );
}
