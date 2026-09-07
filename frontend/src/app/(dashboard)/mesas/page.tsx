import { ApiError, getMesasSemana, listarMaterias } from "@/lib/api";
import { getUsuarioActual } from "@/lib/auth";
import type { MateriaOut, MesasSemana } from "@/lib/types";
import { MesasView } from "@/features/mesas/MesasView";

export const metadata = {
  title: "Mesas de examen · UTNHub",
  description:
    "Qué materias se rinden cada día de la semana de mesas en ISI, con horario.",
};

/**
 * Qué se rinde cada día de la semana de mesas.
 *
 * Pública como el calendario y los horarios: es la oferta de la facultad,
 * igual para todos. Lo único que cambia con la sesión es que un admin ve los
 * controles para corregir el día o la hora de una materia.
 */
export default async function MesasPage() {
  let semana: MesasSemana | null = null;
  let errorMsg: string | null = null;

  try {
    semana = await getMesasSemana();
  } catch (err) {
    errorMsg =
      err instanceof ApiError
        ? `Backend devolvió ${err.status}.`
        : err instanceof Error
          ? err.message
          : "Error desconocido.";
  }

  if (!semana) {
    return (
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[var(--shell-fg)]">
          Mesas de examen
        </h1>
        <p className="mt-4 rounded-xl border border-[var(--cal-alerta-bd)] bg-[var(--cal-alerta-bg)] px-4 py-3 text-sm text-[var(--cal-alerta-fg)]">
          No pude traer las mesas. {errorMsg} Probá de nuevo en unos segundos.
        </p>
      </div>
    );
  }

  const usuario = await getUsuarioActual();
  const esAdmin = (usuario?.rol ?? "").toLowerCase() === "admin";

  // La lista completa del plan sólo hace falta para el alta del admin: es el
  // desplegable donde elige la materia. Al visitante no le cuesta un request.
  let materias: MateriaOut[] = [];
  if (esAdmin) {
    try {
      materias = await listarMaterias();
    } catch {
      // Sin la lista se puede editar lo que ya está cargado, que es el caso
      // frecuente; sólo se pierde el alta.
    }
  }

  return <MesasView semana={semana} materias={materias} esAdmin={esAdmin} />;
}
