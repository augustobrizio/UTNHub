import type { ContadoresGrafo } from "@/lib/types";

const COLOR: Record<string, { icon: string; value: string }> = {
  secondary: { icon: "text-secondary/70", value: "text-secondary" },
  tertiary:  { icon: "text-tertiary/70",  value: "text-tertiary"  },
  primary:   { icon: "text-primary/70",   value: "text-primary"   },
};

function KpiItem({
  icon,
  label,
  value,
  total,
  color = "primary",
  filled = false,
}: {
  icon: string;
  label: string;
  value: number | string;
  total?: number;
  color?: keyof typeof COLOR;
  filled?: boolean;
}) {
  const c = COLOR[color];
  return (
    <div className="flex flex-col items-center justify-center px-5 py-3 min-w-[72px] gap-0.5">
      <span
        className={`material-symbols-outlined text-[18px] ${c.icon} ${filled ? "material-symbols-filled" : ""}`}
      >
        {icon}
      </span>
      <p className={`text-lg font-black font-headline leading-none ${c.value}`}>
        {value}
        {total !== undefined && (
          <span className="text-xs font-normal text-on-surface-variant/50 ml-0.5">/{total}</span>
        )}
      </p>
      <p className="text-[9px] uppercase tracking-widest text-outline font-bold font-label leading-none">
        {label}
      </p>
    </div>
  );
}

function Divider() {
  return <div className="w-px self-stretch bg-outline-variant/15 my-2" />;
}

export function HeaderStats({ contadores }: { contadores: ContadoresGrafo }) {
  const creditosOk = contadores.creditos_electivas >= contadores.meta_creditos_electivas;
  return (
    <div className="flex items-stretch bg-surface-container rounded-2xl border border-outline-variant/15 overflow-hidden">
      <KpiItem icon="check_circle" label="Aprobadas" value={contadores.aprobadas} total={contadores.total} color="secondary" filled />
      <Divider />
      <KpiItem icon="schedule" label="Regulares" value={contadores.regulares} color="tertiary" />
      <Divider />
      <KpiItem icon="play_circle" label="Cursando" value={contadores.cursando} color="primary" />
      <Divider />
      <KpiItem icon="bolt" label="Cursables" value={contadores.cursables} color="primary" />
      <Divider />
      <KpiItem icon="percent" label="Progreso" value={`${contadores.porcentaje_aprobadas.toFixed(1)}%`} color="secondary" />
      {contadores.carga_horaria_cursando > 0 && (
        <>
          <Divider />
          <KpiItem icon="timer" label="Hs. cursando" value={`${contadores.carga_horaria_cursando}h`} color="primary" />
        </>
      )}
      <Divider />
      <KpiItem
        icon="stars"
        label="Electivas"
        value={contadores.creditos_electivas}
        total={contadores.meta_creditos_electivas}
        color={creditosOk ? "secondary" : "primary"}
        filled={creditosOk}
      />
    </div>
  );
}
