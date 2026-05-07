"use client";

import type { EstadoMateria } from "@/lib/types";

const ANIO_ORDINAL: Record<number, string> = { 1: "1ro", 2: "2do", 3: "3er", 4: "4to", 5: "5to" };

const ESTADOS: ReadonlyArray<{ value: EstadoMateria; label: string }> = [
  { value: "aprobado",  label: "Aprobadas"  },
  { value: "regular",   label: "Regulares"  },
  { value: "cursando",  label: "Cursando"   },
  { value: "cursable",  label: "Cursables"  },
  { value: "libre",     label: "Bloqueadas" },
];

const SELECT_CLS =
  "bg-surface-container-high border border-outline-variant/15 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 text-on-surface cursor-pointer hover:border-outline-variant/30 transition-colors";

interface Props {
  anios: number[];
  anioFiltro: number | "todos";
  estadoFiltro: EstadoMateria | "todos";
  onAnioChange: (v: number | "todos") => void;
  onEstadoChange: (v: EstadoMateria | "todos") => void;
}

export function Filtros({ anios, anioFiltro, estadoFiltro, onAnioChange, onEstadoChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={anioFiltro}
        onChange={(e) => {
          const v = e.target.value;
          onAnioChange(v === "todos" ? "todos" : Number(v));
        }}
        className={SELECT_CLS}
      >
        <option value="todos">Todos los años</option>
        {anios.map((a) => (
          <option key={a} value={a}>
            {ANIO_ORDINAL[a] ?? `${a}°`} Año
          </option>
        ))}
      </select>

      <select
        value={estadoFiltro}
        onChange={(e) => onEstadoChange(e.target.value as EstadoMateria | "todos")}
        className={SELECT_CLS}
      >
        <option value="todos">Cualquier estado</option>
        {ESTADOS.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>
    </div>
  );
}
