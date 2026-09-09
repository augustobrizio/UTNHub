import { AlarmClock, BookOpen, GraduationCap, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ContadoresGrafo } from "@/lib/types";
import type { ProximoItem } from "./data";

/**
 * Fila de KPIs del dashboard: los cuatro números que contestan "¿cómo voy?"
 * de un vistazo, antes de cualquier detalle. Todo sale de los contadores del
 * grafo salvo "Próximo", que es el evento más cercano del calendario.
 */
export function QuickStats({
  contadores,
  proximo,
}: {
  contadores: ContadoresGrafo;
  proximo: ProximoItem | null;
}) {
  const promedio =
    contadores.promedio_general != null ? contadores.promedio_general.toFixed(2) : "—";
  const pct = Math.round(contadores.porcentaje_aprobadas);

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <Tile
        icon={GraduationCap}
        tono="good"
        label="Promedio"
        valor={promedio}
      />
      <Tile
        icon={TrendingUp}
        tono="accent"
        label="Carrera"
        valor={`${pct}%`}
        sub={`${contadores.aprobadas}/${contadores.total}`}
      />
      <Tile
        icon={BookOpen}
        tono="violet"
        label="En cursada"
        valor={String(contadores.cursando)}
        sub={contadores.carga_horaria_cursando ? `${contadores.carga_horaria_cursando} hs` : undefined}
      />
      <Tile
        icon={AlarmClock}
        tono="warn"
        label="Próximo"
        valor={proximo ? proximo.tipoLabel : "—"}
        sub={proximo ? textoDias(proximo.diasRestantes) : "sin eventos"}
      />
    </div>
  );
}

function textoDias(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  return `en ${dias} días`;
}

const TONOS = {
  good: "bg-emerald-500/12 text-emerald-500",
  accent: "bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]",
  violet: "bg-violet-500/12 text-violet-400",
  warn: "bg-amber-500/12 text-amber-500",
} as const;

function Tile({
  icon: Icon,
  tono,
  label,
  valor,
  sub,
}: {
  icon: LucideIcon;
  tono: keyof typeof TONOS;
  label: string;
  valor: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] px-4 py-3.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONOS[tono]}`}>
        <Icon className="h-[19px] w-[19px]" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="font-body text-[11px] font-semibold text-[var(--shell-fg-muted)]">{label}</p>
        <p className="font-headline text-lg font-extrabold leading-tight text-[var(--shell-fg)] tabular-nums">
          {valor}
          {sub && (
            <span className="ml-1 text-xs font-semibold text-[var(--shell-fg-muted)]">· {sub}</span>
          )}
        </p>
      </div>
    </div>
  );
}
