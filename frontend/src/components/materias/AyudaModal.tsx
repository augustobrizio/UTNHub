"use client";

/**
 * Modal de ayuda — explica toda la interactividad del grafo de correlativas.
 */

interface Props {
  onClose: () => void;
}

const PASOS: {
  icon: string;
  color: string;
  titulo: string;
  descripcion: string;
  detalle?: string;
}[] = [
  {
    icon: "touch_app",
    color: "text-primary",
    titulo: "Cambiar estado",
    descripcion: "Hacé click en cualquier materia para avanzar su estado.",
    detalle: "Cursable → Cursando → Regular → Aprobada → vuelve a Cursable",
  },
  {
    icon: "info",
    color: "text-secondary",
    titulo: "Ver detalle",
    descripcion: "Mantené presionado una materia (o click largo en mobile) para ver sus correlativas, nota y más información.",
  },
  {
    icon: "grade",
    color: "text-tertiary",
    titulo: "Ver notas",
    descripcion: "Usá el botón «Ver notas» dentro del canvas (arriba a la derecha) para dar vuelta todos los nodos.",
    detalle: "El reverso muestra el estado y tu nota de cada materia aprobada.",
  },
  {
    icon: "pan_tool",
    color: "text-primary",
    titulo: "Navegar el canvas",
    descripcion: "Arrastrá el canvas para moverte por el grafo.",
    detalle: "Usá los botones de zoom en la esquina inferior derecha, o la rueda del mouse.",
  },
  {
    icon: "filter_list",
    color: "text-outline",
    titulo: "Filtros",
    descripcion: "Filtrá por año o estado para resaltar solo las materias que te interesan. El resto se atenúa.",
  },
  {
    icon: "upload_file",
    color: "text-secondary",
    titulo: "Importar desde SYSACAD",
    descripcion: "Copiá tu Estado Académico con Ctrl+A → Ctrl+C y pegalo en el modal de importación.",
    detalle: "El sistema detecta automáticamente tus materias, estados y notas.",
  },
  {
    icon: "delete",
    color: "text-error",
    titulo: "Borrar registro",
    descripcion: "Mantené presionado una materia y usá «Borrar registro» para quitar su estado.",
    detalle: "Desde el modal de importación también podés borrar todas las notas de una vez.",
  },
];

export function AyudaModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-surface-container rounded-3xl shadow-2xl border border-outline-variant/20 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-outline-variant/10 shrink-0 bg-surface-container-high rounded-t-3xl">
          <div>
            <h2 className="text-lg font-headline font-extrabold text-on-surface">
              ¿Cómo usar el grafo?
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Todo lo que podés hacer en esta pantalla
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl bg-surface-container-highest/60 hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors shrink-0 mt-0.5"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Lista de funciones */}
        <div className="overflow-y-auto flex-1 px-7 py-5 space-y-3">
          {PASOS.map((paso) => (
            <div
              key={paso.titulo}
              className="flex gap-4 rounded-2xl bg-surface-container-high border border-outline-variant/10 px-4 py-3.5"
            >
              <div className="shrink-0 mt-0.5">
                <span className={`material-symbols-outlined text-[22px] ${paso.color}`}>
                  {paso.icon}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface leading-snug">{paso.titulo}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                  {paso.descripcion}
                </p>
                {paso.detalle && (
                  <p className="text-[10px] text-outline/70 mt-1 font-label italic leading-relaxed">
                    {paso.detalle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-7 py-4 border-t border-outline-variant/10 bg-surface-container-low/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary/15 hover:bg-primary/25 text-primary px-6 py-2 text-sm font-bold transition-colors"
          >
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
}
