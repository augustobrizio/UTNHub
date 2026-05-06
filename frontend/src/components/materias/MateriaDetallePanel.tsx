import type { CorrelativaEdge, MateriaNodo } from "@/lib/types";

interface Props {
  nodo: MateriaNodo;
  edges: CorrelativaEdge[];
  todosLosNodos: MateriaNodo[];
  onClose: () => void;
}

/**
 * Panel de detalle que aparece debajo del canvas cuando se hace click
 * en un nodo. Muestra correlativas (req. cursar / req. rendir) con su
 * estado actual, para que el alumno vea de un pantallazo que le falta.
 */
export function MateriaDetallePanel({ nodo, edges, todosLosNodos, onClose }: Props) {
  const requeridas = edges.filter((e) => e.hacia === nodo.codigo);
  const habilita = edges.filter((e) => e.desde === nodo.codigo);

  const lookup = new Map(todosLosNodos.map((n) => [n.codigo, n] as const));

  return (
    <section className="bg-surface-container-high/40 border border-outline-variant/10 rounded-3xl p-8 relative overflow-hidden">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar panel"
        className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-surface-container-highest/60 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-outline mb-1 font-label">
            {nodo.codigo} · {nodo.anio_carrera}o anio · {nodo.cuatrimestre}o cuatri
          </p>
          <h3 className="text-2xl font-headline font-extrabold text-on-surface mb-4">
            {nodo.nombre}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <EstadoBadge estado={nodo.estado} />
            {nodo.nota != null && (
              <span className="text-xs text-on-surface-variant">
                Nota: <span className="text-on-surface font-semibold">{nodo.nota}</span>
              </span>
            )}
          </div>
          {nodo.horas != null && (
            <p className="text-xs text-on-surface-variant">
              Carga horaria: <span className="text-on-surface font-semibold">{nodo.horas}h</span>
            </p>
          )}
        </div>

        <div className="lg:col-span-1 space-y-3">
          <h4 className="text-sm font-headline font-bold text-on-surface">
            Para cursarla, necesitas:
          </h4>
          {requeridas.length === 0 ? (
            <p className="text-xs text-outline italic">Sin correlativas previas.</p>
          ) : (
            <ul className="space-y-2">
              {requeridas.map((edge) => {
                const m = lookup.get(edge.desde);
                if (!m) return null;
                return (
                  <li
                    key={`req-${edge.desde}-${edge.tipo}`}
                    className="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2"
                  >
                    <span className="text-xs text-on-surface truncate pr-2">{m.nombre}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] uppercase tracking-wider font-bold ${
                          edge.tipo === "aprobada" ? "text-tertiary" : "text-primary"
                        }`}
                      >
                        {edge.tipo === "aprobada" ? "rendir" : "regular"}
                      </span>
                      <EstadoBadge estado={m.estado} compact />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-1 space-y-3">
          <h4 className="text-sm font-headline font-bold text-on-surface">
            Habilita:
          </h4>
          {habilita.length === 0 ? (
            <p className="text-xs text-outline italic">No es correlativa de ninguna materia.</p>
          ) : (
            <ul className="space-y-2">
              {habilita.map((edge) => {
                const m = lookup.get(edge.hacia);
                if (!m) return null;
                return (
                  <li
                    key={`hab-${edge.hacia}-${edge.tipo}`}
                    className="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2"
                  >
                    <span className="text-xs text-on-surface truncate pr-2">{m.nombre}</span>
                    <EstadoBadge estado={m.estado} compact />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

const ESTADO_LABEL: Record<MateriaNodo["estado"], { label: string; cls: string }> = {
  aprobado: { label: "Aprobada", cls: "bg-secondary/20 text-secondary" },
  regular: { label: "Regular", cls: "bg-tertiary/20 text-tertiary" },
  cursando: { label: "Cursando", cls: "bg-primary/20 text-primary" },
  cursable: { label: "Cursable", cls: "bg-primary/20 text-primary" },
  libre: { label: "Bloqueada", cls: "bg-outline-variant/30 text-outline" },
};

function EstadoBadge({
  estado,
  compact = false,
}: {
  estado: MateriaNodo["estado"];
  compact?: boolean;
}) {
  const { label, cls } = ESTADO_LABEL[estado];
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tracking-wider uppercase ${cls} ${
        compact ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"
      }`}
    >
      {label}
    </span>
  );
}
