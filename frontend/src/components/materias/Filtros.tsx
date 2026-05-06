"use client";

import type { EstadoMateria } from "@/lib/types";

const ESTADOS: ReadonlyArray<{ value: EstadoMateria; label: string }> = [
  { value: "aprobado", label: "Aprobada" },
  { value: "regular", label: "Regular" },
  { value: "cursando", label: "Cursando" },
  { value: "cursable", label: "Cursable" },
  { value: "libre", label: "Bloqueada" },
];

interface Props {
  anios: number[];
  anioFiltro: number | "todos";
  estadoFiltro: EstadoMateria | "todos";
  onAnioChange: (v: number | "todos") => void;
  onEstadoChange: (v: EstadoMateria | "todos") => void;
}

export function Filtros({
  anios,
  anioFiltro,
  estadoFiltro,
  onAnioChange,
  onEstadoChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-widest font-bold text-outline font-label">
          Anio de cursada
        </label>
        <select
          value={anioFiltro}
          onChange={(e) => {
            const v = e.target.value;
            onAnioChange(v === "todos" ? "todos" : Number(v));
          }}
          className="bg-surface-container-highest border-none text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-on-surface min-w-[160px] cursor-pointer"
        >
          <option value="todos">Todos los anios</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}o Anio
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase tracking-widest font-bold text-outline font-label">
          Estado
        </label>
        <select
          value={estadoFiltro}
          onChange={(e) => onEstadoChange(e.target.value as EstadoMateria | "todos")}
          className="bg-surface-container-highest border-none text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-on-surface min-w-[160px] cursor-pointer"
        >
          <option value="todos">Cualquier estado</option>
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
