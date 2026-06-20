"use client";

import { useMemo, useState } from "react";
import type { EventoCalendarioOut, TipoEventoCalendario } from "@/lib/types";
import {
  TIPO, ORDEN_TIPOS,
  toISODate, inicioMes, sumarMeses, sumarDias,
  celdasMes, diasSemana, inicioSemana,
  agruparPorDia, eventosFuturos, proximoImportante,
  diffDias, countdown, mesLargo, diaMes, fechaLarga, rangoEvento, capitalizar,
} from "./utils";

type Vista = "mes" | "semana" | "agenda";
type Filtro = TipoEventoCalendario | "todos";

const HOY = new Date();
const DIAS_LBL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CalendarioView({ eventos }: { eventos: EventoCalendarioOut[] }) {
  const [vista, setVista] = useState<Vista>("mes");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ancla, setAncla] = useState<Date>(() => {
    // arrancar en un mes con eventos cercano a hoy
    const fut = eventosFuturos(eventos);
    return inicioMes(fut[0] ? new Date(fut[0].fecha_inicio) : HOY);
  });
  const [diaSel, setDiaSel] = useState<string | null>(null);

  const eventosFiltrados = useMemo(
    () => (filtro === "todos" ? eventos : eventos.filter((e) => e.tipo === filtro)),
    [eventos, filtro],
  );

  // ── Métricas (dashboard) ────────────────────────────────────────────────
  const futuros = useMemo(() => eventosFuturos(eventos), [eventos]);
  const conteos = useMemo(() => {
    const c: Record<TipoEventoCalendario, number> = { examen: 0, inscripcion: 0, evento: 0, feriado: 0 };
    for (const e of futuros) c[e.tipo]++;
    return c;
  }, [futuros]);
  const importante = useMemo(() => proximoImportante(eventos), [eventos]);

  // Panel derecho: evento(s) del día seleccionado o el próximo importante
  const eventosDia = useMemo(() => {
    if (!diaSel) return [];
    return agruparPorDia(eventosFiltrados).get(diaSel) ?? [];
  }, [diaSel, eventosFiltrados]);

  const nav = (dir: -1 | 1) => {
    setDiaSel(null);
    setAncla((a) => (vista === "semana" ? sumarDias(a, dir * 7) : sumarMeses(a, dir)));
  };
  const irHoy = () => { setDiaSel(null); setAncla(inicioMes(HOY)); };

  const tituloPeriodo =
    vista === "semana"
      ? rangoSemanaLabel(ancla)
      : vista === "agenda"
        ? "Próximos eventos"
        : mesLargo(ancla);

  return (
    <div className="p-5 md:p-6 max-w-[1500px] mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-outline/60 font-label">
            Calendario académico · ISI
          </p>
          <h1 className="text-2xl font-black tracking-tight font-headline text-on-surface leading-none mt-1">
            {tituloPeriodo}
          </h1>
        </div>

        <div className="flex-1" />

        {/* Tabs de vista */}
        <div className="flex gap-0.5 p-0.5 rounded-[10px] shrink-0" style={{ background: "rgba(6,14,32,0.9)", border: "1px solid rgba(141,145,155,0.1)" }}>
          {(["mes", "semana", "agenda"] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => { setVista(v); setDiaSel(null); }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold font-label capitalize transition-all"
              style={{
                color: vista === v ? "#0b1326" : "rgba(195,198,209,0.7)",
                background: vista === v ? "#adc6ff" : "transparent",
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navegación (oculta en agenda) */}
        {vista !== "agenda" && (
          <div className="flex items-center gap-1.5 shrink-0">
            <NavBtn icon="chevron_left" onClick={() => nav(-1)} label="Anterior" />
            <button
              onClick={irHoy}
              className="cal-card h-9 px-3.5 rounded-lg flex items-center gap-1.5 text-xs font-bold font-label text-on-surface-variant hover:text-on-surface"
              style={{ background: "rgba(34,42,61,0.6)", border: "1px solid rgba(141,145,155,0.18)" }}
            >
              <span className="material-symbols-outlined text-[16px]">today</span>
              Hoy
            </button>
            <NavBtn icon="chevron_right" onClick={() => nav(1)} label="Siguiente" />
          </div>
        )}
      </header>

      {/* ── Dashboard de métricas ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ORDEN_TIPOS.map((t) => (
          <MetricCard
            key={t}
            tipo={t}
            cantidad={conteos[t]}
            activo={filtro === t}
            onClick={() => setFiltro((f) => (f === t ? "todos" : t))}
          />
        ))}
      </div>

      {/* ── Cuerpo: calendario + panel ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <section
          key={`${vista}-${toISODate(ancla)}`}
          className="cal-fade bg-surface-container/60 rounded-2xl border border-outline-variant/10 p-4 md:p-5 min-w-0"
        >
          {vista === "mes" && (
            <MonthGrid ancla={ancla} eventos={eventosFiltrados} diaSel={diaSel} onSelDia={toggleDia} />
          )}
          {vista === "semana" && (
            <WeekGrid ancla={ancla} eventos={eventosFiltrados} diaSel={diaSel} onSelDia={toggleDia} />
          )}
          {vista === "agenda" && (
            <AgendaList eventos={filtro === "todos" ? futuros : futuros.filter((e) => e.tipo === filtro)} />
          )}
        </section>

        <aside className="space-y-4">
          {diaSel && eventosDia.length > 0 ? (
            <DiaPanel fechaISO={diaSel} eventos={eventosDia} onCerrar={() => setDiaSel(null)} />
          ) : (
            <ProximoPanel evento={importante} />
          )}
          <TimelinePanel eventos={futuros.slice(0, 7)} />
        </aside>
      </div>
    </div>
  );

  function toggleDia(iso: string, hayEventos: boolean) {
    if (!hayEventos) return;
    setDiaSel((d) => (d === iso ? null : iso));
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Métricas
// ───────────────────────────────────────────────────────────────────────────

function MetricCard({
  tipo, cantidad, activo, onClick,
}: { tipo: TipoEventoCalendario; cantidad: number; activo: boolean; onClick: () => void }) {
  const cfg = TIPO[tipo];
  return (
    <button
      onClick={onClick}
      className="cal-card text-left rounded-2xl p-4 relative overflow-hidden group"
      style={{
        ["--c" as string]: cfg.rgb,
        background: activo ? `rgba(${cfg.rgb},0.12)` : "rgba(34,42,61,0.45)",
        border: `1px solid ${activo ? `rgba(${cfg.rgb},0.5)` : "rgba(141,145,155,0.12)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `rgba(${cfg.rgb},0.16)`, border: `1px solid rgba(${cfg.rgb},0.25)` }}
        >
          <span className="material-symbols-outlined text-[19px]" style={{ color: cfg.text }}>{cfg.icon}</span>
        </span>
        {activo && (
          <span className="text-[9px] font-bold uppercase tracking-wider font-label px-2 py-0.5 rounded-full" style={{ color: cfg.text, background: `rgba(${cfg.rgb},0.14)` }}>
            filtrando
          </span>
        )}
      </div>
      <p className="text-[28px] font-black font-headline leading-none" style={{ color: "#eaf0ff" }}>{cantidad}</p>
      <p className="text-[11px] font-label mt-1.5" style={{ color: "rgba(141,145,155,0.85)" }}>
        {cfg.plural} {cantidad === 1 ? "próximo" : "próximos"}
      </p>
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Vista MES
// ───────────────────────────────────────────────────────────────────────────

function MonthGrid({
  ancla, eventos, diaSel, onSelDia,
}: { ancla: Date; eventos: EventoCalendarioOut[]; diaSel: string | null; onSelDia: (iso: string, hay: boolean) => void }) {
  const celdas = celdasMes(ancla);
  const porDia = agruparPorDia(eventos);
  const hoyKey = toISODate(HOY);
  const mesActual = ancla.getMonth();

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-7 rounded-xl overflow-hidden" style={{ background: "rgba(8,14,30,0.75)", border: "1px solid rgba(141,145,155,0.12)" }}>
        {DIAS_LBL.map((d, i) => (
          <div key={d} className="text-center font-headline uppercase" style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", color: "rgba(218,226,253,0.92)", padding: "10px 0", borderLeft: i === 0 ? "none" : "1px solid rgba(141,145,155,0.08)" }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {celdas.map((dia) => {
          const key = toISODate(dia);
          const delDia = porDia.get(key) ?? [];
          const esMes = dia.getMonth() === mesActual;
          const esHoy = key === hoyKey;
          const sel = key === diaSel;
          return (
            <button
              key={key}
              onClick={() => onSelDia(key, delDia.length > 0)}
              className={`cal-day min-h-[112px] rounded-xl p-2 overflow-hidden text-left flex flex-col ${esHoy ? "cal-today-glow" : ""}`}
              style={{
                background: sel ? "rgba(173,198,255,0.1)" : esMes ? "rgba(34,42,61,0.35)" : "rgba(34,42,61,0.12)",
                border: `1px solid ${sel ? "rgba(173,198,255,0.5)" : esHoy ? "rgba(125,255,162,0.5)" : "rgba(141,145,155,0.08)"}`,
                opacity: esMes ? 1 : 0.4,
                cursor: delDia.length > 0 ? "pointer" : "default",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-xs font-bold font-headline flex items-center justify-center"
                  style={{
                    color: esHoy ? "#0b1326" : "#dae2fd",
                    background: esHoy ? "#7dffa2" : "transparent",
                    width: esHoy ? "20px" : "auto", height: esHoy ? "20px" : "auto",
                    borderRadius: "6px",
                  }}
                >
                  {dia.getDate()}
                </span>
                {delDia.length > 0 && (
                  <div className="flex gap-0.5">
                    {ORDEN_TIPOS.filter((t) => delDia.some((e) => e.tipo === t)).map((t) => (
                      <span key={t} className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${TIPO[t].rgb})` }} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 flex-1">
                {delDia.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="block truncate px-1.5 py-0.5 text-[10.5px] font-bold font-label"
                    style={{ borderRadius: "5px", color: TIPO[e.tipo].text, background: `rgba(${TIPO[e.tipo].rgb},0.14)`, borderLeft: `2px solid rgb(${TIPO[e.tipo].rgb})` }}
                  >
                    {e.titulo}
                  </span>
                ))}
                {delDia.length > 3 && (
                  <span className="block text-[10px] text-outline/70 font-label pl-1">+{delDia.length - 3} más</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Vista SEMANA
// ───────────────────────────────────────────────────────────────────────────

function WeekGrid({
  ancla, eventos, diaSel, onSelDia,
}: { ancla: Date; eventos: EventoCalendarioOut[]; diaSel: string | null; onSelDia: (iso: string, hay: boolean) => void }) {
  const dias = diasSemana(ancla);
  const porDia = agruparPorDia(eventos);
  const hoyKey = toISODate(HOY);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
      {dias.map((dia, i) => {
        const key = toISODate(dia);
        const delDia = porDia.get(key) ?? [];
        const esHoy = key === hoyKey;
        const sel = key === diaSel;
        return (
          <div
            key={key}
            className={`rounded-xl p-2.5 min-h-[180px] flex flex-col ${esHoy ? "cal-today-glow" : ""}`}
            style={{
              background: sel ? "rgba(173,198,255,0.08)" : "rgba(34,42,61,0.3)",
              border: `1px solid ${sel ? "rgba(173,198,255,0.4)" : esHoy ? "rgba(125,255,162,0.45)" : "rgba(141,145,155,0.1)"}`,
            }}
          >
            <button onClick={() => onSelDia(key, delDia.length > 0)} className="text-left mb-2">
              <p className="text-[10px] uppercase tracking-wider font-bold font-label" style={{ color: esHoy ? "#9cffc2" : "rgba(141,145,155,0.7)" }}>{DIAS_LBL[i]}</p>
              <p className="text-lg font-black font-headline" style={{ color: esHoy ? "#9cffc2" : "#dae2fd" }}>{dia.getDate()}</p>
            </button>
            <div className="space-y-1.5 flex-1">
              {delDia.length === 0 ? (
                <p className="text-[10px] text-outline/30 font-label">—</p>
              ) : delDia.map((e) => (
                <div key={e.id} className="px-2 py-1.5 rounded-lg" style={{ background: `rgba(${TIPO[e.tipo].rgb},0.12)`, borderLeft: `2.5px solid rgb(${TIPO[e.tipo].rgb})` }}>
                  <p className="text-[11px] font-bold leading-snug" style={{ color: TIPO[e.tipo].text }}>{e.titulo}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Vista AGENDA
// ───────────────────────────────────────────────────────────────────────────

function AgendaList({ eventos }: { eventos: EventoCalendarioOut[] }) {
  if (eventos.length === 0) {
    return <EmptyState texto="No hay eventos próximos para este filtro." />;
  }
  // Agrupar por fecha de inicio
  const grupos = new Map<string, EventoCalendarioOut[]>();
  for (const e of eventos) {
    const k = toISODate(new Date(e.fecha_inicio));
    const arr = grupos.get(k) ?? [];
    arr.push(e);
    grupos.set(k, arr);
  }

  return (
    <div className="space-y-4">
      {[...grupos.entries()].map(([iso, evs]) => {
        const n = diffDias(iso);
        const { dia, mes } = diaMes(iso);
        const esHoy = n === 0;
        return (
          <div key={iso} className="flex gap-4">
            {/* Columna fecha */}
            <div className="shrink-0 w-14 text-center pt-1">
              <p className="text-2xl font-black font-headline leading-none" style={{ color: esHoy ? "#9cffc2" : "#dae2fd" }}>{dia}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold font-label mt-0.5" style={{ color: "rgba(141,145,155,0.7)" }}>{mes}</p>
              <p className="text-[9px] font-label mt-1" style={{ color: esHoy ? "#9cffc2" : "rgba(141,145,155,0.45)" }}>{countdown(n)}</p>
            </div>
            {/* Eventos */}
            <div className="flex-1 space-y-2 min-w-0">
              {evs.map((e) => (
                <div key={e.id} className="cal-row rounded-xl p-3" style={{ background: `rgba(${TIPO[e.tipo].rgb},0.07)`, border: `1px solid rgba(${TIPO[e.tipo].rgb},0.2)`, borderLeft: `3px solid rgb(${TIPO[e.tipo].rgb})` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px]">{TIPO[e.tipo].emoji}</span>
                    <p className="font-headline font-bold text-[13px] flex-1 min-w-0 truncate" style={{ color: "#eaf0ff" }}>{e.titulo}</p>
                    <span className="text-[10px] font-bold font-label px-2 py-0.5 rounded-md shrink-0" style={{ color: TIPO[e.tipo].text, background: `rgba(${TIPO[e.tipo].rgb},0.14)` }}>{TIPO[e.tipo].label}</span>
                  </div>
                  <p className="text-[11px] mt-1 pl-[23px]" style={{ color: "rgba(195,198,209,0.6)" }}>{rangoEvento(e)}</p>
                  {e.descripcion && <p className="text-[11px] mt-1 pl-[23px] line-clamp-2" style={{ color: "rgba(141,145,155,0.7)" }}>{e.descripcion}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Panel derecho
// ───────────────────────────────────────────────────────────────────────────

function ProximoPanel({ evento }: { evento: EventoCalendarioOut | null }) {
  if (!evento) {
    return (
      <section className="rounded-2xl p-5" style={{ background: "rgba(34,42,61,0.4)", border: "1px solid rgba(141,145,155,0.12)" }}>
        <EmptyState texto="No hay próximos eventos importantes." />
      </section>
    );
  }
  const cfg = TIPO[evento.tipo];
  const n = diffDias(toISODate(new Date(evento.fecha_inicio)));
  return (
    <section
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: `linear-gradient(150deg, rgba(${cfg.rgb},0.14), rgba(${cfg.rgb},0.04)), rgba(14,22,38,0.6)`, border: `1px solid rgba(${cfg.rgb},0.3)` }}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold font-label mb-3" style={{ color: cfg.text }}>
        Próximo evento importante
      </p>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[18px]">{cfg.emoji}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider font-label px-2 py-0.5 rounded-full" style={{ color: cfg.text, background: `rgba(${cfg.rgb},0.16)` }}>{cfg.label}</span>
      </div>
      <h3 className="text-xl font-black font-headline leading-tight" style={{ color: "#eaf0ff" }}>{evento.titulo}</h3>
      <p className="text-sm mt-1.5" style={{ color: "rgba(195,198,209,0.7)" }}>{rangoEvento(evento)}</p>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-[34px] font-black font-headline leading-none" style={{ color: cfg.text }}>
          {n <= 0 ? (n === 0 ? "Hoy" : "—") : n}
        </span>
        {n > 0 && <span className="text-sm font-label" style={{ color: "rgba(195,198,209,0.7)" }}>{n === 1 ? "día" : "días"}</span>}
      </div>

      {evento.fuente_url && (
        <a href={evento.fuente_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold font-label hover:opacity-80 transition-opacity" style={{ color: cfg.text }}>
          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
          Ver fuente
        </a>
      )}
    </section>
  );
}

function DiaPanel({ fechaISO, eventos, onCerrar }: { fechaISO: string; eventos: EventoCalendarioOut[]; onCerrar: () => void }) {
  return (
    <section className="rounded-2xl p-5" style={{ background: "rgba(173,198,255,0.06)", border: "1px solid rgba(173,198,255,0.25)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary font-label">{fechaLarga(fechaISO)}</p>
        <button onClick={onCerrar} aria-label="Cerrar" className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
      <div className="space-y-2">
        {eventos.map((e) => (
          <div key={e.id} className="rounded-xl p-3" style={{ background: `rgba(${TIPO[e.tipo].rgb},0.08)`, borderLeft: `3px solid rgb(${TIPO[e.tipo].rgb})` }}>
            <div className="flex items-center gap-2">
              <span className="text-[14px]">{TIPO[e.tipo].emoji}</span>
              <p className="font-headline font-bold text-[13px] flex-1 min-w-0" style={{ color: "#eaf0ff" }}>{e.titulo}</p>
            </div>
            {e.descripcion && <p className="text-[11px] mt-1.5" style={{ color: "rgba(141,145,155,0.75)" }}>{e.descripcion}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelinePanel({ eventos }: { eventos: EventoCalendarioOut[] }) {
  return (
    <section className="rounded-2xl p-5" style={{ background: "rgba(34,42,61,0.4)", border: "1px solid rgba(141,145,155,0.12)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-outline font-label">Agenda</h2>
        <span className="material-symbols-outlined text-[18px] text-outline/60">timeline</span>
      </div>
      {eventos.length === 0 ? (
        <EmptyState texto="Sin eventos próximos." />
      ) : (
        <div className="relative pl-5">
          {/* línea vertical */}
          <span className="absolute left-[5px] top-1 bottom-1 w-px" style={{ background: "rgba(141,145,155,0.18)" }} />
          <ul className="space-y-3.5">
            {eventos.map((e) => {
              const cfg = TIPO[e.tipo];
              const { dia, mes } = diaMes(e.fecha_inicio);
              const n = diffDias(toISODate(new Date(e.fecha_inicio)));
              return (
                <li key={e.id} className="relative">
                  <span className="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full border-2" style={{ background: `rgb(${cfg.rgb})`, borderColor: "#0e1626", boxShadow: `0 0 8px rgba(${cfg.rgb},0.5)` }} />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold font-label tabular-nums" style={{ color: "rgba(141,145,155,0.85)" }}>{dia} {mes}</span>
                    <span className="text-[9px] font-label" style={{ color: "rgba(141,145,155,0.5)" }}>· {countdown(n)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[13px]">{cfg.emoji}</span>
                    <p className="text-[12px] font-semibold leading-snug" style={{ color: "#dae2fd" }}>{e.titulo}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Auxiliares
// ───────────────────────────────────────────────────────────────────────────

function NavBtn({ icon, onClick, label }: { icon: string; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="cal-card w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface" style={{ background: "rgba(34,42,61,0.6)", border: "1px solid rgba(141,145,155,0.18)" }}>
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="material-symbols-outlined text-[28px] text-outline/20">event_busy</span>
      <p className="text-xs text-outline/50">{texto}</p>
    </div>
  );
}

function rangoSemanaLabel(ancla: Date): string {
  const ini = inicioSemana(ancla);
  const fin = sumarDias(ini, 6);
  const f = (d: Date) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  return capitalizar(`${f(ini)} – ${f(fin)}`);
}
