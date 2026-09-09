import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import type { ChatUltimo } from "./data";

/**
 * Atajo al asistente en una barra de una línea: si hay historial muestra la
 * última conversación y un CTA para retomarla; si no, invita a arrancar.
 */
export function AsistenteBar({ chat }: { chat: ChatUltimo | null }) {
  const href = chat ? `/chat/${chat.conversacionId}` : "/chat";

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]">
        <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-label text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shell-fg-dim)]">
          {chat ? `Última conversación · ${chat.hace}` : "Asistente UTNHub"}
        </p>
        <p className="truncate text-[13.5px] text-[var(--shell-fg)]">
          {chat ? (
            <span className="italic">“{chat.titulo}”</span>
          ) : (
            "Preguntá sobre régimen, profesores, fechas o lo que necesites."
          )}
        </p>
      </div>
      <Link
        href={href}
        className="ml-auto flex shrink-0 items-center gap-2 rounded-lg bg-[#1CA4DF] px-4 py-2.5 font-body text-[13px] font-bold text-white transition-[filter] hover:brightness-110"
      >
        {chat ? "Retomar" : "Iniciar chat"}
        <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
      </Link>
    </div>
  );
}
