import { CalendarClock } from "lucide-react";
import Link from "next/link";

import type { AgendaItem } from "./data";

/**
 * Agenda del día: clases (con hora real, de las comisiones elegidas en
 * Horarios) y eventos del calendario académico, en un timeline compacto.
 */
export function AgendaCard({ items }: { items: AgendaItem[] }) {
  return (
    <div className="flex flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]">
          <CalendarClock className="h-[17px] w-[17px]" strokeWidth={2} />
        </div>
        <h3 className="font-headline text-[15px] font-bold text-[var(--shell-fg)]">Agenda de hoy</h3>
        <Link
          href="/calendario"
          className="ml-auto font-label text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--shell-accent-fg)] hover:opacity-80"
        >
          Ver semana
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--shell-border)] py-8 text-center">
          <p className="text-sm font-medium text-[var(--shell-fg-muted)]">
            No tenés nada en agenda para hoy.
          </p>
          <p className="mt-1 text-xs text-[var(--shell-fg-dim)]">
            Aprovechá y dale a esa lectura pendiente.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((item, idx) => (
            <li key={item.id} className="grid grid-cols-[52px_20px_1fr_auto] items-center gap-3 py-2">
              <span className="text-right font-headline text-[13px] font-bold text-[var(--shell-accent-fg)] tabular-nums">
                {item.hora}
              </span>
              <span className="relative flex justify-center self-stretch">
                {idx !== 0 && (
                  <span className="absolute bottom-1/2 top-0 w-px bg-[var(--shell-border)]" />
                )}
                {idx !== items.length - 1 && (
                  <span className="absolute bottom-0 top-1/2 w-px bg-[var(--shell-border)]" />
                )}
                <span className="z-10 mt-[7px] h-2.5 w-2.5 self-start rounded-full border-2 border-[#1CA4DF] bg-[var(--shell-panel)]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-[var(--shell-fg)]">
                  {item.titulo}
                </span>
                <span className="block truncate text-xs text-[var(--shell-fg-muted)]">
                  {item.detalle}
                </span>
              </span>
              {item.duracionMin > 0 && (
                <span className="text-xs text-[var(--shell-fg-dim)] tabular-nums">
                  {item.duracionMin}′
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
