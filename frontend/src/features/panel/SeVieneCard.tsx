import { AlarmClock } from "lucide-react";
import Link from "next/link";

import type { ProximoItem, Urgencia } from "./data";
import { Expandable } from "./Expandable";

// Cuántos se muestran en reposo; el resto va detrás del "Ver más".
const VISIBLES = 2;

const URGENCIA: Record<Urgencia, { cd: string; tag: string }> = {
  urgente: { cd: "bg-red-500/12 text-red-500", tag: "bg-red-500/12 text-red-500" },
  pronto: { cd: "bg-amber-500/12 text-amber-500", tag: "bg-amber-500/12 text-amber-500" },
  lejano: { cd: "bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]", tag: "bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]" },
};

/**
 * "Se viene": finales, mesas, parciales y TPs ordenados por cercanía, con el
 * countdown en días. Sale de los próximos eventos del calendario (excluye
 * feriados). Muestra los más cercanos y despliega el resto.
 */
export function SeVieneCard({ proximos }: { proximos: ProximoItem[] }) {
  const visibles = proximos.slice(0, VISIBLES);
  const resto = proximos.slice(VISIBLES);

  return (
    <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/12 text-amber-500">
          <AlarmClock className="h-[17px] w-[17px]" strokeWidth={2} />
        </div>
        <h3 className="font-headline text-[15px] font-bold text-[var(--shell-fg)]">Se viene</h3>
        <Link
          href="/calendario"
          className="ml-auto font-label text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shell-accent-fg)] hover:opacity-80"
        >
          Calendario
        </Link>
      </div>

      {proximos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--shell-border)] py-8 text-center">
          <p className="text-sm font-medium text-[var(--shell-fg-muted)]">
            No hay finales ni entregas cerca.
          </p>
        </div>
      ) : resto.length === 0 ? (
        <Lista items={visibles} />
      ) : (
        <Expandable
          resumen={<Lista items={visibles} />}
          detalle={<Lista items={resto} />}
          labelMas={`Ver ${resto.length} más`}
        />
      )}
    </div>
  );
}

function Lista({ items }: { items: ProximoItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((p) => {
        const u = URGENCIA[p.urgencia];
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-canvas)] p-2.5"
          >
            <div className={`flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5 ${u.cd}`}>
              <b className="font-headline text-lg font-extrabold leading-none tabular-nums">
                {p.diasRestantes}
              </b>
              <span className="font-label text-[9px] font-bold uppercase tracking-[0.08em]">
                {p.diasRestantes === 1 ? "día" : "días"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-[var(--shell-fg)]">{p.titulo}</p>
              <p className="truncate text-xs text-[var(--shell-fg-muted)]">{p.detalle}</p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-[0.06em] ${u.tag}`}
            >
              {p.tipoLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
