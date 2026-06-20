import Link from "next/link";

import { ApiError, listarEventosCalendario } from "@/lib/api";
import type { EventoCalendarioOut, TipoEventoCalendario } from "@/lib/types";

const TIPOS: Array<{ value: TipoEventoCalendario | "todos"; label: string; icon: string }> = [
  { value: "todos", label: "Todos", icon: "calendar_month" },
  { value: "examen", label: "Examenes", icon: "event_upcoming" },
  { value: "inscripcion", label: "Inscripciones", icon: "edit_calendar" },
  { value: "feriado", label: "Feriados", icon: "beach_access" },
  { value: "evento", label: "Eventos", icon: "campaign" },
];

// Colores alineados con la paleta de la agenda de Horarios (mismos tonos).
const TIPO_STYLE: Record<
  TipoEventoCalendario,
  { icon: string; rgb: string; text: string; label: string }
> = {
  examen: {
    icon: "event_upcoming",
    rgb: "255,130,130",
    text: "#ffb0b0",
    label: "Examen",
  },
  inscripcion: {
    icon: "edit_calendar",
    rgb: "138,180,255",
    text: "#bcd4ff",
    label: "Inscripcion",
  },
  feriado: {
    icon: "beach_access",
    rgb: "255,185,80",
    text: "#ffce8f",
    label: "Feriado",
  },
  evento: {
    icon: "campaign",
    rgb: "125,255,162",
    text: "#9cffc2",
    label: "Evento",
  },
};

/** Estilo sólido tipo "evento de agenda" para un tipo de calendario. */
function eventoChipStyle(tipo: TipoEventoCalendario) {
  const { rgb } = TIPO_STYLE[tipo];
  return {
    background: `linear-gradient(0deg, rgba(${rgb},0.14), rgba(${rgb},0.14)), #141d33`,
    border: `1px solid rgba(${rgb},0.26)`,
    borderLeft: `3px solid rgb(${rgb})`,
    color: TIPO_STYLE[tipo].text,
  };
}

type Search = {
  tipo?: string;
  evento?: string;
  dia?: string;
  mes?: string;
};

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const params = (await searchParams) ?? {};
  const tipoParam = normalizarTipo(params.tipo);
  const mesSolicitado = normalizarMes(params.mes);
  const hoy = new Date();

  const { eventos, error } = await obtenerEventos({
    desde: "2025-01-01",
    hasta: "2027-12-31",
    tipo: tipoParam,
  });

  const mesActivo = mesSolicitado ?? mesConDatosMasCercano(eventos, hoy) ?? inicioMes(hoy);
  const eventosMes = eventos.filter((evento) => eventoTocaMes(evento, mesActivo));
  const eventosPorDia = agruparPorDia(eventosMes);
  const futuros = eventos.filter((evento) => new Date(evento.fecha_inicio) >= inicioDia(hoy));
  const proximos = (futuros.length > 0 ? futuros : eventos).slice(0, 5);
  const diaParam = normalizarDia(params.dia);
  const haySeleccionExplicita = Boolean(diaParam || params.evento);
  const eventoSeleccionado = !diaParam
    ? eventos.find((evento) => String(evento.id) === params.evento)
    : undefined;
  const diaSeleccionado =
    diaParam ?? (eventoSeleccionado ? toISODate(new Date(eventoSeleccionado.fecha_inicio)) : null);
  const eventosSeleccionados = haySeleccionExplicita
    ? eventoSeleccionado
      ? [eventoSeleccionado]
      : eventosPorDia.get(diaSeleccionado ?? "") ?? []
    : [];

  const prevMes = sumarMeses(mesActivo, -1);
  const nextMes = sumarMeses(mesActivo, 1);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-blueprint">
      <div className="p-5 md:p-6 max-w-[1500px] mx-auto space-y-5">
        {/* Header compacto — alineado con la agenda */}
        <header className="flex items-center gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-outline/60 font-label">
              Calendario académico · ISI
            </p>
            <h1 className="text-2xl font-black tracking-tight font-headline text-on-surface leading-none mt-1">
              {capitalizarMes(mesActivo)}
            </h1>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5 shrink-0">
            <NavBtn href={hrefCalendario({ mes: prevMes, tipo: tipoParam })} icon="chevron_left" label="Mes anterior" />
            <Link
              href={hrefCalendario({ mes: inicioMes(new Date()), tipo: tipoParam })}
              className="hz-yearchip h-9 px-3.5 rounded-lg flex items-center gap-1.5 text-xs font-bold font-label text-on-surface-variant hover:text-on-surface"
              style={{ background: "rgba(34,42,61,0.6)", border: "1px solid rgba(141,145,155,0.18)" }}
            >
              <span className="material-symbols-outlined text-[16px]">today</span>
              Hoy
            </Link>
            <NavBtn href={hrefCalendario({ mes: nextMes, tipo: tipoParam })} icon="chevron_right" label="Mes siguiente" />
          </div>
        </header>

        {/* Chips de filtro — mismo estilo que los selectores de la agenda */}
        <nav className="flex flex-wrap gap-1.5">
          {TIPOS.map((tipo) => {
            const activo = (tipoParam ?? "todos") === tipo.value;
            const href = hrefCalendario({
              mes: mesActivo,
              tipo: tipo.value === "todos" ? undefined : tipo.value,
            });
            return (
              <Link
                key={tipo.value}
                href={href}
                className="hz-yearchip h-8 px-3 rounded-lg flex items-center gap-1.5 text-[11px] font-bold font-label"
                style={{
                  color: activo ? "#0b1326" : "rgba(195,198,209,0.72)",
                  background: activo ? "#adc6ff" : "rgba(34,42,61,0.6)",
                  border: `1px solid ${activo ? "#adc6ff" : "rgba(141,145,155,0.18)"}`,
                }}
              >
                <span className="material-symbols-outlined text-[16px]">{tipo.icon}</span>
                {tipo.label}
              </Link>
            );
          })}
        </nav>

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-2xl px-4 py-3 text-sm text-error font-medium">
            No pude traer el calendario del backend ({error}).
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          <section className="bg-surface-container/60 rounded-2xl border border-outline-variant/10 p-4 md:p-5">
            <CalendarioMensual
              eventos={eventosMes}
              fecha={mesActivo}
              tipoParam={tipoParam}
              diaSeleccionado={diaSeleccionado ?? null}
            />
          </section>

          <aside className="space-y-5">
            <section className="bg-primary/[0.06] rounded-2xl border border-primary/20 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-primary font-label">
                  Detalle
                </h2>
                <span className="material-symbols-outlined text-[18px] text-primary">
                  event_note
                </span>
              </div>
              {haySeleccionExplicita && eventosSeleccionados.length > 0 && diaSeleccionado ? (
                <DetalleDia
                  fecha={diaSeleccionado}
                  eventos={eventosSeleccionados}
                  mes={mesActivo}
                  tipoParam={tipoParam}
                />
              ) : (
                <EmptyState texto="Selecciona un dia con eventos para ver el detalle." />
              )}
            </section>

            <section className="bg-surface-container/60 rounded-2xl border border-outline-variant/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-outline font-label">
                  Proximos
                </h2>
                <span className="text-xs text-outline font-label">{proximos.length}/5</span>
              </div>
              {proximos.length === 0 ? (
                <EmptyState texto="No hay eventos proximos para este filtro." />
              ) : (
                <ul className="space-y-3">
                  {proximos.map((evento) => (
                    <EventoListaItem
                      key={evento.id}
                      evento={evento}
                      activo={eventosSeleccionados.some((seleccionado) => seleccionado.id === evento.id)}
                      tipoParam={tipoParam}
                    />
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

async function obtenerEventos(params: {
  desde: string;
  hasta: string;
  tipo?: TipoEventoCalendario;
}): Promise<{ eventos: EventoCalendarioOut[]; error: string | null }> {
  try {
    const eventos = await listarEventosCalendario({
      ...params,
      carrera: "ISI",
    });
    return { eventos, error: null };
  } catch (err) {
    if (err instanceof ApiError) {
      return { eventos: [], error: `Backend devolvio ${err.status}` };
    }
    if (err instanceof Error) return { eventos: [], error: err.message };
    return { eventos: [], error: "Error desconocido" };
  }
}

function CalendarioMensual({
  eventos,
  fecha,
  tipoParam,
  diaSeleccionado,
}: {
  eventos: EventoCalendarioOut[];
  fecha: Date;
  tipoParam?: TipoEventoCalendario;
  diaSeleccionado: string | null;
}) {
  const celdas = construirCeldasMes(fecha);
  const eventosPorDia = agruparPorDia(eventos);
  const hoyKey = toISODate(new Date());
  return (
    <div className="space-y-2.5">
      {/* Header de días — estilo agenda */}
      <div
        className="grid grid-cols-7 rounded-xl overflow-hidden"
        style={{ background: "rgba(8,14,30,0.75)", border: "1px solid rgba(141,145,155,0.12)" }}
      >
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia, i) => (
          <div
            key={dia}
            className="text-center font-headline uppercase"
            style={{
              fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em",
              color: "rgba(218,226,253,0.92)", padding: "10px 0",
              borderLeft: i === 0 ? "none" : "1px solid rgba(141,145,155,0.08)",
            }}
          >
            {dia}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {celdas.map((dia) => {
          const key = toISODate(dia);
          const delDia = eventosPorDia.get(key) ?? [];
          const esMesActual = dia.getMonth() === fecha.getMonth();
          const esHoy = key === hoyKey;
          const seleccionado = key === diaSeleccionado;
          const className = `min-h-[116px] rounded-2xl border p-2.5 overflow-hidden transition-colors ${
                esMesActual
                  ? `bg-surface-container-high/35 border-outline-variant/10 ${
                      delDia.length > 0 ? "cursor-pointer hover:border-primary/30" : ""
                    }`
                  : "bg-surface-container-high/10 border-outline-variant/5 opacity-45"
              } ${esHoy ? "ring-1 ring-secondary/50 shadow-[0_0_28px_rgba(125,255,162,0.12)]" : ""} ${
                seleccionado ? "border-primary/50 bg-primary/10" : ""
              }`;
          const contenido = (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${esHoy ? "text-secondary" : "text-on-surface"}`}>
                  {dia.getDate()}
                </span>
                {delDia.length > 0 && (
                  <span className="text-[10px] text-outline font-label">{delDia.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {delDia.slice(0, 3).map((evento) => (
                  <span
                    key={evento.id}
                    className="block truncate px-2 py-1 text-[11px] font-bold font-label"
                    style={{ borderRadius: "7px", ...eventoChipStyle(evento.tipo) }}
                  >
                    {evento.titulo}
                  </span>
                ))}
                {delDia.length > 3 && (
                  <p className="text-[10px] text-outline px-2">
                    +{delDia.length - 3} mas
                  </p>
                )}
              </div>
            </>
          );
          if (delDia.length === 0) {
            return (
              <div key={key} className={className}>
                {contenido}
              </div>
            );
          }
          return (
            <Link
              key={key}
              href={hrefCalendario({ mes: fecha, tipo: tipoParam, dia: key })}
              className={className}
            >
              {contenido}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function EventoListaItem({
  evento,
  activo,
  tipoParam,
}: {
  evento: EventoCalendarioOut;
  activo: boolean;
  tipoParam?: TipoEventoCalendario;
}) {
  const style = TIPO_STYLE[evento.tipo];
  const fechaEvento = new Date(evento.fecha_inicio);
  return (
    <li>
      <Link
        href={hrefCalendario({
          mes: inicioMes(fechaEvento),
          tipo: tipoParam,
          dia: toISODate(fechaEvento),
        })}
        className={`flex gap-3 rounded-2xl border p-3 transition-colors ${
          activo
            ? "border-primary/45 bg-primary/12"
            : "border-outline-variant/10 bg-surface-container-high/40 hover:border-primary/25"
        }`}
      >
        <span className="w-12 h-12 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center shrink-0">
          <span className="text-[10px] uppercase text-primary font-bold font-label">
            {mesCorto(evento.fecha_inicio)}
          </span>
          <span className="text-sm font-black text-on-surface">
            {new Date(evento.fecha_inicio).getDate()}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold font-label" style={{ color: style.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${style.rgb})` }} />
            {style.label}
          </span>
          <span className="block text-sm font-bold text-on-surface truncate mt-1">
            {evento.titulo}
          </span>
          <span className="block text-xs text-on-surface-variant mt-0.5 truncate">
            {formatearHora(evento.fecha_inicio)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function DetalleDia({
  fecha,
  eventos,
  mes,
  tipoParam,
}: {
  fecha: string;
  eventos: EventoCalendarioOut[];
  mes: Date;
  tipoParam?: TipoEventoCalendario;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-outline font-bold font-label">
          {formatearFechaPanel(fecha)}
        </p>
      </div>
      <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
        {eventos.map((evento) => (
          <DetalleEvento
            key={evento.id}
            evento={evento}
            mes={mes}
            tipoParam={tipoParam}
          />
        ))}
      </div>
    </div>
  );
}

function DetalleEvento({
  evento,
  mes,
  tipoParam,
}: {
  evento: EventoCalendarioOut;
  mes: Date;
  tipoParam?: TipoEventoCalendario;
}) {
  const style = TIPO_STYLE[evento.tipo];
  return (
    <article
      className="space-y-3 rounded-2xl p-4"
      style={{
        background: `linear-gradient(0deg, rgba(${style.rgb},0.06), rgba(${style.rgb},0.06)), rgba(34,42,61,0.35)`,
        border: `1px solid rgba(${style.rgb},0.22)`,
        borderLeft: `3px solid rgb(${style.rgb})`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `rgba(${style.rgb},0.14)`, border: `1px solid rgba(${style.rgb},0.25)` }}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ color: style.text }}>
            {style.icon}
          </span>
        </span>
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-widest font-bold font-label" style={{ color: style.text }}>
            {style.label}
          </span>
          <h4 className="text-base font-bold font-headline text-on-surface leading-tight mt-1">
            {evento.titulo}
          </h4>
        </div>
      </div>
      <div className="text-sm text-on-surface-variant space-y-2">
        <p>
          <span className="font-bold text-on-surface">Fecha:</span>{" "}
          {formatearRangoEvento(evento)}
        </p>
        {evento.carrera && evento.tipo !== "feriado" && (
          <p>
            <span className="font-bold text-on-surface">Carrera:</span>{" "}
            {evento.carrera}
          </p>
        )}
      </div>
      {evento.descripcion && (
        <p className="text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
          {evento.descripcion}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Link
          href={hrefCalendario({ mes, tipo: tipoParam, eventoId: evento.id })}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 font-label"
        >
          <span className="material-symbols-outlined text-[16px]">keep</span>
          Fijar
        </Link>
        {evento.fuente_url && (
          <a
            href={evento.fuente_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary hover:text-secondary/80 font-label"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Fuente
          </a>
        )}
      </div>
    </article>
  );
}

function NavBtn({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="hz-yearchip w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface"
      style={{ background: "rgba(34,42,61,0.6)", border: "1px solid rgba(141,145,155,0.18)" }}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </Link>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="border border-dashed border-outline-variant/20 rounded-2xl py-8 text-center text-sm text-on-surface-variant">
      {texto}
    </div>
  );
}

function normalizarTipo(tipo?: string): TipoEventoCalendario | undefined {
  if (tipo === "examen" || tipo === "inscripcion" || tipo === "feriado" || tipo === "evento") {
    return tipo;
  }
  return undefined;
}

function normalizarMes(mes?: string): Date | null {
  const match = mes?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function normalizarDia(dia?: string): string | null {
  const match = dia?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const fecha = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(fecha.getTime())) return null;
  return toISODate(fecha);
}

function inicioMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function finMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
}

function inicioDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function sumarMeses(fecha: Date, cantidad: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1);
}

function construirCeldasMes(fecha: Date): Date[] {
  const inicio = inicioMes(fecha);
  const offsetLunes = (inicio.getDay() + 6) % 7;
  const primerDia = new Date(inicio);
  primerDia.setDate(inicio.getDate() - offsetLunes);
  return Array.from({ length: 42 }, (_, idx) => {
    const dia = new Date(primerDia);
    dia.setDate(primerDia.getDate() + idx);
    return dia;
  });
}

function agruparPorDia(eventos: EventoCalendarioOut[]): Map<string, EventoCalendarioOut[]> {
  const map = new Map<string, EventoCalendarioOut[]>();
  for (const evento of eventos) {
    for (const key of diasDelEvento(evento)) {
      const actuales = map.get(key) ?? [];
      actuales.push(evento);
      map.set(key, actuales);
    }
  }
  return map;
}

function diasDelEvento(evento: EventoCalendarioOut): string[] {
  const inicio = inicioDia(new Date(evento.fecha_inicio));
  if (evento.tipo === "inscripcion" || evento.tipo === "evento") {
    return [toISODate(inicio)];
  }
  const fin = evento.fecha_fin ? inicioDia(new Date(evento.fecha_fin)) : inicio;
  const dias: string[] = [];
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    dias.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function eventoTocaMes(evento: EventoCalendarioOut, mes: Date): boolean {
  const inicio = inicioDia(new Date(evento.fecha_inicio));
  const fin = evento.fecha_fin ? inicioDia(new Date(evento.fecha_fin)) : inicio;
  return inicio <= finMes(mes) && fin >= inicioMes(mes);
}

function mesConDatosMasCercano(
  eventos: EventoCalendarioOut[],
  referencia: Date,
): Date | null {
  if (eventos.length === 0) return null;
  const actual = inicioMes(referencia);
  const conEventos = eventos
    .map((evento) => inicioMes(new Date(evento.fecha_inicio)))
    .sort((a, b) => a.getTime() - b.getTime());
  const futuro = conEventos.find((mes) => mes >= actual);
  return futuro ?? conEventos[conEventos.length - 1] ?? null;
}

function hrefCalendario({
  mes,
  tipo,
  eventoId,
  dia,
}: {
  mes: Date;
  tipo?: TipoEventoCalendario;
  eventoId?: number;
  dia?: string;
}): string {
  const params = new URLSearchParams({ mes: toYearMonth(mes) });
  if (tipo) params.set("tipo", tipo);
  if (eventoId) params.set("evento", String(eventoId));
  if (dia) params.set("dia", dia);
  return `/calendario?${params.toString()}`;
}

function toISODate(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toYearMonth(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function capitalizarMes(fecha: Date): string {
  const texto = fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mesCorto(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-AR", { month: "short" });
}

function formatearHora(fecha: string): string {
  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearFechaLarga(fecha: string): string {
  return new Date(fecha).toLocaleString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearFechaPanel(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatearRangoEvento(evento: EventoCalendarioOut): string {
  const inicio = new Date(evento.fecha_inicio);
  if (!evento.fecha_fin) {
    return "Todo el dia";
  }
  const fin = new Date(evento.fecha_fin);
  if (toISODate(inicio) === toISODate(fin)) {
    return "Todo el dia";
  }
  return `${formatearFechaSinHora(evento.fecha_inicio)} al ${formatearFechaSinHora(evento.fecha_fin)}`;
}

function formatearFechaSinHora(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
