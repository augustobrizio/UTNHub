/**
 * Helpers de presentacion para los avatares de profesor.
 *
 * No hay fotos de docentes, asi que cada profesor se representa con sus
 * iniciales sobre un color de acento del tema. El color se deriva de forma
 * deterministica (mismo profesor -> mismo color entre renders).
 */

/** Iniciales (hasta 2) a partir del nombre. Fallback "?" si no hay nombre. */
export function inicialesProfesor(nombre: string | null): string {
  if (!nombre) return "?";
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase();
  }
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}

export interface AcentoAvatar {
  /** Clases Tailwind para el contenedor del avatar. */
  wrapper: string;
}

/** Paleta rotativa sobre los acentos del tema Kinetic Blueprint. */
const ACENTOS: readonly AcentoAvatar[] = [
  { wrapper: "bg-primary/15 text-primary border-primary/25" },
  { wrapper: "bg-secondary/15 text-secondary border-secondary/25" },
  { wrapper: "bg-tertiary/15 text-tertiary border-tertiary/25" },
] as const;

/** Suma simple de char codes → índice estable en la paleta. */
function hashSeed(seed: number | string): number {
  const s = String(seed);
  let acc = 0;
  for (let i = 0; i < s.length; i++) {
    acc = (acc + s.charCodeAt(i)) % 100000;
  }
  return acc;
}

/** Color de acento determinístico para un profesor (por id o nombre). */
export function acentoProfesor(seed: number | string): AcentoAvatar {
  return ACENTOS[hashSeed(seed) % ACENTOS.length];
}
