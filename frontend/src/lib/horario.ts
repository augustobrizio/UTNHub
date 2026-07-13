/**
 * Helpers compartidos para mostrar horarios ("HH:MM:SS" del backend).
 * Usado por el detalle de profesor y la vista de comisiones.
 */

/** "HH:MM:SS" → "HH:MM". Null-safe. */
export function formatHora(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

/** Rango "HH:MM–HH:MM" con fallbacks si falta inicio/fin. */
export function rangoHorario(inicio: string | null, fin: string | null): string {
  const i = formatHora(inicio);
  const f = formatHora(fin);
  return i && f ? `${i}–${f}` : i ?? f ?? "sin horario";
}
