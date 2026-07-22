/**
 * Utilidades para interpretar el nombre de una comisión.
 *
 * Convención de nombres (Dpto. ISI):
 *   1K01   → regular (año + "K" + número)
 *   3AK01  → Analista (año + "A" + "K")
 *   2EK01  → electiva (año + "E" + "K")
 */

/** Una comisión es de materias electivas si tiene una "E" tras el año (ej. "3EK02"). */
export function esComisionElectiva(nombre: string | null | undefined): boolean {
  return /^\s*\d+\s*E/i.test(nombre ?? "");
}
