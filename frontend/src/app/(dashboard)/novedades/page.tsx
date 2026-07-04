import Link from "next/link";

import { NovedadCard } from "@/features/novedades/NovedadCard";
import { listarNovedades } from "@/lib/api";
import type { CategoriaNovedad, NovedadOut } from "@/lib/types";

const FILTROS: Array<{ value: CategoriaNovedad | "todos"; label: string }> = [
  { value: "todos", label: "Todas" },
  { value: "aviso", label: "Avisos" },
  { value: "evento", label: "Eventos" },
  { value: "noticia", label: "Noticias" },
  { value: "general", label: "General" },
];

type Search = { categoria?: string };

function normalizarCategoria(v?: string): CategoriaNovedad | undefined {
  return v === "aviso" || v === "evento" || v === "noticia" || v === "general"
    ? v
    : undefined;
}

export default async function NovedadesPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const params = (await searchParams) ?? {};
  const categoria = normalizarCategoria(params.categoria);

  let novedades: NovedadOut[] = [];
  let error = false;
  try {
    novedades = await listarNovedades({ categoria, limite: 30 });
  } catch {
    error = true;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#09090b]">
      {/* Hero con identidad UTN: wash celeste + isotipo difuminado + membrete */}
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_88%_-20%,rgba(28,164,223,0.16),transparent_55%)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/utn-isotipo-white.png"
            alt=""
            className="absolute -right-4 -top-12 w-[280px] select-none opacity-[0.05] blur-[1px]"
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-8 pb-11 pt-11">
          {/* Membrete institucional */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/utn-frro-white.png"
            alt="UTN — Facultad Regional Rosario"
            className="mb-7 h-[18px] w-auto opacity-40"
          />

          <div className="mb-3 flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1CA4DF] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1CA4DF]" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              Actualizado automaticamente
            </span>
          </div>

          <h1 className="font-headline text-4xl font-bold tracking-tight text-neutral-50 md:text-[52px] md:leading-[1.05]">
            Novedades
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-400">
            Avisos, fechas y anuncios de la facultad, reunidos automaticamente
            en un solo lugar.
          </p>
        </div>
      </header>

      {/* Contenido */}
      <div className="mx-auto max-w-6xl px-8 py-9">
        <nav className="mb-8 flex flex-wrap gap-2">
          {FILTROS.map((f) => {
            const activo =
              f.value === "todos" ? categoria === undefined : categoria === f.value;
            const href =
              f.value === "todos" ? "/novedades" : `/novedades?categoria=${f.value}`;
            return (
              <Link
                key={f.value}
                href={href}
                className={[
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
                  activo
                    ? "border-[#1CA4DF]/40 bg-[#1CA4DF]/10 text-[#4EC0EC]"
                    : "border-white/[0.07] text-neutral-400 hover:border-white/20 hover:text-neutral-200",
                ].join(" ")}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>

        {error ? (
          <EstadoVacio
            icono="cloud_off"
            titulo="No pudimos cargar las novedades"
            detalle="El servidor no respondio. Proba de nuevo en un momento."
          />
        ) : novedades.length === 0 ? (
          <EstadoVacio
            icono="inbox"
            titulo="Todavia no hay novedades"
            detalle="Cuando la facultad publique algo nuevo, va a aparecer aca."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {novedades.map((n) => (
              <NovedadCard key={n.id} novedad={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EstadoVacio({
  icono,
  titulo,
  detalle,
}: {
  icono: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-[#0c0c0e] px-6 py-24 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1CA4DF]/10">
        <span className="material-symbols-outlined text-3xl text-[#4EC0EC]">
          {icono}
        </span>
      </div>
      <h2 className="font-headline text-lg font-semibold tracking-tight text-neutral-200">
        {titulo}
      </h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-neutral-500">
        {detalle}
      </p>
    </div>
  );
}
