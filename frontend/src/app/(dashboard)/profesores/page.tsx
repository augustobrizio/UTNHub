import { ApiError, listarProfesores } from "@/lib/api";
import type { ProfesorListItem } from "@/lib/types";
import { ProfesoresView } from "@/components/profesores/ProfesoresView";

export default async function ProfesoresPage() {
  let profesores: ProfesorListItem[] | null = null;
  let errorMsg: string | null = null;

  try {
    profesores = await listarProfesores();
  } catch (err) {
    if (err instanceof ApiError) {
      errorMsg = `Backend devolvió ${err.status}.`;
    } else if (err instanceof Error) {
      errorMsg = err.message;
    } else {
      errorMsg = "Error desconocido.";
    }
  }

  if (!profesores) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <header className="mb-8 space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight font-headline text-on-surface">
            Profesores
          </h1>
        </header>
        <div className="bg-surface-container/40 border border-outline-variant/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center min-h-[320px]">
          <div className="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-3xl">cloud_off</span>
          </div>
          <h2 className="text-xl font-headline font-bold text-on-surface mb-2">
            No se pudo cargar el directorio
          </h2>
          <p className="text-sm text-on-surface-variant max-w-md">
            {errorMsg ?? "Intentá de nuevo en unos segundos."} Verificá que el backend esté corriendo.
          </p>
        </div>
      </div>
    );
  }

  return <ProfesoresView profesores={profesores} />;
}
