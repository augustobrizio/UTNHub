/**
 * Placeholder visual para las pestanas que todavia no estan implementadas.
 * Mantiene la estetica Kinetic Blueprint asi la nav no se siente rota.
 */
export function Placeholder({
  titulo,
  icono,
  descripcion,
}: {
  titulo: string;
  icono: string;
  descripcion?: string;
}) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-12 space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline text-on-surface">
          {titulo}
        </h1>
        <p className="text-on-surface-variant">
          {descripcion ?? "Esta pestana todavia no esta implementada."}
        </p>
      </header>

      <div className="bg-surface-container/40 border border-outline-variant/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl">{icono}</span>
        </div>
        <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
          Proximamente
        </h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          Esta pantalla esta en construccion. La logica del backend ya esta
          lista — falta cablear el frontend.
        </p>
      </div>
    </div>
  );
}
