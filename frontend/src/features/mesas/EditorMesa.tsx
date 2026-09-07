"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { borrarMesa, definirMesa } from "@/lib/api";
import type { DiaMesa, MateriaOut, MesaMateria } from "@/lib/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DIAS: { valor: DiaMesa; rotulo: string }[] = [
  { valor: "lunes", rotulo: "Lun" },
  { valor: "martes", rotulo: "Mar" },
  { valor: "miercoles", rotulo: "Mié" },
  { valor: "jueves", rotulo: "Jue" },
  { valor: "viernes", rotulo: "Vie" },
];

/**
 * Carga o corrección de la mesa de una materia, para admin.
 *
 * El dato lo publica el Departamento y una cátedra lo mueve sin avisar: esto
 * existe para que la corrección entre por el panel y no por un deploy. Lo que
 * se guarda acá queda marcado con origen `admin`, y el seed de la planilla lo
 * respeta la próxima vez que corra.
 *
 * Con `mesa` en `null` es un alta: hay que elegir la materia. Editando, la
 * materia está fija —cambiar de materia sería borrar una y cargar otra—.
 */
export function EditorMesa({
  mesa,
  materias = [],
  onCerrar,
}: {
  mesa: MesaMateria | null;
  /** Sólo para el alta: las materias del plan entre las que elegir. */
  materias?: MateriaOut[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(mesa?.materia_codigo ?? "");
  const [dia, setDia] = useState<DiaMesa>(mesa?.dia_semana ?? "lunes");
  const [hora, setHora] = useState(mesa?.hora?.slice(0, 5) ?? "");
  const [nota, setNota] = useState(mesa?.nota ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esAlta = mesa === null;

  function cerrarYRefrescar() {
    onCerrar();
    router.refresh();
  }

  async function guardar() {
    if (!codigo) {
      setError("Elegí una materia.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await definirMesa(codigo, {
        dia_semana: dia,
        hora: hora || null,
        nota: nota.trim() || null,
      });
      cerrarYRefrescar();
    } catch {
      setError("No se pudo guardar. Probá de nuevo.");
      setGuardando(false);
    }
  }

  async function quitar() {
    setGuardando(true);
    setError(null);
    try {
      await borrarMesa(codigo);
      cerrarYRefrescar();
    } catch {
      setError("No se pudo quitar. Probá de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-w-md p-0">
        <div className="border-b border-[var(--shell-border)] px-5 py-4">
          <DialogTitle className="text-[15px] font-bold">
            {mesa ? mesa.nombre : "Cargar una mesa"}
          </DialogTitle>
        </div>

        <div className="space-y-4 px-5 py-4">
          {esAlta && (
            <label className="block">
              <span className="mb-1.5 block font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-fg-dim)]">
                Materia
              </span>
              <select
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-canvas)] px-3 py-2 text-sm text-[var(--shell-fg)] outline-none"
              >
                <option value="">Elegí una materia…</option>
                {materias.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <span className="mb-1.5 block font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-fg-dim)]">
              Día
            </span>
            <div className="flex gap-1.5">
              {DIAS.map((d) => (
                <button
                  key={d.valor}
                  type="button"
                  onClick={() => setDia(d.valor)}
                  aria-pressed={dia === d.valor}
                  className={cn(
                    "flex-1 rounded-lg border py-2 font-label text-xs font-semibold transition-colors",
                    dia === d.valor
                      ? "border-[#1CA4DF]/25 bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]"
                      : "border-[var(--shell-border)] text-[var(--shell-fg-dim)] hover:text-[var(--shell-fg-muted)]",
                  )}
                >
                  {d.rotulo}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-fg-dim)]">
              Horario
            </span>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-canvas)] px-3 py-2 text-sm text-[var(--shell-fg)] outline-none"
            />
            <span className="mt-1 block text-[11px] text-[var(--shell-fg-dim)]">
              Se puede dejar vacío: el día suele confirmarse antes que la hora.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--shell-fg-dim)]">
              Nota (opcional)
            </span>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Confirmado con la cátedra el 3/9."
              className="w-full resize-none rounded-lg border border-[var(--shell-border)] bg-[var(--shell-canvas)] px-3 py-2 text-sm text-[var(--shell-fg)] outline-none placeholder:text-[var(--shell-fg-dim)]"
            />
            <span className="mt-1 block text-[11px] text-[var(--shell-fg-dim)]">
              Se muestra junto a la materia, debajo del nombre.
            </span>
          </label>

          {error && (
            <p className="rounded-lg border border-[#dc2626]/30 bg-[#dc2626]/10 px-3 py-2 text-xs text-[#dc2626] dark:text-[#f87171]">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--shell-border)] px-5 py-3.5">
          {!esAlta && (
            <button
              type="button"
              onClick={quitar}
              disabled={guardando}
              title="La materia queda sin día cargado"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-label text-xs font-semibold text-[#dc2626] transition-colors hover:bg-[#dc2626]/10 disabled:opacity-50 dark:text-[#f87171]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              Quitar
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-4 py-2 font-label text-xs font-semibold text-[var(--shell-fg-muted)] transition-colors hover:text-[var(--shell-fg)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1CA4DF] px-4 py-2 font-label text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
            Guardar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
