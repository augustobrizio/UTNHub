"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Popup que salta cuando un visitante sin cuenta intenta usar el chatbot.
 *
 * El chat se puede *ver* sin cuenta —la interfaz, las sugerencias— pero para
 * *usarlo* hace falta registrarse: cada consulta pega al backend con token y
 * las conversaciones son de un usuario. En vez de un 401 mudo o de esconder la
 * sección, se muestra el chat y recién al enviar aparece este aviso. Mismo
 * lenguaje que la Bienvenida de la portada (Dialog de Radix: foco atrapado,
 * Escape y scroll-lock incluidos).
 */
export function AvisoRegistro({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-w-md">
        <div className="p-7 md:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1CA4DF]/25 bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]">
            <span className="material-symbols-outlined text-[26px]">smart_toy</span>
          </div>

          <DialogTitle className="text-[24px] font-extrabold leading-tight tracking-[-0.01em]">
            Entrá para usar el chatbot
          </DialogTitle>

          <DialogDescription className="mt-3 leading-relaxed">
            Podés mirar de qué se trata, pero para preguntarle a meK necesitás una
            cuenta: cada respuesta se arma con fuentes oficiales y tus
            conversaciones quedan guardadas para retomarlas.
          </DialogDescription>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/login?next=%2Fchat"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1CA4DF] px-5 py-2.5 font-body text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90"
            >
              Iniciar sesión
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--shell-border)] px-5 py-2.5 font-body text-sm font-semibold text-[var(--shell-fg)] transition-colors duration-150 hover:bg-[var(--shell-hover)]"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
