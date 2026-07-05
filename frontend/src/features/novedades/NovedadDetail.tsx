"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NovedadOut } from "@/lib/types";

interface NovedadDetailProps {
  novedad: NovedadOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovedadDetail({ novedad, open, onOpenChange }: NovedadDetailProps) {
  const cuerpo = novedad.contenido ?? novedad.descripcion;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        {novedad.imagen_url && (
          <div className="aspect-[16/9] w-full overflow-hidden border-b border-[var(--shell-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={novedad.imagen_url}
              alt={novedad.titulo ?? ""}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          {novedad.categoria && (
            <Badge variant="celeste" className="mb-3">
              {novedad.categoria}
            </Badge>
          )}

          <DialogTitle className="text-lg leading-snug">
            {novedad.titulo ?? "Sin título"}
          </DialogTitle>

          <DialogDescription className="mt-2 leading-relaxed text-[var(--shell-fg-muted)]">
            {cuerpo ?? "Sin más información disponible."}
          </DialogDescription>

          {novedad.fuentes.length > 0 && (
            <div className="mt-5 space-y-1.5 border-t border-[var(--shell-border)] pt-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--shell-fg-dim)]">
                {novedad.fuentes.length > 1 ? "Publicado en" : "Fuente"}
              </p>
              {novedad.fuentes.map((f, i) => (
                <a
                  key={`${f.centro.handle}-${i}`}
                  href={f.url ?? f.centro.url_perfil ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-[var(--shell-hover)]"
                >
                  {f.centro.logo_url ? (
                    <span className="flex h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[var(--shell-hover)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.centro.logo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1CA4DF]" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--shell-fg-muted)] group-hover:text-[var(--shell-fg)]">
                    {f.centro.nombre}
                  </span>
                  {f.url && (
                    <span className="material-symbols-outlined shrink-0 text-[16px] text-[var(--shell-fg-dim)] transition-colors group-hover:text-[var(--shell-accent-fg)]">
                      arrow_outward
                    </span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
