"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

/**
 * Card con contenido plegable. En reposo muestra sólo `resumen`; el botón
 * revela `detalle`. Es la pieza que hace que el dashboard sea "un vistazo
 * rápido" y no un scroll largo: cada card arranca compacta y el alumno abre
 * lo que le interesa.
 *
 * `resumen` y `detalle` se rinden en el server (llegan como props ya
 * renderizadas), así el fetch de datos queda del lado del server component.
 */
export function Expandable({
  resumen,
  detalle,
  labelMas,
  labelMenos = "Ver menos",
}: {
  resumen: React.ReactNode;
  detalle: React.ReactNode;
  labelMas: string;
  labelMenos?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {resumen}
      {abierto && (
        <div className="mt-3.5 border-t border-[var(--shell-border)] pt-3.5">{detalle}</div>
      )}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--shell-border)] py-2 font-body text-xs font-semibold text-[var(--shell-fg-muted)] transition-colors hover:border-[#1CA4DF]/50 hover:text-[var(--shell-fg)]"
      >
        {abierto ? labelMenos : labelMas}
        <ChevronDown
          className={`h-[15px] w-[15px] shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>
    </>
  );
}
