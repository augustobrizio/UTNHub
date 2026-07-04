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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0a]">
      {/* Logo — alineado con el TopNav (h-16) */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1CA4DF]/25 bg-[#1CA4DF]/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/utn-isotipo-white.png"
            alt="UTN"
            className="h-5 w-5 object-contain opacity-90"
          />
        </div>
        <div className="leading-none">
          <p className="font-headline text-[15px] font-extrabold tracking-tight text-neutral-50">
            UTNHub
          </p>
          <p className="mt-0.5 font-label text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            ISI · UTN FRRO
          </p>
        </div>
      </div>

      {/* Navegacion */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3 pt-5">
        <p className="select-none px-3 pb-3 font-label text-[9px] uppercase tracking-[0.15em] text-neutral-600">
          Módulos
        </p>

        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                active
                  ? "bg-[#1CA4DF]/10 text-[#4EC0EC]"
                  : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100",
              ].join(" ")}
            >
              {/* Accent pill del item activo */}
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#1CA4DF]" />
              )}
              <span
                className={[
                  "material-symbols-outlined shrink-0 text-[20px] transition-transform duration-200",
                  active ? "" : "group-hover:translate-x-0.5",
                ].join(" ")}
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-body text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Usuario */}
      <div className="shrink-0 border-t border-white/[0.06] px-3 pb-4 pt-3">
        <div className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.04]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1CA4DF]/25 bg-[#1CA4DF]/10 font-headline text-xs font-extrabold text-[#4EC0EC]">
            JR
          </div>
          <div className="min-w-0 flex-1 leading-none">
            <p className="truncate text-xs font-semibold text-neutral-200">Julian Rossi</p>
            <p className="mt-0.5 truncate text-[10px] text-neutral-500">Leg. 194.201</p>
          </div>
          <span className="material-symbols-outlined text-[16px] text-neutral-600 transition-colors group-hover:text-neutral-400">
            unfold_more
          </span>
        </div>
      </div>
    </aside>
  );
}
