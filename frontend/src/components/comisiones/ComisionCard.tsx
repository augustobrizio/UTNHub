"use client";

import type { ComisionConProfesores } from "@/lib/types";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScoreMock } from "./ScoreMock";
import { ComisionModal } from "./ComisionModal";

/**
 * Tarjeta compacta de una comisión. Es el trigger de un modal (Dialog) que
 * muestra el detalle completo (materias + profesor + horario). El hover deja
 * claro que es clickeable (lift + borde primario + "Ver detalle →").
 */
export function ComisionCard({ comision }: { comision: ComisionConProfesores }) {
  const nMaterias = new Set(comision.cursadas.map((c) => c.materia_codigo)).size;
  const nProfes = new Set(
    comision.cursadas.filter((c) => c.profesor).map((c) => c.materia_codigo),
  ).size;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="cal-card group w-full cursor-pointer rounded-2xl border border-outline-variant/10 bg-surface-container/60 p-4 text-left transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <span className="material-symbols-outlined text-[20px] text-primary">groups</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-headline text-base font-extrabold leading-tight text-on-surface">
                {comision.nombre ?? "Comisión"}
              </h3>
              <p className="truncate text-[11px] text-outline">
                {nMaterias} {nMaterias === 1 ? "materia" : "materias"} · {nProfes} con profesor
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-outline-variant/10 pt-2.5">
            <ScoreMock comisionId={comision.id} />
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant transition-colors group-hover:text-primary">
              Ver detalle
              <span className="material-symbols-outlined text-[15px] transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </span>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl border-outline-variant/15 bg-surface-container p-0">
        <ComisionModal comision={comision} />
      </DialogContent>
    </Dialog>
  );
}
