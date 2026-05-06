/**
 * Topbar fija de 64px. Glassmorphism (backdrop-blur), branding a la
 * izquierda, search + acciones (notificaciones, perfil) a la derecha.
 *
 * No es client component aun: si en el futuro la search abre un modal,
 * lo extraemos a un sub-componente "use client".
 */
export function TopNav() {
  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-4 pl-64">
        <span className="text-xl font-bold tracking-tighter text-primary font-headline">
          UTNHub
        </span>
        <span className="text-on-surface-variant/60 text-xs font-body uppercase tracking-widest hidden sm:inline">
          ISI · UTN FRRO
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/30">
          <span className="material-symbols-outlined text-sm text-outline mr-2">
            search
          </span>
          <input
            className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-on-surface-variant placeholder:text-outline w-48"
            placeholder="Buscar materias, profesores..."
            type="text"
          />
        </div>

        <div className="flex items-center gap-4 text-outline">
          <button
            type="button"
            className="hover:text-primary transition-colors relative"
            aria-label="Notificaciones"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full" />
          </button>
          <button
            type="button"
            className="hover:text-primary transition-colors"
            aria-label="Cuenta"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
