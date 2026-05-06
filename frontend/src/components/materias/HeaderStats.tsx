import type { ContadoresGrafo } from "@/lib/types";

/**
 * 3 cards de KPI del header. Bordes laterales con color del estado +
 * glow segun la regla del Stitch.
 */
export function HeaderStats({ contadores }: { contadores: ContadoresGrafo }) {
  return (
    <div className="flex flex-wrap gap-3">
      <StatCard
        label="Aprobadas"
        value={contadores.aprobadas}
        total={contadores.total}
        color="secondary"
        glowClass="node-glow-approved"
      />
      <StatCard
        label="Regulares"
        value={contadores.regulares}
        color="tertiary"
        glowClass="node-glow-regular"
      />
      <StatCard
        label="Cursables"
        value={contadores.cursables}
        color="primary"
        glowClass="node-glow-cursable"
      />
      <StatCard
        label="Progreso"
        value={`${contadores.porcentaje_aprobadas.toFixed(1)}%`}
        color="primary"
        glowClass="node-glow-cursable"
      />
    </div>
  );
}

const COLOR_CLASSES = {
  secondary: { border: "border-secondary", text: "text-secondary" },
  tertiary: { border: "border-tertiary", text: "text-tertiary" },
  primary: { border: "border-primary", text: "text-primary" },
} as const;

function StatCard({
  label,
  value,
  total,
  color,
  glowClass,
}: {
  label: string;
  value: number | string;
  total?: number;
  color: keyof typeof COLOR_CLASSES;
  glowClass: string;
}) {
  const c = COLOR_CLASSES[color];
  return (
    <div
      className={`bg-surface-container px-5 py-4 rounded-xl border-l-4 ${c.border} ${glowClass} transition-all`}
    >
      <p
        className={`text-[10px] uppercase tracking-widest ${c.text} font-bold mb-1 font-label`}
      >
        {label}
      </p>
      <p className="text-2xl font-black font-headline">
        {value}
        {total !== undefined && (
          <span className="text-sm font-normal text-on-surface-variant/60 ml-1">
            / {total}
          </span>
        )}
      </p>
    </div>
  );
}
