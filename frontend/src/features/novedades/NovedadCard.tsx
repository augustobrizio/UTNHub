import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { NovedadOut } from "@/lib/types";

/**
 * Card de novedad — estetica "Vercel × UTN".
 *
 * Sale a proposito del sistema Kinetic Blueprint (navy + glows + no-line):
 * canvas neutro real, borders hairline, acento celeste UTN. Construida sobre
 * las primitivas shadcn (`Card`, `Badge`).
 */

const CELESTE = "#1CA4DF";

const CATEGORIA_META: Record<string, { label: string; icon: string }> = {
  evento: { label: "Evento", icon: "event" },
  aviso: { label: "Aviso", icon: "campaign" },
  noticia: { label: "Noticia", icon: "article" },
  general: { label: "General", icon: "info" },
};

function fuenteLabel(n: NovedadOut): string {
  if (n.fuente === "utn_web") return "FRRO";
  if (n.fuente === "instagram") return n.origen ?? "Instagram";
  return n.origen ?? "UTN";
}

function fechaCorta(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const mes = d
    .toLocaleDateString("es-AR", { month: "short" })
    .replace(".", "");
  return `${d.getDate()} ${mes} ${d.getFullYear()}`;
}

function fechaBloque(iso: string | null): { dia: string; mes: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    dia: String(d.getDate()),
    mes: d
      .toLocaleDateString("es-AR", { month: "short" })
      .replace(".", "")
      .toUpperCase(),
  };
}

export function NovedadCard({ novedad }: { novedad: NovedadOut }) {
  const meta =
    CATEGORIA_META[novedad.categoria ?? "general"] ?? CATEGORIA_META.general;
  const fecha = fechaCorta(novedad.fecha_publicacion ?? novedad.created_at);
  const bloque = !novedad.imagen_url ? fechaBloque(novedad.fecha_publicacion) : null;
  const href = novedad.url ?? undefined;
  const Root = (href ? "a" : "div") as "a";

  return (
    <Root
      {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group block"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:border-[#1CA4DF]/40 group-hover:bg-[#111113]">
        {/* Cover: imagen, o bloque de fecha editorial, o icono */}
        <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.05]">
          {novedad.imagen_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={novedad.imagen_url}
                alt={novedad.titulo ?? ""}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </>
          ) : bloque ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#1CA4DF]/[0.06]">
              <span
                className="font-headline text-5xl font-bold leading-none tracking-tight"
                style={{ color: CELESTE }}
              >
                {bloque.dia}
              </span>
              <span className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#1CA4DF]/70">
                {bloque.mes}
              </span>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1CA4DF]/[0.05]">
              <span
                className="material-symbols-outlined text-4xl text-[#1CA4DF]/50"
                aria-hidden
              >
                {meta.icon}
              </span>
            </div>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col">
          <div className="mb-2.5 flex items-center gap-3">
            <Badge variant="celeste">{meta.label}</Badge>
            {fecha && (
              <span className="ml-auto shrink-0 whitespace-nowrap text-[11.5px] tabular-nums text-neutral-500">
                {fecha}
              </span>
            )}
          </div>

          <h3 className="font-headline text-[15.5px] font-semibold leading-snug tracking-tight text-neutral-100 line-clamp-2">
            {novedad.titulo ?? "Sin titulo"}
          </h3>

          {novedad.descripcion && (
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-400 line-clamp-2">
              {novedad.descripcion}
            </p>
          )}

          <CardFooter className="mt-4 border-t border-white/[0.05]">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: CELESTE }}
            />
            <span className="text-[11.5px] font-medium text-neutral-400">
              {fuenteLabel(novedad)}
            </span>
            {href && (
              <span className="material-symbols-outlined ml-auto text-[16px] text-neutral-600 transition-all duration-200 group-hover:text-[#4EC0EC] group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                arrow_outward
              </span>
            )}
          </CardFooter>
        </CardContent>
      </Card>
    </Root>
  );
}
