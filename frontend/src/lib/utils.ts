import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` — helper canonico de shadcn/ui: combina clases condicionales (clsx) y
 * resuelve conflictos de Tailwind (tailwind-merge). Base para los componentes
 * de `components/ui/`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
