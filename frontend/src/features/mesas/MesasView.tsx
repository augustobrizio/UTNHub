"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Info, Pencil, Plus } from "lucide-react";

import type { DiaMesa, MateriaOut, MesaMateria, MesasSemana } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EditorMesa } from "./EditorMesa";

const ROTULO: Record<DiaMesa, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
};

type FiltroTipo = "todas" | "troncal" | "electiva";

/** "15:00:00" → "15:00". Sin hora todavía confirmada, se dice. */
export function horaCorta(hora: string | null): string {
  return hora ? hora.slice(0, 5) : "a confirmar";
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--shell-border)] px-1.5 py-px font-label text-[10px] text-[var(--shell-fg-dim)]">
      {children}
    </span>
  );
}

/**
 * Las mesas de examen: qué materias se rinden cada día de la semana.
 *
 * La facultad no publica un listado por fecha sino por día —el lunes se rinde
 * Análisis Matemático I— y eso se repite en cada llamado. Por eso la vista es
 * una semana y no un calendario: el calendario ya dice **qué semana** hay mesa.
 *
 * El filtrado es en el cliente a propósito: son ~53 materias, entran en una
 * sola respuesta, y así cambiar de año no cuesta un round-trip.
 */
export function MesasView({
  semana,
  materias = [],
  esAdmin = false,
}: {
  semana: MesasSemana;
  /** Sólo para el alta del admin: las materias del plan entre las que elegir. */
  materias?: MateriaOut[];
  /** El admin corrige el día, la hora y la nota de cada materia. */
  esAdmin?: boolean;
}) {
  const [tipo, setTipo] = useState<FiltroTipo>("todas");
  const [anio, setAnio] = useState<number | null>(null);
  const [editando, setEditando] = useState<MesaMateria | "nueva" | null>(null);

  const dias = useMemo(
    () =>
      semana.dias.map((dia) => ({
        ...dia,
        materias: dia.materias.filter(
          (m) =>
            (tipo === "todas" || m.tipo === tipo) &&
            (anio === null || m.anio_carrera === anio),
        ),
      })),
    [semana.dias, tipo, anio],
  );

  const total = dias.reduce((acc, d) => acc + d.materias.length, 0);

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8">
      <header className="mb-6">
        <p className="font-label text-[11px] uppercase tracking-[0.18em] text-[var(--shell-fg-dim)]">
          Finales
        </p>
        <h1 className="mt-1.5 font-headline text-3xl font-bold tracking-tight text-[var(--shell-fg)]">
          Mesas de examen
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--shell-fg-muted)]">
          Cada materia se rinde un día fijo de la semana de mesas. Buscá la tuya
          para saber qué día y a qué hora te toca.
        </p>
      </header>

      {/* El aviso va arriba y no al pie: es la condición con la que hay que
          leer toda la tabla, no una nota al margen. */}
      <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-[var(--cal-alerta-bd)] bg-[var(--cal-alerta-bg)] px-4 py-3 text-[13px] leading-snug text-[var(--cal-alerta-fg)]">
        <Info className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
        <span>{semana.aviso}</span>
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          {(["todas", "troncal", "electiva"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              aria-pressed={tipo === t}
              className={cn(
                "rounded-lg border px-3 py-1.5 font-label text-xs font-semibold transition-colors",
                tipo === t
                  ? "border-[#1CA4DF]/25 bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]"
                  : "border-[var(--shell-border)] text-[var(--shell-fg-dim)] hover:text-[var(--shell-fg-muted)]",
              )}
            >
              {t === "todas" ? "Todas" : t === "troncal" ? "Troncales" : "Electivas"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setAnio(anio === n ? null : n)}
              aria-pressed={anio === n}
              className={cn(
                "h-8 w-8 rounded-lg border font-label text-xs font-semibold transition-colors",
                anio === n
                  ? "border-[#1CA4DF]/25 bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]"
                  : "border-[var(--shell-border)] text-[var(--shell-fg-dim)] hover:text-[var(--shell-fg-muted)]",
              )}
              title={`${n}º año`}
            >
              {n}º
            </button>
          ))}
        </div>

        <p className="font-label text-xs text-[var(--shell-fg-dim)]">
          {total === 1 ? "1 materia" : `${total} materias`}
        </p>

        {esAdmin && (
          <button
            onClick={() => setEditando("nueva")}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--shell-border)] px-3 py-1.5 font-label text-xs font-semibold text-[var(--shell-fg-muted)] transition-colors hover:bg-[var(--shell-hover)] hover:text-[var(--shell-fg)]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Cargar una materia
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {dias.map((dia) => (
          <section
            key={dia.dia_semana}
            className="flex flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] p-3.5"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-headline text-sm font-bold text-[var(--shell-fg)]">
                {ROTULO[dia.dia_semana]}
              </h2>
              <span className="font-label text-[11px] tabular-nums text-[var(--shell-fg-dim)]">
                {dia.materias.length}
              </span>
            </div>

            {dia.materias.length === 0 ? (
              <p className="text-[12px] text-[var(--shell-fg-dim)]">
                Nada con este filtro.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {dia.materias.map((m) => (
                  <li key={m.materia_codigo} className="group">
                    <div className="flex items-baseline gap-2">
                      <span className="font-label text-[12px] font-semibold tabular-nums text-[var(--shell-accent-fg)]">
                        {horaCorta(m.hora)}
                      </span>
                      {esAdmin && (
                        <button
                          onClick={() => setEditando(m)}
                          aria-label={`Editar la mesa de ${m.nombre}`}
                          className="ml-auto flex h-5 w-5 items-center justify-center rounded text-[var(--shell-fg-dim)] opacity-0 transition-opacity hover:bg-[var(--shell-hover)] hover:text-[var(--shell-fg)] focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Pencil className="h-3 w-3" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    <p className="text-[13px] font-medium leading-snug text-[var(--shell-fg)]">
                      {m.nombre}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {m.anio_carrera && <Chip>{m.anio_carrera}º</Chip>}
                      {m.tipo === "electiva" && <Chip>electiva</Chip>}
                      {m.origen === "admin" && <Chip>corregida</Chip>}
                    </div>
                    {m.nota && (
                      <p className="mt-1 text-[11px] leading-snug text-[var(--shell-fg-muted)]">
                        {m.nota}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {semana.sin_asignar.length > 0 && (
        <section className="mt-6 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4">
          <h2 className="flex items-center gap-2 font-headline text-sm font-bold text-[var(--shell-fg)]">
            <CalendarClock className="h-4 w-4 text-[var(--shell-fg-dim)]" strokeWidth={2} />
            Sin día confirmado ({semana.sin_asignar.length})
          </h2>
          <p className="mt-1 text-[12px] text-[var(--shell-fg-muted)]">
            Todavía no tenemos el dato de estas materias. Consultalas en el
            Departamento de Sistemas o con la cátedra.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--shell-fg)]">
            {semana.sin_asignar.join(" · ")}
          </p>
        </section>
      )}

      {editando && (
        <EditorMesa
          mesa={editando === "nueva" ? null : editando}
          materias={materias}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  );
}
