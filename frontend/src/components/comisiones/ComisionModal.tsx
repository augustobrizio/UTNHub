import type { ComisionConProfesores } from "@/lib/types";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MateriaComisionRow } from "./MateriaComisionRow";
import { ScoreMock } from "./ScoreMock";

/**
 * Cuerpo del modal de una comisión: header (nombre + año + score) y el detalle
 * completo de sus materias (materia + horario + profesor) en dos columnas.
 */
function cuatriLabel(cuat: number | null): string {
  if (cuat === 1) return "1.er cuatrimestre";
  if (cuat === 2) return "2.º cuatrimestre";
  return "Sin cuatrimestre";
}

export function ComisionModal({ comision }: { comision: ComisionConProfesores }) {
  const nMaterias = new Set(comision.cursadas.map((c) => c.materia_codigo)).size;
  const nProfes = new Set(
    comision.cursadas.filter((c) => c.profesor).map((c) => c.materia_codigo),
  ).size;
  const anio = (comision.nombre ?? "").match(/\d+/)?.[0] ?? null;

  // Agrupar por cuatrimestre: la misma materia aparece en 1º y 2º, así que
  // segmentar deja claro que no son duplicados.
  const grupos = (() => {
    const map = new Map<number | null, typeof comision.cursadas>();
    for (const c of comision.cursadas) {
      const k = c.cuatrimestre ?? null;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] == null) return 1;
      if (b[0] == null) return -1;
      return a[0] - b[0];
    });
  })();

  return (
    <div className="flex max-h-[85vh] flex-col">
      {/* Header */}
      <header className="flex items-start gap-4 border-b border-outline-variant/10 px-6 pb-5 pt-6 pr-14">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <span className="material-symbols-outlined text-[26px] text-primary">groups</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="font-headline text-2xl font-extrabold leading-tight text-on-surface">
              {comision.nombre ?? "Comisión"}
            </DialogTitle>
            {anio && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                {anio}° año
              </span>
            )}
          </div>
          <DialogDescription className="mt-1 text-sm text-on-surface-variant">
            {nMaterias} {nMaterias === 1 ? "materia" : "materias"} · {nProfes} con profesor vinculado
          </DialogDescription>
        </div>
        <div className="shrink-0">
          <ScoreMock comisionId={comision.id} size="lg" />
        </div>
      </header>

      {/* Materias, agrupadas por cuatrimestre */}
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {comision.cursadas.length > 0 ? (
          grupos.map(([cuat, cursadas]) => (
            <section key={cuat ?? "sin"}>
              <h4 className="mb-2.5 flex items-center gap-2 font-headline text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {cuatriLabel(cuat)}
                <span className="font-body font-normal normal-case tracking-normal text-outline">
                  {cursadas.length} {cursadas.length === 1 ? "materia" : "materias"}
                </span>
              </h4>
              <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {cursadas.map((c) => (
                  <MateriaComisionRow key={c.id} cursada={c} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-outline italic">
            Esta comisión no tiene materias cargadas.
          </p>
        )}
      </div>

      {/* Footer: nota del score mock */}
      <footer className="border-t border-outline-variant/10 px-6 py-3">
        <p className="flex items-center gap-1.5 text-[11px] text-outline">
          <span className="material-symbols-outlined text-[14px]">info</span>
          El puntaje es provisorio (mock). Se calculará desde las reviews de UTNTAC en una feature
          futura.
        </p>
      </footer>
    </div>
  );
}
