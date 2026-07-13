import type { ComisionConProfesores } from "@/lib/types";
import { MateriaComisionRow } from "./MateriaComisionRow";
import { ScoreMock } from "./ScoreMock";

/** Una comisión: header (nombre + score mock) + lista de sus materias. */
export function ComisionCard({ comision }: { comision: ComisionConProfesores }) {
  return (
    <section className="cal-card rounded-2xl bg-surface-container/60 border border-outline-variant/10 p-5">
      <header className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[22px] text-primary">groups</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-headline font-extrabold text-on-surface leading-tight truncate">
            {comision.nombre ?? "Comisión"}
          </h3>
          <p className="text-[11px] text-outline">
            {comision.cursadas.length} {comision.cursadas.length === 1 ? "materia" : "materias"}
          </p>
        </div>
        <ScoreMock comisionId={comision.id} />
      </header>

      {comision.cursadas.length > 0 ? (
        <ul className="space-y-2">
          {comision.cursadas.map((c) => (
            <MateriaComisionRow key={c.id} cursada={c} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-outline italic">Esta comisión no tiene materias cargadas.</p>
      )}
    </section>
  );
}
