"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { MateriaDetallePanel } from "./MateriaDetallePanel";

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
          return est === "regular" || est === "cursando" || est === "aprobado";
        });
        computed.set(nodo.codigo, ok ? "cursable" : "libre");
      }
    }
  }

  return nodos.map((n) => ({ ...n, estado: computed.get(n.codigo) ?? n.estado }));
}

/** Calcula los contadores KPI desde los nodos efectivos (en tiempo real). */
function computarContadores(nodos: MateriaNodo[]): ContadoresGrafo {
  const aprobadas = nodos.filter((n) => n.estado === "aprobado").length;
  const regulares = nodos.filter((n) => n.estado === "regular").length;
  const cursando = nodos.filter((n) => n.estado === "cursando").length;
  const cursables = nodos.filter((n) => n.estado === "cursable").length;
  const total = nodos.length;
  return {
    aprobadas,
    regulares,
    cursando,
    cursables,
    libres: total - aprobadas - regulares - cursando - cursables,
    total,
    porcentaje_aprobadas: total > 0 ? (aprobadas / total) * 100 : 0,
  };
}

// Ciclo de estados al hacer click:
//   cursable/cursando → "regular"
//   regular           → "aprobado"
//   aprobado          → null  (eliminar registro, vuelve a cursable)
//   libre             → ""    (noop)
function siguienteCondicion(estado: EstadoMateria): EstadoMateria | null | "" {
  if (estado === "cursable" || estado === "cursando") return "regular";
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

  // Fuente de verdad local: registros explicitos del usuario.
  // Se inicializa con los datos del servidor y se actualiza con cada click.
  const [registros, setRegistros] = useState<Record<string, EstadoMateria>>(
    () => buildRegistros(grafo.nodos),
  );

  // Cuando el tipo cambia (tab troncal ↔ electiva) el servidor trae un
  // grafo nuevo. Resincronizamos registros con los datos frescos.
  const tipoAnterior = useRef(tipo);
  useEffect(() => {
    if (tipoAnterior.current !== tipo) {
      tipoAnterior.current = tipo;
      setRegistros(buildRegistros(grafo.nodos));
      setSeleccionado(null);
    }
  }, [tipo, grafo.nodos]);

  // Debounce de API calls por materia para evitar race conditions
  // cuando el usuario hace click rapido sobre el mismo nodo.
  const pendingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const intendedState = useRef<Record<string, EstadoMateria | null>>({});

  const handleTipoChange = (nuevo: TipoMateria) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tipo", nuevo);
    router.push(`?${params.toString()}`, { scroll: false });
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

  // Contadores KPI calculados en tiempo real.
  const contadores = useMemo(() => computarContadores(nodosEfectivos), [nodosEfectivos]);

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

  const nodoSeleccionado = useMemo(
    () => nodosEfectivos.find((n) => n.codigo === seleccionado) ?? null,
    [nodosEfectivos, seleccionado],
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-outline font-label">
            ISI · Plan 2023
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight font-headline text-on-surface">
            Grafo de Correlativas
          </h1>
          <p className="text-on-surface-variant max-w-xl">
            Mapa interactivo de Ingenieria en Sistemas de Informacion. Visualiza
            tu progreso academico y planifica tus proximos pasos.
          </p>
        </div>
        <HeaderStats contadores={contadores} />
      </header>

      <div className="flex items-center gap-2 mb-6">
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

      <div className="flex flex-wrap items-center justify-between gap-6 mb-6 p-6 bg-surface-container/40 backdrop-blur-md rounded-2xl border border-outline-variant/10">
        <Filtros
          anios={aniosDisponibles}
          anioFiltro={anioFiltro}
          estadoFiltro={estadoFiltro}
          onAnioChange={setAnioFiltro}
          onEstadoChange={setEstadoFiltro}
        />
        <LeyendaEstados />
      </div>

      <div className="mt-4">
        <GrafoCanvas
          nodos={nodosEfectivos}
          edges={grafo.edges}
          atenuados={atenuados}
          seleccionado={seleccionado}
          onSelect={setSeleccionado}
          onToggleEstado={handleToggleEstado}
        />
      </div>

      {nodoSeleccionado && (
        <div className="mt-6">
          <MateriaDetallePanel
            nodo={nodoSeleccionado}
            edges={grafo.edges}
            todosLosNodos={nodosEfectivos}
            onClose={() => setSeleccionado(null)}
          />
        </div>
      )}
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
        "px-5 py-2 rounded-xl text-sm font-bold tracking-wide transition-all font-label",
        activo
          ? "bg-primary text-on-primary shadow-[0_0_20px_rgba(173,198,255,0.25)]"
          : "bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-high",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
