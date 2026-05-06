/**
 * Leyenda de estados + tipos de correlativa. Inspirado en el header del
 * Tracker UTN Sistemas que el usuario tomo como referencia.
 */
export function LeyendaEstados() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-on-surface-variant">
      <Dot color="bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.6)]" label="Aprobadas" />
      <Dot color="bg-tertiary shadow-[0_0_8px_rgba(255,185,80,0.6)]" label="Regulares" />
      <Dot color="bg-primary shadow-[0_0_8px_rgba(173,198,255,0.6)]" label="Cursables" />
      <Dot color="bg-outline-variant" label="Bloqueadas" muted />

      <span className="w-px h-5 bg-outline-variant/30 mx-2 hidden md:inline-block" />

      <LineLegend color="stroke-primary" label="Req. cursar" />
      <LineLegend color="stroke-tertiary" label="Req. rendir" />
    </div>
  );
}

function Dot({ color, label, muted = false }: { color: string; label: string; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${muted ? "opacity-60" : ""}`}>
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="font-medium">{label}</span>
    </div>
  );
}

function LineLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="8" viewBox="0 0 28 8" className="overflow-visible">
        <line x1="0" y1="4" x2="28" y2="4" className={color} strokeWidth="2" />
      </svg>
      <span className="font-medium">{label}</span>
    </div>
  );
}
