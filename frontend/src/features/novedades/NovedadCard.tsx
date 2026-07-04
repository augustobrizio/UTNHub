import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { NovedadOut } from "@/lib/types";

/**
 * Card de novedad — estetica "Vercel × UTN": canvas neutro, border hairline,
 * acento celeste. Construida sobre las primitivas shadcn (`Card`).
 *
 * Toda novedad muestra imagen: la propia del post, o un placeholder generico
 * (resuelto por el backend). La fecha es la de ingesta.
 */

const CELESTE = "#1CA4DF";

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

export function NovedadCard({ novedad }: { novedad: NovedadOut }) {
  const fecha = fechaCorta(novedad.created_at);
  const href = novedad.url ?? undefined;
  const Root = (href ? "a" : "div") as "a";

  return (
    <Root
      {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group block"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:border-[#1CA4DF]/40 group-hover:bg-[#111113]">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1CA4DF]/[0.05]">
              <span
                className="material-symbols-outlined text-4xl text-[#1CA4DF]/50"
                aria-hidden
              >
                campaign
              </span>
            </div>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col">
          <h3 className="font-headline text-base font-semibold leading-snug tracking-tight text-neutral-100 line-clamp-2">
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
            {fecha && (
              <span className="ml-auto shrink-0 whitespace-nowrap text-[11.5px] tabular-nums text-neutral-500">
                {fecha}
              </span>
            )}
            {href && (
              <span
                className={[
                  "material-symbols-outlined shrink-0 text-[16px] text-neutral-600 transition-all duration-200 group-hover:text-[#4EC0EC] group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
                  fecha ? "ml-2" : "ml-auto",
                ].join(" ")}
              >
                arrow_outward
              </span>
            )}
          </CardFooter>
        </CardContent>
      </Card>
    </Root>
  );
}
