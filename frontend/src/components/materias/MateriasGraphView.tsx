"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ContadoresGrafo,
  CorrelativaEdge,
  EstadoMateria,
  GrafoResponse,
  MateriaNodo,
  TipoMateria,
} from "@/lib/types";
import { registrarEstado, eliminarEstado } from "@/lib/api";
import { GrafoCanvas } from "./GrafoCanvas";
import { HeaderStats } from "./HeaderStats";
import { Filtros } from "./Filtros";
import { LeyendaEstados } from "./LeyendaEstados";
import { MateriaDetallePanel, EstadoBadge } from "./MateriaDetallePanel";

const USUARIO_ID = 1;

// ---------------------------------------------------------------------------
// Logica de cascada client-side
// ---------------------------------------------------------------------------

/**
 * Extrae los registros explicitos del servidor
 * (solo los que tienen condicion guardada en DB).
 */
function buildRegistros(nodos: MateriaNodo[]): Record<string, EstadoMateria> {
  const r: Record<string, EstadoMateria> = {};
  for (const n of nodos) {
    if (n.estado === "regular" || n.estado === "aprobado" || n.estado === "cursando") {
      r[n.codigo] = n.estado;
    }
  }
  return r;
}

/**
 * Calcula el estado de TODOS los nodos dado un conjunto de registros
 * explicitos del usuario y las reglas de correlatividad (edges).
 *
 * `externalRegistros` contiene los estados de nodos de OTRAS pestanas
 * (ej: troncales cuando estamos en electivas) para resolver prereqs cross-tab.
 */
function computarEstados(
  nodos: MateriaNodo[],
  edges: CorrelativaEdge[],
  registros: Record<string, EstadoMateria>,
  externalRegistros: Record<string, EstadoMateria> = {},
): MateriaNodo[] {
  const prereqsMap = new Map<string, CorrelativaEdge[]>();
  for (const edge of edges) {
    const list = prereqsMap.get(edge.hacia) ?? [];
    list.push(edge);
    prereqsMap.set(edge.hacia, list);
  }

  const sorted = [...nodos].sort((a, b) => {
    const ay = (a.anio_carrera ?? 99) * 10 + (a.cuatrimestre ?? 9);
    const by = (b.anio_carrera ?? 99) * 10 + (b.cuatrimestre ?? 9);
    return ay - by;
  });

  const computed = new Map<string, EstadoMateria>();

  for (const nodo of sorted) {
    const registro = registros[nodo.codigo];
    if (registro) {
      computed.set(nodo.codigo, registro);
    } else {
      const prereqs = prereqsMap.get(nodo.codigo) ?? [];
      if (prereqs.length === 0) {
        computed.set(nodo.codigo, "cursable");
      } else {
        const ok = prereqs.every((edge) => {
          // Para prereqs cross-tab (troncales cuando vemos electivas),
          // usamos externalRegistros como fallback.
          const est = computed.get(edge.desde) ?? externalRegistros[edge.desde];
          if (edge.tipo === "aprobada") return est === "aprobado";
          // "cursando" no cuenta: regularizar requiere haber pasado los parciales.
          return est === "regular" || est === "aprobado";
        });
        computed.set(nodo.codigo, ok ? "cursable" : "libre");
      }
    }
  }

  return nodos.map((n) => ({ ...n, estado: computed.get(n.codigo) ?? n.estado }));
}

/**
 * Calcula contadores KPI en tiempo real.
 *
 * Para los campos cross-tab (`carga_horaria_cursando`, `creditos_electivas`)
 * usamos el valor del servidor como base y aplicamos el delta de cambios de la
 * pestaña actual. Así reflejan cada click sin esperar al siguiente fetch.
 *
 * Ejemplo: si el servidor reporta 7h cursando (troncales) y el usuario marca
 * una materia de 4h como cursando, el contador sube a 11h de inmediato.
 */
// Materias optativas excluidas del total y % de avance (igual que en el backend).
const MATERIAS_OPCIONALES = new Set(["ADUSI"]);

function computarContadores(
  nodosEfectivos: MateriaNodo[],
  nodosInicial: MateriaNodo[],
  serverContadores: ContadoresGrafo,
): ContadoresGrafo {
  const aprobadas = nodosEfectivos.filter((n) => n.estado === "aprobado" && !MATERIAS_OPCIONALES.has(n.codigo)).length;
  const regulares = nodosEfectivos.filter((n) => n.estado === "regular").length;
  const cursando  = nodosEfectivos.filter((n) => n.estado === "cursando").length;
  const cursables = nodosEfectivos.filter((n) => n.estado === "cursable").length;
  const total     = nodosEfectivos.length;

  // Porcentaje excluye ADUSI (no obligatoria para graduarse).
  // El total de obligatorias viene del servidor (ya lo filtra el backend).
  const aprobadasObligatorias = nodosEfectivos.filter(
    (n) => n.estado === "aprobado" && !MATERIAS_OPCIONALES.has(n.codigo),
  ).length;
  const totalObligatorias = serverContadores.total; // ya excluye ADUSI

  // Delta de horas cursando respecto al estado inicial del servidor
  const horasInicial  = nodosInicial
    .filter((n) => n.estado === "cursando")
    .reduce((s, n) => s + (n.horas ?? 0), 0);
  const horasActual   = nodosEfectivos
    .filter((n) => n.estado === "cursando")
    .reduce((s, n) => s + (n.horas ?? 0), 0);

  // Delta de créditos de electivas aprobadas
  const creditosInicial = nodosInicial
    .filter((n) => n.tipo === "electiva" && n.estado === "aprobado")
    .reduce((s, n) => s + (n.horas ?? 0), 0);
  const creditosActual  = nodosEfectivos
    .filter((n) => n.tipo === "electiva" && n.estado === "aprobado")
    .reduce((s, n) => s + (n.horas ?? 0), 0);

  return {
    aprobadas,
    regulares,
    cursando,
    cursables,
    libres: total - aprobadas - regulares - cursando - cursables,
    total: totalObligatorias,
    porcentaje_aprobadas: totalObligatorias > 0
      ? (aprobadasObligatorias / totalObligatorias) * 100
      : 0,
    carga_horaria_cursando: Math.max(
      0,
      serverContadores.carga_horaria_cursando + (horasActual - horasInicial),
    ),
    creditos_electivas: Math.max(
      0,
      serverContadores.creditos_electivas + (creditosActual - creditosInicial),
    ),
    meta_creditos_electivas: serverContadores.meta_creditos_electivas,
  };
}

// Ciclo de estados al hacer click:
//   cursable  → "cursando"
//   cursando  → "regular"
//   regular   → "aprobado"
//   aprobado  → null  (eliminar registro, vuelve a cursable)
//   libre     → ""    (noop)
function siguienteCondicion(estado: EstadoMateria): EstadoMateria | null | "" {
  if (estado === "cursable") return "cursando";
  if (estado === "cursando") return "regular";
  if (estado === "regular") return "aprobado";
  if (estado === "aprobado") return null;
  return "";
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface Props {
  grafo: GrafoResponse;
  tipo: TipoMateria;
}

export function MateriasGraphView({ grafo, tipo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [anioFiltro, setAnioFiltro] = useState<number | "todos">("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoMateria | "todos">("todos");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [modalCodigo, setModalCodigo] = useState<string | null>(null);

  // Fuente de verdad local: registros explicitos del usuario.
  // Se inicializa con los datos del servidor y se actualiza con cada click.
  const [registros, setRegistros] = useState<Record<string, EstadoMateria>>(
    () => buildRegistros(grafo.nodos),
  );

  // Debounce de API calls por materia para evitar race conditions
  // cuando el usuario hace click rapido sobre el mismo nodo.
  const pendingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const intendedState = useRef<Record<string, EstadoMateria | null>>({});

  const handleTipoChange = (nuevo: TipoMateria) => {
    // Flush debounces pendientes antes de cambiar de pestaña para que el
    // servidor tenga los estados actualizados al traer el nuevo grafo.
    const promises: Promise<unknown>[] = [];
    for (const cod of Object.keys(pendingTimers.current)) {
      clearTimeout(pendingTimers.current[cod]);
      delete pendingTimers.current[cod];
      const intended = intendedState.current[cod];
      delete intendedState.current[cod];
      if (intended === null) {
        promises.push(eliminarEstado(USUARIO_ID, cod));
      } else if (intended !== undefined) {
        promises.push(registrarEstado(USUARIO_ID, cod, { condicion: intended, forzar: true }));
      }
    }
    const navigate = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tipo", nuevo);
      router.push(`?${params.toString()}`, { scroll: false });
    };
    if (promises.length > 0) {
      void Promise.all(promises).finally(navigate);
    } else {
      navigate();
    }
  };

  const handleToggleEstado = (codigo: string, estadoActual: EstadoMateria) => {
    const siguiente = siguienteCondicion(estadoActual);
    if (siguiente === "") return; // libre — sin accion

    // 1. Actualizar registros localmente (instantaneo, sin esperar API).
    setRegistros((prev) => {
      const next = { ...prev };
      if (siguiente === null) {
        delete next[codigo]; // aprobado → volver a cursable (calcula cascada)
      } else {
        next[codigo] = siguiente;
      }
      return next;
    });

    // 2. Registrar la intencion mas reciente para el debounce.
    intendedState.current[codigo] = siguiente;
    clearTimeout(pendingTimers.current[codigo]);

    // 3. Persistir en DB tras 350ms de inactividad en este nodo.
    //    Esto previene race conditions si el usuario hace click rapido.
    pendingTimers.current[codigo] = setTimeout(() => {
      const intended = intendedState.current[codigo];
      delete intendedState.current[codigo];

      void (async () => {
        try {
          if (intended === null) {
            await eliminarEstado(USUARIO_ID, codigo);
          } else if (intended !== undefined) {
            await registrarEstado(USUARIO_ID, codigo, {
              condicion: intended,
              forzar: true,
            });
          }
        } catch (err) {
          console.error("[toggle] API error para", codigo, err);
          // En caso de error, revertir al estado anterior.
          setRegistros((prev) => {
            const next = { ...prev };
            if (
              estadoActual === "regular" ||
              estadoActual === "aprobado" ||
              estadoActual === "cursando"
            ) {
              next[codigo] = estadoActual;
            } else {
              delete next[codigo];
            }
            return next;
          });
        }
      })();
    }, 350);
  };

  // Nodos con estados recalculados (incluye cascadas).
  // registros_usuario contiene estados de TODAS las materias (cross-tab) del servidor.
  // Lo mezclamos con los cambios locales para resolver prereqs de otras pestanas.
  const externalRegistros = useMemo(
    () => ({ ...grafo.registros_usuario, ...registros }),
    [grafo.registros_usuario, registros],
  );

  const nodosEfectivos = useMemo(
    () => computarEstados(grafo.nodos, grafo.edges, registros, externalRegistros),
    [grafo.nodos, grafo.edges, registros, externalRegistros],
  );

  // Contadores KPI calculados en tiempo real con delta client-side.
  const contadores = useMemo(
    () => computarContadores(nodosEfectivos, grafo.nodos, grafo.contadores),
    [nodosEfectivos, grafo.nodos, grafo.contadores],
  );

  const aniosDisponibles = useMemo(() => {
    const anios = new Set<number>();
    for (const n of nodosEfectivos) {
      if (n.anio_carrera != null) anios.add(n.anio_carrera);
    }
    return [...anios].sort((a, b) => a - b);
  }, [nodosEfectivos]);

  const atenuados = useMemo(() => {
    const set = new Set<string>();
    for (const n of nodosEfectivos) {
      if (anioFiltro !== "todos" && n.anio_carrera !== anioFiltro) {
        set.add(n.codigo);
        continue;
      }
      if (estadoFiltro !== "todos" && n.estado !== estadoFiltro) {
        set.add(n.codigo);
      }
    }
    return set;
  }, [nodosEfectivos, anioFiltro, estadoFiltro]);

  // Todos los nodos visibles + externos (para lookup en el panel de detalle)
  const todosLosNodos = useMemo(
    () => [...nodosEfectivos, ...grafo.nodos_externos],
    [nodosEfectivos, grafo.nodos_externos],
  );

  const nodoSeleccionado = useMemo(
    () => todosLosNodos.find((n) => n.codigo === seleccionado) ?? null,
    [todosLosNodos, seleccionado],
  );

  const nodoModal = useMemo(
    () => todosLosNodos.find((n) => n.codigo === modalCodigo) ?? null,
    [todosLosNodos, modalCodigo],
  );

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-outline/60 font-label mb-2">
            ISI · Plan 2023
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight font-headline text-on-surface mb-1">
            Grafo de Correlativas
          </h1>
          <p className="text-sm text-on-surface-variant">
            Visualizá tu avance y planificá tus próximos pasos.
          </p>
        </div>
        <HeaderStats contadores={contadores} />
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-surface-container/50 rounded-2xl border border-outline-variant/10 w-fit">
        <TabToggle
          label="Troncales"
          activo={tipo === "troncal"}
          onClick={() => handleTipoChange("troncal")}
        />
        <TabToggle
          label="Electivas"
          activo={tipo === "electiva"}
          onClick={() => handleTipoChange("electiva")}
        />
      </div>

      {/* Filtros + leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-5 py-4 bg-surface-container/40 backdrop-blur-md rounded-2xl border border-outline-variant/10">
        <Filtros
          anios={aniosDisponibles}
          anioFiltro={anioFiltro}
          estadoFiltro={estadoFiltro}
          onAnioChange={setAnioFiltro}
          onEstadoChange={setEstadoFiltro}
        />
        <LeyendaEstados />
      </div>

      <div>
        <GrafoCanvas
          nodos={nodosEfectivos}
          edges={grafo.edges}
          atenuados={atenuados}
          seleccionado={seleccionado}
          onSelect={setSeleccionado}
          onToggleEstado={handleToggleEstado}
          onLongPress={(codigo) => setModalCodigo(codigo)}
        />
      </div>

      {nodoSeleccionado && (
        <div className="mt-6">
          <MateriaDetallePanel
            nodo={nodoSeleccionado}
            edges={grafo.edges}
            todosLosNodos={todosLosNodos}
            onClose={() => setSeleccionado(null)}
          />
        </div>
      )}

      {nodoModal && (
        <MateriaModal
          nodo={nodoModal}
          edges={grafo.edges}
          todosLosNodos={todosLosNodos}
          onClose={() => setModalCodigo(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de detalle (apertura por long-press)
// ---------------------------------------------------------------------------

const ANIO_ORD: Record<number, string> = { 1: "1ro", 2: "2do", 3: "3er", 4: "4to", 5: "5to" };
const CUATRI_ORD: Record<number, string> = { 1: "1er", 2: "2do" };

function MateriaModal({
  nodo,
  edges,
  todosLosNodos,
  onClose,
}: {
  nodo: MateriaNodo;
  edges: CorrelativaEdge[];
  todosLosNodos: MateriaNodo[];
  onClose: () => void;
}) {
  const requeridas = edges.filter((e) => e.hacia === nodo.codigo);
  const habilita = edges.filter((e) => e.desde === nodo.codigo);
  const lookup = new Map(todosLosNodos.map((n) => [n.codigo, n] as const));

  const anioLabel = nodo.anio_carrera != null
    ? `${ANIO_ORD[nodo.anio_carrera] ?? `${nodo.anio_carrera}°`} Año`
    : null;
  const cuatriLabel = nodo.cuatrimestre != null
    ? `${CUATRI_ORD[nodo.cuatrimestre] ?? `${nodo.cuatrimestre}°`} Cuatrimestre`
    : "Anual";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-xl bg-surface-container border border-outline-variant/20 rounded-3xl shadow-2xl max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="px-7 pt-7 pb-5 border-b border-outline-variant/10 shrink-0 bg-surface-container-high rounded-t-3xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div className="flex items-start gap-3 mb-3">
            <EstadoBadge estado={nodo.estado} />
            <div className="flex flex-wrap gap-1.5">
              {anioLabel && (
                <span className="text-[9px] bg-surface-container px-2 py-0.5 rounded-full text-outline font-label uppercase tracking-widest border border-outline-variant/15">
                  {anioLabel}
                </span>
              )}
              <span className="text-[9px] bg-surface-container px-2 py-0.5 rounded-full text-outline font-label uppercase tracking-widest border border-outline-variant/15">
                {cuatriLabel}
              </span>
              {nodo.horas != null && (
                <span className="text-[9px] bg-surface-container px-2 py-0.5 rounded-full text-outline font-label uppercase tracking-widest border border-outline-variant/15">
                  {nodo.horas}h semanales
                </span>
              )}
              {nodo.nota != null && (
                <span className="text-[9px] bg-secondary/10 px-2 py-0.5 rounded-full text-secondary font-label uppercase tracking-widest border border-secondary/20">
                  Nota: {nodo.nota}
                </span>
              )}
            </div>
          </div>

          <h2 className="text-xl font-headline font-extrabold text-on-surface leading-tight">
            {nodo.nombre}
          </h2>
          <p className="text-[10px] text-outline/60 font-label mt-1">{nodo.codigo}</p>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="overflow-y-auto flex-1 px-7 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Prereqs */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.12em] text-outline font-bold font-label mb-3">
                Para cursarla necesitás
              </p>
              {requeridas.length === 0 ? (
                <p className="text-xs text-outline italic">Sin correlativas previas.</p>
              ) : (
                <ul className="space-y-2">
                  {requeridas.map((edge) => {
                    const m = lookup.get(edge.desde);
                    if (!m) return null;
                    const esAprobada = edge.tipo === "aprobada";
                    const cuatriM = m.cuatrimestre != null
                      ? `${CUATRI_ORD[m.cuatrimestre] ?? m.cuatrimestre}° cuatrimestre`
                      : "Anual";
                    return (
                      <li
                        key={`req-${edge.desde}-${edge.tipo}`}
                        className="rounded-xl bg-surface-container-high border border-outline-variant/10 overflow-hidden"
                      >
                        <div className="px-3 py-2.5">
                          <p className="text-xs text-on-surface font-medium leading-snug">{m.nombre}</p>
                          <p className="text-[9px] text-outline/50 mt-0.5">{m.codigo} · {cuatriM}</p>
                        </div>
                        <div className={`px-3 py-1.5 flex items-center gap-1.5 ${esAprobada ? "bg-tertiary/10 border-t border-tertiary/20" : "bg-primary/10 border-t border-primary/20"}`}>
                          <span className={`material-symbols-outlined text-[13px] ${esAprobada ? "text-tertiary" : "text-primary"}`}>
                            {esAprobada ? "school" : "edit_note"}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest font-label ${esAprobada ? "text-tertiary" : "text-primary"}`}>
                            {esAprobada ? "Necesitás aprobada" : "Necesitás regularizada"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Habilita */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.12em] text-outline font-bold font-label mb-3">
                Habilita para cursar
              </p>
              {habilita.length === 0 ? (
                <p className="text-xs text-outline italic">No habilita ninguna materia.</p>
              ) : (
                <ul className="space-y-2">
                  {habilita.map((edge) => {
                    const m = lookup.get(edge.hacia);
                    if (!m) return null;
                    const esAprobada = edge.tipo === "aprobada";
                    const cuatriM = m.cuatrimestre != null
                      ? `${CUATRI_ORD[m.cuatrimestre] ?? m.cuatrimestre}° cuatrimestre`
                      : "Anual";
                    return (
                      <li
                        key={`hab-${edge.hacia}-${edge.tipo}`}
                        className="rounded-xl bg-surface-container-high border border-outline-variant/10 overflow-hidden"
                      >
                        <div className="px-3 py-2.5">
                          <p className="text-xs text-on-surface font-medium leading-snug">{m.nombre}</p>
                          <p className="text-[9px] text-outline/50 mt-0.5">{m.codigo} · {cuatriM}</p>
                        </div>
                        <div className={`px-3 py-1 flex items-center gap-1.5 ${esAprobada ? "bg-tertiary/10 border-t border-tertiary/20" : "bg-primary/10 border-t border-primary/20"}`}>
                          <span className={`text-[9px] font-bold uppercase tracking-widest font-label ${esAprobada ? "text-tertiary" : "text-primary"}`}>
                            {esAprobada ? "Desbloquea al aprobar" : "Desbloquea al regularizar"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabToggle({
  label,
  activo,
  onClick,
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-5 py-2 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 font-label",
        activo
          ? "bg-primary/20 text-primary shadow-[inset_0_0_0_1px_rgba(173,198,255,0.3)]"
          : "text-outline hover:text-on-surface",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
