"use client";

import { useSidebar } from "./SidebarContext";

/**
 * Barra superior — lenguaje "Vercel × UTN": canvas neutro real, borders
 * hairline, acento celeste institucional e isotipo UTN.
 */
function UtnLogo() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1CA4DF]/25 bg-[#1CA4DF]/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/utn-isotipo-white.png"
        alt="UTN"
        className="h-5 w-5 object-contain opacity-90"
      />
    </div>
  );
}

export function TopNav() {
  const { collapsed } = useSidebar();
  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center gap-4 border-b border-white/[0.06] bg-[#0a0a0a]/90 px-6 backdrop-blur-xl">
      {/* Logo + nombre — ancho alineado con la sidebar */}
      <div
        className={`flex shrink-0 items-center gap-3 transition-[width] duration-200 ease-out ${collapsed ? "w-9" : "w-56"}`}
      >
        <UtnLogo />
        {!collapsed && (
          <div className="leading-none">
            <span className="font-headline text-[15px] font-extrabold tracking-tight text-neutral-50">
              UTNHub
            </span>
            <p className="mt-0.5 font-label text-[9px] uppercase tracking-[0.12em] text-neutral-500">
              ISI · UTN FRRO
            </p>
          </div>
        )}
      </div>

      {/* Buscador */}
      <div className="flex w-72 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 transition-colors hover:border-white/20 focus-within:border-[#1CA4DF]/50 focus-within:ring-1 focus-within:ring-[#1CA4DF]/20">
        <span className="material-symbols-outlined shrink-0 text-[16px] text-neutral-500">
          search
        </span>
        <input
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
          placeholder="Buscar materias, profesores..."
          type="text"
        />
        <kbd className="hidden shrink-0 items-center rounded border border-white/15 px-1 py-0.5 font-label text-[9px] text-neutral-500 lg:inline-flex">
          ⌘K
        </kbd>
      </div>

      <div className="flex-1" />

      {/* Acciones */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-neutral-100"
          aria-label="Notificaciones"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-[#0a0a0a] bg-[#1CA4DF]" />
        </button>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1CA4DF]/25 bg-[#1CA4DF]/10 font-headline text-xs font-extrabold text-[#4EC0EC] transition-colors hover:bg-[#1CA4DF]/15"
          aria-label="Cuenta"
        >
          JR
        </button>
      </div>
    </nav>
  );
}
