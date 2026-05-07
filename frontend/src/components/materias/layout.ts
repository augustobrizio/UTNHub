import type { MateriaNodo } from "@/lib/types";

/**
 * Autolayout por columnas: una columna por anio.
 *
 * Dentro de cada columna, ordena por (cuatrimestre, codigo) y los
 * apila verticalmente. Las materias sin anio (e.g. "Ing. y Sociedad"
 * que cruza varios anios o las electivas sueltas) van a una columna
 * "Sin anio" al final.
 */

export const NODE_W = 200;
export const NODE_H = 86;
export const COL_W = 280;
export const ROW_H = 110;
export const PAD_X = 60;
export const PAD_Y = 80;

export interface NodoPos {
  x: number;
  y: number;
}

export interface Columna {
  anio: number; // 0 para "Sin anio"
  x: number;
  count: number;
}

export interface LayoutResult {
  posiciones: Map<string, NodoPos>;
  columnas: Columna[];
  width: number;
  height: number;
}

/**
 * Calcula posiciones absolutas (x, y) de cada nodo y devuelve tambien
 * el bounding box del canvas y la lista de columnas por anio (para
 * etiquetas).
 */
export function layoutGrafo(nodos: MateriaNodo[]): LayoutResult {
  // Agrupar por anio (null -> 0)
  const grupos = new Map<number, MateriaNodo[]>();
  for (const n of nodos) {
    const a = n.anio_carrera ?? 0;
    if (!grupos.has(a)) grupos.set(a, []);
    grupos.get(a)!.push(n);
  }

  // Ordenar dentro de cada grupo
  for (const lista of grupos.values()) {
    lista.sort((a, b) => {
      const ca = a.cuatrimestre ?? 99;
      const cb = b.cuatrimestre ?? 99;
      if (ca !== cb) return ca - cb;
      return a.codigo.localeCompare(b.codigo);
    });
  }

  // Anios ordenados (0 al final si existe)
  const aniosOrdenados = [...grupos.keys()].sort((a, b) => {
    if (a === 0) return 1;
    if (b === 0) return -1;
    return a - b;
  });

  const posiciones = new Map<string, NodoPos>();
  const columnas: Columna[] = [];
  let maxRows = 0;

  aniosOrdenados.forEach((anio, colIdx) => {
    const lista = grupos.get(anio)!;
    const xCol = PAD_X + colIdx * COL_W;

    columnas.push({ anio, x: xCol, count: lista.length });
    maxRows = Math.max(maxRows, lista.length);

    lista.forEach((nodo, rowIdx) => {
      posiciones.set(nodo.codigo, {
        x: xCol,
        y: PAD_Y + rowIdx * ROW_H,
      });
    });
  });

  const width = aniosOrdenados.length * COL_W + PAD_X;
  const height = maxRows * ROW_H + PAD_Y * 2;

  return { posiciones, columnas, width, height };
}
