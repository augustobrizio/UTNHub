import { Megaphone } from "lucide-react";
import Link from "next/link";

import type { NovedadItem } from "./data";
import { Expandable } from "./Expandable";

const VISIBLES = 2;

/**
 * Novedades de la facu (feed del pipeline de ingesta) como lista compacta de
 * una línea. Muestra las más recientes y despliega el resto. Cada ítem es un
 * deep link interno a la novedad ya clasificada, no a Instagram.
 */
export function NovedadesCard({ novedades }: { novedades: NovedadItem[] }) {
  const visibles = novedades.slice(0, VISIBLES);
  const resto = novedades.slice(VISIBLES);

  return (
    <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/12 text-amber-500">
          <Megaphone className="h-[17px] w-[17px]" strokeWidth={2} />
        </div>
        <h3 className="font-headline text-[15px] font-bold text-[var(--shell-fg)]">
          Novedades de la facu
        </h3>
        <Link
          href="/novedades"
          className="ml-auto font-label text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shell-accent-fg)] hover:opacity-80"
        >
          Ver todas
        </Link>
      </div>

      {novedades.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--shell-border)] py-8 text-center">
          <p className="text-sm font-medium text-[var(--shell-fg-muted)]">Sin novedades pendientes.</p>
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

function Lista({ items }: { items: NovedadItem[] }) {
  return (
    <div className="flex flex-col">
      {items.map((n) => (
        <Link
          key={n.id}
          href={n.url}
          className="group flex items-center gap-3 border-b border-[var(--shell-border)] py-2.5 last:border-b-0"
        >
          <span
            className={`h-6 w-[3px] shrink-0 rounded-full ${n.esAviso ? "bg-amber-500" : "bg-[#1CA4DF]"}`}
          />
          <span
            className={`w-14 shrink-0 font-label text-[9.5px] font-bold uppercase tracking-[0.08em] ${n.esAviso ? "text-amber-500" : "text-[var(--shell-accent-fg)]"}`}
          >
            {n.categoria}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--shell-fg)] group-hover:text-[var(--shell-accent-fg)]">
            {n.titulo}
          </span>
          {n.hace && (
            <span className="shrink-0 text-[11px] text-[var(--shell-fg-dim)]">{n.hace}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
