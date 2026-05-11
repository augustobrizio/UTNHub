import type { Cuatrimestre, MateriaNodo } from "@/lib/types";

/**
 * Convierte el valor de cuatrimestre (string) a un numero para ordenar.
 * '1' -> 1, '2' -> 2, 'anual' y '1 y 2' -> 1.5 (entre ambos cuatrimestres).
 */
export function cuatriSortKey(c: Cuatrimestre | null | undefined): number {
  if (c === "1") return 1;
  if (c === "2") return 2;
  return 1.5; // anual, '1 y 2', null
}

/**
 * Devuelve el label de display para cuatrimestre.
 * '1' -> '1er Cuatrimestre', '2' -> '2do Cuatrimestre',
 * '1 y 2' -> '1er y 2do Cuatrimestre', 'anual' -> 'Anual'.
 */
export function cuatriLabel(c: Cuatrimestre | null | undefined): string | null {
  if (!c) return null;
  if (c === "1") return "1er Cuatrimestre";
  if (c === "2") return "2do Cuatrimestre";
  if (c === "1 y 2") return "1er y 2do Cuatrimestre";
  if (c === "anual") return "Anual";
  return c;
}

/**
 * Autolayout por columnas: una columna por anio.
 *
 * Dentro de cada columna, ordena por (cuatrimestre, codigo) y los
 * apila verticalmente. Las materias sin anio (e.g. "Ing. y Sociedad"
 * que cruza varios anios o las electivas sueltas) van a una columna
 * "Sin anio" al final.
 */

export const NODE_W = 218;
export const NODE_H = 98;
export const COL_W = 306;
export const ROW_H = 122;
export const PAD_X = 48;
export const PAD_Y = 106;   // espacio desde el top del SVG hasta el primer nodo
export const LABEL_Y = 62;  // baseline de las etiquetas de columna (año)

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
      const ca = cuatriSortKey(a.cuatrimestre);
      const cb = cuatriSortKey(b.cuatrimestre);
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
