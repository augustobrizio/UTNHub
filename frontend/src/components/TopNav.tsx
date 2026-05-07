import Image from "next/image";

export function TopNav() {
  return (
    <nav className="fixed top-0 w-full z-50 h-16 flex items-center justify-between px-6 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/10">

      {/* Branding: logo UTN + nombre */}
      <div className="flex items-center gap-3 pl-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-outline-variant/20 flex items-center justify-center overflow-hidden">
          <Image
            src="/utn-logo.png"
            alt="UTN"
            width={28}
            height={28}
            className="object-contain invert opacity-80"
          />
        </div>
        <div className="leading-none">
          <span className="text-[15px] font-black font-headline tracking-tight text-on-surface">UTNHub</span>
          <p className="text-[9px] text-outline/60 tracking-[0.12em] uppercase font-label mt-0.5">ISI · UTN FRRO</p>
        </div>
      </div>

      {/* Acciones: búsqueda + iconos */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/15 hover:border-outline-variant/30 transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20">
          <span className="material-symbols-outlined text-[16px] text-outline">search</span>
          <input
            className="bg-transparent border-none focus:outline-none text-sm text-on-surface-variant placeholder:text-outline/60 w-44"
            placeholder="Buscar materias, profesores..."
            type="text"
          />
          <kbd className="hidden lg:inline-flex items-center text-[9px] text-outline/40 border border-outline-variant/20 rounded px-1 py-0.5 font-label">
            ⌘K
          </kbd>
        </div>

        <button
          type="button"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-all"
          aria-label="Notificaciones"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary rounded-full border-2 border-surface-container-lowest shadow-[0_0_6px_rgba(125,255,162,0.7)]" />
        </button>

        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-headline font-black text-xs hover:bg-primary/15 transition-colors"
          aria-label="Cuenta"
        >
          JR
        </button>
      </div>
    </nav>
  );
}
