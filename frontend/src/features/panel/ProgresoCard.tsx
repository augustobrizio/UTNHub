import { GraduationCap } from "lucide-react";

import type { ContadoresGrafo } from "@/lib/types";
import type { AnioProgreso } from "./data";
import { Expandable } from "./Expandable";

// Color por estado — semántico, separado del celeste de marca (que es el
// acento del shell). Mismos tonos que la barra apilada y la leyenda.
const ESTADOS = [
  { key: "aprobadas", label: "Aprobadas", color: "#10b981" },
  { key: "cursando", label: "Cursando", color: "#1CA4DF" },
  { key: "regulares", label: "Regulares", color: "#f59e0b" },
  { key: "cursables", label: "Cursables", color: "#8b5cf6" },
  { key: "libres", label: "Libres", color: "#a1a1aa" },
] as const;

/**
 * Progreso de la carrera. En reposo: anillo con el % aprobado + distribución
 * por estado. Desplegado: avance año por año + carga horaria y créditos de
 * electivas. Todo sale de los contadores y los nodos del grafo troncal.
 */
export function ProgresoCard({
  contadores,
  porAnio,
}: {
  contadores: ContadoresGrafo;
  porAnio: AnioProgreso[];
}) {
  const pct = Math.max(0, Math.min(100, contadores.porcentaje_aprobadas));
  const R = 41;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - pct / 100);

  const conteos: Record<(typeof ESTADOS)[number]["key"], number> = {
    aprobadas: contadores.aprobadas,
    cursando: contadores.cursando,
    regulares: contadores.regulares,
    cursables: contadores.cursables,
    libres: contadores.libres,
  };
  const total = contadores.total || 1;

  const resumen = (
    <div className="flex items-center gap-5">
      {/* Anillo */}
      <div className="relative h-[92px] w-[92px] shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 92 92" aria-hidden="true">
          <circle cx="46" cy="46" r={R} fill="none" stroke="var(--shell-hover)" strokeWidth="10" />
          <circle
            cx="46"
            cy="46"
            r={R}
            fill="none"
            stroke="#10b981"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-headline text-xl font-extrabold text-[var(--shell-fg)] tabular-nums">
            {pct.toFixed(0)}%
          </span>
          <span className="text-[10px] text-[var(--shell-fg-dim)] tabular-nums">
            {contadores.aprobadas}/{contadores.total}
          </span>
        </div>
      </div>

      {/* Barra apilada + leyenda */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-[var(--shell-hover)]">
          {ESTADOS.map((e) => (
            <span
              key={e.key}
              style={{ width: `${(conteos[e.key] / total) * 100}%`, background: e.color }}
            />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {ESTADOS.map((e) => (
            <li key={e.key} className="flex items-center gap-2 text-[12.5px] text-[var(--shell-fg-muted)]">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: e.color }} />
              {e.label}
              <b className="ml-auto font-semibold text-[var(--shell-fg)] tabular-nums">
                {conteos[e.key]}
              </b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const detalle = (
    <>
      <p className="mb-3 font-label text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--shell-fg-dim)]">
        Avance por año
      </p>
      <div className="flex flex-col gap-3">
        {porAnio.length === 0 ? (
          <p className="text-xs text-[var(--shell-fg-dim)]">Sin datos de cursada cargados.</p>
        ) : (
          porAnio.map((a) => {
            const p = a.total ? Math.round((a.aprobadas / a.total) * 100) : 0;
            return (
              <div key={a.anio} className="grid grid-cols-[64px_1fr_44px] items-center gap-3">
                <span className="text-xs font-semibold text-[var(--shell-fg-muted)]">
                  {a.anio}º año
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-[var(--shell-hover)]">
                  <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${p}%` }} />
                </span>
                <span className="text-right text-xs font-semibold text-[var(--shell-fg)] tabular-nums">
                  {a.aprobadas}/{a.total}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Metric
          label="Carga horaria"
          valor={contadores.carga_horaria_cursando}
          unidad="hs/sem"
        />
        <Metric
          label="Créditos electivas"
          valor={contadores.creditos_electivas}
          unidad={`/ ${contadores.meta_creditos_electivas}`}
        />
      </div>
    </>
  );

  return (
    <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-500">
          <GraduationCap className="h-[17px] w-[17px]" strokeWidth={2} />
        </div>
        <h3 className="font-headline text-[15px] font-bold text-[var(--shell-fg)]">Mi progreso</h3>
      </div>
      <Expandable resumen={resumen} detalle={detalle} labelMas="Ver desglose por año" />
    </div>
  );
}

function Metric({ label, valor, unidad }: { label: string; valor: number; unidad: string }) {
  return (
    <div className="flex-1 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-canvas)] px-3.5 py-3">
      <p className="text-[11px] font-medium text-[var(--shell-fg-muted)]">{label}</p>
      <p className="mt-1 font-headline text-lg font-extrabold text-[var(--shell-fg)] tabular-nums">
        {valor}
        <span className="ml-1 text-xs font-semibold text-[var(--shell-fg-muted)]">{unidad}</span>
      </p>
    </div>
  );
}
