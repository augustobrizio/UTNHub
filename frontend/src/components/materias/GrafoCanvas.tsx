"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CorrelativaEdge, EstadoMateria, MateriaNodo } from "@/lib/types";
import { layoutGrafo, NODE_W, NODE_H } from "./layout";

interface Props {
  nodos: MateriaNodo[];
  edges: CorrelativaEdge[];
  atenuados: Set<string>;
  seleccionado: string | null;
  onSelect: (codigo: string | null) => void;
  onToggleEstado: (codigo: string, estadoActual: EstadoMateria) => void;
  onLongPress: (codigo: string) => void;
}

const ORDINAL: Record<number, string> = { 0: "Sin Año", 1: "1ro", 2: "2do", 3: "3er", 4: "4to", 5: "5to" };

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.15;

export function GrafoCanvas({
  nodos,
  edges,
  atenuados,
  seleccionado,
  onSelect,
  onToggleEstado,
  onLongPress,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitZoomRef = useRef(0.7);

  const layout = useMemo(() => layoutGrafo(nodos), [nodos]);

  // Mapa codigo → estado para iluminar edges activos.
  const nodeEstados = useMemo(
    () => new Map(nodos.map((n) => [n.codigo, n.estado])),
    [nodos],
  );

  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );

  // Calcula zoom inicial ajustado al ancho del contenedor.
  // Solo usamos el ancho (no la altura) para que el texto sea legible —
  // el usuario puede hacer pan vertical con drag.
  // Minimo 0.8 para mantener legibilidad en pantallas chicas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || layout.width === 0) return;
    const { width } = el.getBoundingClientRect();
    const zoomX = (width - 80) / layout.width;
    // Cap en 0.8 para que no se vea demasiado grande en pantallas anchas.
    // Minimo 0.65 para pantallas chicas (el pan vertical cubre el resto).
    const fit = parseFloat(Math.min(zoomX, 0.8).toFixed(2));
    const clamped = Math.max(0.65, fit);
    fitZoomRef.current = clamped;
    setZoom(clamped);
    setPan({ x: 0, y: 0 });
  }, [layout.width]);

  const handleZoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(2))));
  const handleReset = () => {
    setZoom(fitZoomRef.current);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-nodo]")) return;
    dragState.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.x;
    const dy = e.clientY - dragState.current.y;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  };

  const handleMouseUp = () => {
    dragState.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[840px] bg-surface-container-lowest rounded-3xl overflow-hidden bg-blueprint group select-none border border-outline-variant/10 shadow-[inset_0_0_60px_rgba(11,19,38,0.6)]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: dragState.current ? "grabbing" : "grab" }}
    >
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="absolute top-1/2 left-1/2 will-change-transform"
        style={{
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: dragState.current ? "none" : "transform 200ms ease-out",
        }}
      >
        <defs>
          <marker id="arrow-regular" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#adc6ff" />
          </marker>
          <marker id="arrow-aprobada" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ffb950" />
          </marker>
        </defs>

        {/* Etiquetas de columna por anio */}
        {layout.columnas.map((col) => (
          <text
            key={`col-${col.anio}`}
            x={col.x + NODE_W / 2}
            y={62}
            textAnchor="middle"
            fill="var(--color-on-surface-variant, #a0a8b4)"
            fontSize="12"
            fontWeight="800"
            fontFamily="inherit"
            letterSpacing="0.08em"
          >
            {ORDINAL[col.anio] ?? `${col.anio}ro`} {col.anio !== 0 ? "Año" : ""}
          </text>
        ))}

        {/* Edges */}
        <g>
          {edges.map((edge, i) => {
            const desde = layout.posiciones.get(edge.desde);
            const hacia = layout.posiciones.get(edge.hacia);
            if (!desde || !hacia) return null;

            const x1 = desde.x + NODE_W;
            const y1 = desde.y + NODE_H / 2;
            const x2 = hacia.x;
            const y2 = hacia.y + NODE_H / 2;
            const cx = Math.max(40, (x2 - x1) / 2);

            const srcEstado = nodeEstados.get(edge.desde);
            const isActive =
              edge.tipo === "aprobada"
                ? srcEstado === "aprobado"
                : srcEstado === "regular" || srcEstado === "cursando" || srcEstado === "aprobado";

            const stroke = edge.tipo === "aprobada" ? "#ffb950" : "#adc6ff";
            const marker = edge.tipo === "aprobada" ? "url(#arrow-aprobada)" : "url(#arrow-regular)";
            const isAtenuado = atenuados.has(edge.desde) || atenuados.has(edge.hacia);
            const fade = isAtenuado ? 0.1 : isActive ? 1 : 0.25;
            const strokeW = isActive && !isAtenuado ? 2.2 : 1.4;

            return (
              <path
                key={`edge-${i}`}
                d={`M ${x1} ${y1} C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeW}
                opacity={fade}
                markerEnd={marker}
              />
            );
          })}
        </g>

        {/* Nodos */}
        {nodos.map((nodo) => {
          const pos = layout.posiciones.get(nodo.codigo);
          if (!pos) return null;

          return (
            <foreignObject
              key={nodo.codigo}
              x={pos.x}
              y={pos.y}
              width={NODE_W}
              height={NODE_H}
              style={{ overflow: "visible" }}
            >
              <NodoCard
                nodo={nodo}
                selected={seleccionado === nodo.codigo}
                atenuado={atenuados.has(nodo.codigo)}
                onClick={() => {
                  onSelect(nodo.codigo);
                  onToggleEstado(nodo.codigo, nodo.estado);
                }}
                onLongPress={() => onLongPress(nodo.codigo)}
              />
            </foreignObject>
          );
        })}
      </svg>

      {/* Hint de interaccion */}
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface-container-lowest/70 backdrop-blur-md border border-outline-variant/10 text-[9px] text-outline/50 font-label tracking-widest uppercase pointer-events-none select-none whitespace-nowrap">
        Toca para cambiar estado · Mantené presionado para más detalle · Arrastrá para mover
      </div>

      {/* Controles flotantes de zoom */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1 bg-surface-container-lowest/90 backdrop-blur-md p-1.5 rounded-xl border border-outline-variant/15 z-10 shadow-lg">
        <ZoomBtn icon="add" onClick={handleZoomIn} aria-label="Zoom in" />
        <ZoomBtn icon="remove" onClick={handleZoomOut} aria-label="Zoom out" />
        <div className="w-full h-px bg-outline-variant/20 my-0.5" />
        <ZoomBtn icon="fit_screen" onClick={handleReset} aria-label="Fit view" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub-componentes
// ----------------------------------------------------------------------------

function ZoomBtn({
  icon,
  onClick,
  ...rest
}: { icon: string; onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center hover:bg-primary/20 rounded-lg text-on-surface transition-colors"
      {...rest}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
}

const ESTADO_STYLES: Record<
  MateriaNodo["estado"],
  { glow: string; iconColor: string; icon: string; tagColor: string; progress: string }
> = {
  aprobado: {
    glow: "node-glow-approved",
    iconColor: "text-secondary",
    icon: "check_circle",
    tagColor: "text-secondary",
    progress: "bg-secondary w-full",
  },
  regular: {
    glow: "node-glow-regular",
    iconColor: "text-tertiary",
    icon: "schedule",
    tagColor: "text-tertiary",
    progress: "bg-tertiary w-4/5",
  },
  cursando: {
    glow: "node-glow-cursando",
    iconColor: "text-primary",
    icon: "play_circle",
    tagColor: "text-primary",
    progress: "bg-primary w-1/2",
  },
  cursable: {
    glow: "node-glow-cursable",
    iconColor: "text-primary",
    icon: "bolt",
    tagColor: "text-primary",
    progress: "w-0",
  },
  libre: {
    glow: "node-locked",
    iconColor: "text-outline",
    icon: "lock",
    tagColor: "text-outline",
    progress: "w-0",
  },
};

// Estados que el usuario puede ciclar con clicks.
const TOGGLEABLES: ReadonlySet<EstadoMateria> = new Set([
  "cursable",
  "cursando",
  "regular",
  "aprobado",
]);

const ANIO_ORD: Record<number, string> = { 1: "1ro", 2: "2do", 3: "3er", 4: "4to", 5: "5to" };

function NodoCard({
  nodo,
  selected,
  atenuado,
  onClick,
  onLongPress,
}: {
  nodo: MateriaNodo;
  selected: boolean;
  atenuado: boolean;
  onClick: () => void;
  onLongPress: () => void;
}) {
  const style = ESTADO_STYLES[nodo.estado];
  const toggleable = TOGGLEABLES.has(nodo.estado);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const startLongPress = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, 800);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (didLongPress.current) return; // ignorar click post-longpress
    onClick();
  };

  const anioTag = nodo.anio_carrera != null
    ? `${ANIO_ORD[nodo.anio_carrera] ?? nodo.anio_carrera} · ${nodo.codigo}`
    : nodo.codigo;

  return (
    <div
      data-nodo={nodo.codigo}
      onClick={handleClick}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      title={toggleable ? "Click para cambiar estado · Mantener para ver detalle" : "Mantener para ver detalle"}
      className={[
        "w-full h-full p-3 bg-surface-container-high rounded-xl",
        "transition-all duration-200",
        style.glow,
        atenuado ? "opacity-25" : "opacity-100",
        toggleable ? "cursor-pointer hover:scale-[1.03]" : "cursor-default",
        selected ? "scale-[1.04] ring-2 ring-primary" : "",
      ].join(" ")}
    >
      <div className="flex justify-between items-start mb-1.5">
        <span className={`text-[9px] font-bold uppercase tracking-tighter font-label ${style.tagColor}`}>
          {anioTag}
        </span>
        <span
          className={`material-symbols-outlined text-[14px] ${style.iconColor} ${
            nodo.estado === "aprobado" ? "material-symbols-filled" : ""
          }`}
        >
          {style.icon}
        </span>
      </div>
      <h3 className="text-[12px] font-bold leading-tight mb-2 text-on-surface line-clamp-2">
        {nodo.nombre}
      </h3>
      <div className="w-full bg-surface-dim h-1 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-300 ${style.progress}`} />
      </div>
      {nodo.nota != null && (
        <div className="mt-1.5 text-[10px] text-on-surface-variant font-label">
          Nota: <span className="text-on-surface font-semibold">{nodo.nota}</span>
        </div>
      )}
    </div>
  );
}
