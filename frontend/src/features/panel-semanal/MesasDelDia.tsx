"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, Loader2 } from "lucide-react";

import { getMesasDelDia } from "@/lib/api";
import type { DiaDeMesas, DiaMesa } from "@/lib/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const DIA_DE_FECHA: DiaMesa[] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
];

/** "2026-09-08" → "martes". El panel sólo muestra días hábiles. */
export function diaSemanaDe(iso: string): DiaMesa | null {
  const idx = (new Date(`${iso}T00:00:00`).getDay() + 6) % 7;
  return DIA_DE_FECHA[idx] ?? null;
}

function fechaLarga(iso: string): string {
  const t = new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Qué se rinde en la mesa de ese día.
 *
 * El panel ya dice que el día no se cursa porque hay mesa; la pregunta que
 * sigue siempre es "¿mesa de qué?". Se pide al abrir y no con la semana: el
 * dato sólo hace falta cuando alguien lo pregunta, y la mayoría de las semanas
 * no tienen mesa.
 *
 * Va en un diálogo y no dentro del bloque del día porque un jueves son doce
 * materias: metidas en la tira semanal la rompen.
 */
export function MesasDelDia({
  fecha,
  onCerrar,
}: {
  /** YYYY-MM-DD del día de mesa. */
  fecha: string;
  onCerrar: () => void;
}) {
  const [dia, setDia] = useState<DiaDeMesas | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const nombre = diaSemanaDe(fecha);
    if (!nombre) {
      setError(true);
      return;
    }
    let vigente = true;
    getMesasDelDia(nombre)
      .then((d) => { if (vigente) setDia(d); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [fecha]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-w-md p-0">
        <div className="border-b border-[var(--shell-border)] px-5 py-4">
          <DialogTitle className="text-[15px] font-bold">
            Mesa del {fechaLarga(fecha).toLowerCase()}
          </DialogTitle>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {error ? (
            <p className="text-sm text-[var(--shell-fg-muted)]">
              No pude traer las materias de esta mesa. Probá de nuevo.
            </p>
          ) : !dia ? (
            <p className="flex items-center gap-2 text-sm text-[var(--shell-fg-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              Buscando…
            </p>
          ) : dia.materias.length === 0 ? (
            <p className="text-sm text-[var(--shell-fg-muted)]">
              No tengo cargadas las materias de este día.
            </p>
          ) : (
            <ul className="space-y-2">
              {dia.materias.map((m) => (
                <li
                  key={m.materia_codigo}
                  className="flex items-baseline gap-3 border-b border-[var(--shell-border)] pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-label text-[12px] font-semibold tabular-nums text-[var(--shell-accent-fg)]">
                    {m.hora ? m.hora.slice(0, 5) : "—"}
                  </span>
                  <span className="flex-1 text-[13px] leading-snug text-[var(--shell-fg)]">
                    {m.nombre}
                  </span>
                  {m.anio_carrera && (
                    <span className="font-label text-[10px] text-[var(--shell-fg-dim)]">
                      {m.anio_carrera}º
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {dia?.aviso && (
          <p className="flex items-start gap-2 border-t border-[var(--shell-border)] px-5 py-3 text-[11px] leading-snug text-[var(--shell-fg-muted)]">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>{dia.aviso}</span>
          </p>
        )}

        <div className="flex justify-end border-t border-[var(--shell-border)] px-5 py-3">
          <Link
            href="/mesas"
            className="group inline-flex items-center gap-1 font-label text-xs font-semibold text-[var(--shell-accent-fg)]"
          >
            Ver todas las mesas
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
