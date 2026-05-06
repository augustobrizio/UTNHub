/**
 * Fallback visual cuando el backend no responde. Mantiene la estetica
 * Kinetic Blueprint para que la pestana no se sienta rota.
 */
export function GrafoErrorState({ mensaje }: { mensaje: string }) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-12 space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline text-on-surface">
          Grafo de Correlativas
        </h1>
        <p className="text-on-surface-variant">
          No se pudo cargar el grafo desde el backend.
        </p>
      </header>

      <div className="bg-surface-container/40 border border-error/30 rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-20 h-20 rounded-2xl bg-error/10 text-error flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl">error</span>
        </div>
        <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
          Backend no disponible
        </h2>
        <p className="text-sm text-on-surface-variant max-w-md mb-2">{mensaje}</p>
        <p className="text-xs text-outline max-w-md">
          Verifica que <code className="text-primary">docker compose up</code> este corriendo
          y que <code className="text-primary">NEXT_PUBLIC_API_URL</code> apunte al backend.
        </p>
      </div>
    </div>
  );
}
