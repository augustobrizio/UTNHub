"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seleccionarCursada, deseleccionarCursada } from "@/lib/api";
import type { ComisionCursadaOut, HorarioOut, MateriaCursableOut } from "@/lib/types";

const USUARIO_ID = 1;

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
const DIA_LABEL: Record<string, string> = {
  Lunes: "Lunes", Martes: "Martes", Miercoles: "Miérc.",
  Jueves: "Jueves", Viernes: "Viernes", Sabado: "Sáb.",
};
const DIA_NORM: Record<string, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miercoles", "miércoles": "Miercoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sabado", "sábado": "Sabado",
};
const normDia = (d: string) => DIA_NORM[d.toLowerCase()] ?? d;

// Módulos de UTN FRRO (compartimentos fijos extraídos del Excel)
const UTN_MODULOS = [
  "07:15", "08:45", "09:45", "10:30",
  "11:20", "12:50", "13:35", "15:00",
  "16:05", "17:40", "18:35", "20:00",
  "21:05", "22:35",
];

const DAY_FLOOR = 7;   // antes de las 7 = madrugada → se suma 24 para ordenar clases nocturnas
const LABEL_W = 54;

function parseHF(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h)) return null;
  let v = h + (m ?? 0) / 60;
  if (v < DAY_FLOOR) v += 24;
  return v;
}
const moduloH = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
};

interface Color { rgb: string; text: string; }
const PALETTE: Color[] = [
  { rgb: "173,198,255", text: "#c9d9ff" },
  { rgb: "125,255,162", text: "#a6ffc3" },
  { rgb: "255,185,80",  text: "#ffd093" },
  { rgb: "255,130,130", text: "#ffb0b0" },
  { rgb: "195,173,247", text: "#d6c8fb" },
  { rgb: "90,220,220",  text: "#9fe9e9" },
  { rgb: "255,210,90",  text: "#ffe0a3" },
];

// ---------------------------------------------------------------------------
interface Props { materias1: MateriaCursableOut[]; materias2: MateriaCursableOut[]; }

export function HorariosBuilder({ materias1, materias2 }: Props) {
  const [cuatrimestre, setCuatrimestre] = useState(0);
  const [anioFiltro, setAnioFiltro] = useState<number | "E">(() => {
    const first = materias1;
    for (let i = 1; i <= 5; i++) if (first.some(m => m.anio_carrera === i)) return i;
    return "E";
  });
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  const [loadingCodigo, setLoadingCodigo] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const materias = cuatrimestre === 0 ? materias1 : materias2;

  // Dos mapas de selección independientes, uno por cuatrimestre
  const [selecciones, setSelecciones] = useState<[Map<string, number>, Map<string, number>]>(() => {
    const mk = (mats: MateriaCursableOut[]) => {
      const m = new Map<string, number>();
      for (const mat of mats) if (mat.cursada_seleccionada_id != null) m.set(mat.materia_codigo, mat.cursada_seleccionada_id);
      return m;
    };
    return [mk(materias1), mk(materias2)];
  });
  const seleccion = selecciones[cuatrimestre];
  const setSeleccion = (fn: (p: Map<string, number>) => Map<string, number>) =>
    setSelecciones(([s1, s2]) => cuatrimestre === 0 ? [fn(s1), s2] : [s1, fn(s2)]);

  // Color estable por materia (asignado una vez sobre la unión de ambas listas)
  const colorMap = useMemo(() => {
    const map = new Map<string, Color>();
    let i = 0;
    for (const mat of [...materias1, ...materias2]) {
      if (!map.has(mat.materia_codigo)) { map.set(mat.materia_codigo, PALETTE[i % PALETTE.length]); i++; }
    }
    return map;
  }, [materias1, materias2]);

  const years = [1, 2, 3, 4, 5].filter(y => materias.some(m => m.anio_carrera === y));
  const tieneElectivas = materias.some(m => m.anio_carrera === null);

  function switchCuatrimestre(idx: number) {
    setCuatrimestre(idx);
    setSelectedCodigo(null);
    const mats = idx === 0 ? materias1 : materias2;
    for (let i = 1; i <= 5; i++) { if (mats.some(m => m.anio_carrera === i)) { setAnioFiltro(i); return; } }
    setAnioFiltro("E");
  }

  const materiasFiltradas = useMemo(
    () => materias.filter(m => anioFiltro === "E" ? m.anio_carrera === null : m.anio_carrera === anioFiltro),
    [materias, anioFiltro],
  );

  const seleccionActiva = useMemo(() => {
    const res: Array<{ codigo: string; nombre: string; comision_nombre: string | null; horarios: HorarioOut[] }> = [];
    for (const [codigo, cursadaId] of seleccion.entries()) {
      const mat = materias.find(m => m.materia_codigo === codigo);
      if (!mat) continue;
      const c = mat.comisiones.find(c => c.cursada_id === cursadaId);
      if (!c) continue;
      res.push({ codigo, nombre: mat.materia_nombre, comision_nombre: c.comision_nombre, horarios: c.horarios });
    }
    return res;
  }, [seleccion, materias]);

  function conflicta(cursada: ComisionCursadaOut, materia_codigo: string): boolean {
    for (const h of cursada.horarios) {
      const hS = parseHF(h.hora_inicio), hE = parseHF(h.hora_fin);
      if (hS == null || hE == null || !h.dia) continue;
      const dia = normDia(h.dia);
      for (const sel of seleccionActiva) {
        if (sel.codigo === materia_codigo) continue;
        for (const sh of sel.horarios) {
          if (!sh.dia || normDia(sh.dia) !== dia) continue;
          const sS = parseHF(sh.hora_inicio), sE = parseHF(sh.hora_fin);
          if (sS == null || sE == null) continue;
          if (hS < sE && hE > sS) return true;
        }
      }
    }
    return false;
  }

  async function handleSelect(materia_codigo: string, cursada_id: number) {
    const current = seleccion.get(materia_codigo);
    setLoadingCodigo(materia_codigo);
    try {
      if (current === cursada_id) {
        await deseleccionarCursada(USUARIO_ID, materia_codigo);
        setSeleccion(p => { const n = new Map(p); n.delete(materia_codigo); return n; });
      } else {
        await seleccionarCursada(USUARIO_ID, materia_codigo, cursada_id);
        setSeleccion(p => new Map(p).set(materia_codigo, cursada_id));
      }
    } catch (e) { console.error(e); }
    finally {
      setLoadingCodigo(null);
      startTransition(() => router.refresh());
    }
  }

  const selectedMateria = materias.find(m => m.materia_codigo === selectedCodigo);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>

      {/* ── Header ── */}
      <div
        className="flex items-center gap-4 px-5 shrink-0"
        style={{ height: "52px", borderBottom: "1px solid rgba(141,145,155,0.09)" }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-black font-headline text-on-surface tracking-tight leading-none">
            Armador de Horarios
          </h1>
          <p className="text-[11px] text-outline mt-0.5">
            {materias.length} cursables · {seleccion.size} seleccionada{seleccion.size !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Cuatrimestre — switch instantáneo, sin navegación de página */}
        <div
          className="flex gap-0.5 p-0.5 rounded-xl shrink-0"
          style={{ backgroundColor: "rgba(11,19,38,0.8)" }}
        >
          {["1° Cuatrimestre", "2° Cuatrimestre"].map((label, i) => (
            <button
              key={i}
              onClick={() => switchCuatrimestre(i)}
              className="px-4 py-1.5 rounded-[10px] text-xs font-semibold font-label transition-all"
              style={{
                color: cuatrimestre === i ? "#adc6ff" : "rgba(141,145,155,0.7)",
                backgroundColor: cuatrimestre === i ? "rgba(173,198,255,0.12)" : "transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Panel izquierdo: filtro de año + lista de materias ── */}
        <div
          className="shrink-0 flex flex-col"
          style={{ width: "216px", borderRight: "1px solid rgba(141,145,155,0.08)" }}
        >
          {/* Year tabs */}
          <div className="flex flex-wrap gap-1 px-3 pt-3 pb-2 shrink-0">
            {years.map(y => (
              <button
                key={y}
                onClick={() => { setAnioFiltro(y); setSelectedCodigo(null); }}
                className="px-2.5 py-[5px] rounded-lg text-[11px] font-bold font-label transition-colors"
                style={{
                  color: anioFiltro === y ? "#adc6ff" : "rgba(141,145,155,0.55)",
                  backgroundColor: anioFiltro === y ? "rgba(173,198,255,0.1)" : "transparent",
                }}
              >
                {y}° Año
              </button>
            ))}
            {tieneElectivas && (
              <button
                onClick={() => { setAnioFiltro("E"); setSelectedCodigo(null); }}
                className="px-2.5 py-[5px] rounded-lg text-[11px] font-bold font-label transition-colors"
                style={{
                  color: anioFiltro === "E" ? "#ffb950" : "rgba(141,145,155,0.55)",
                  backgroundColor: anioFiltro === "E" ? "rgba(255,185,80,0.1)" : "transparent",
                }}
              >
                Electivas
              </button>
            )}
          </div>

          {/* Divisor */}
          <div style={{ height: "1px", backgroundColor: "rgba(141,145,155,0.07)", marginLeft: "12px", marginRight: "12px" }} />

          {/* Materia list */}
          <div className="flex-1 overflow-y-auto py-1.5">
            {materiasFiltradas.length === 0 ? (
              <p className="text-xs text-outline/40 text-center px-4 py-10 leading-relaxed">
                Sin materias cursables para este año.
              </p>
            ) : (
              materiasFiltradas.map(mat => {
                const isSel = seleccion.has(mat.materia_codigo);
                const isActive = selectedCodigo === mat.materia_codigo;
                const color = colorMap.get(mat.materia_codigo);
                return (
                  <button
                    key={mat.materia_codigo}
                    onClick={() => setSelectedCodigo(mat.materia_codigo)}
                    style={{ display: "flex", width: "100%", textAlign: "left", position: "relative" }}
                    className="items-center gap-2 px-3 py-[7px] transition-colors"
                  >
                    {/* Active bar */}
                    {isActive && (
                      <span style={{
                        position: "absolute", left: 0, top: "6px", bottom: "6px",
                        width: "2px", borderRadius: "0 2px 2px 0",
                        backgroundColor: color?.text ?? "#adc6ff",
                      }} />
                    )}
                    {/* Hover/active bg */}
                    <span style={{
                      position: "absolute", inset: 0,
                      backgroundColor: isActive
                        ? `rgba(${color?.rgb ?? "173,198,255"},0.08)`
                        : undefined,
                      borderRadius: "0 8px 8px 0",
                    }} />

                    {/* Dot */}
                    <span style={{
                      display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0, position: "relative",
                      backgroundColor: isSel ? (color?.text ?? "#adc6ff") : isActive ? "rgba(141,145,155,0.5)" : "rgba(67,71,80,0.6)",
                    }} />

                    <span style={{
                      position: "relative", fontSize: "11px", lineHeight: "1.45", flex: 1,
                      color: isActive ? "#dae2fd" : isSel ? "rgba(218,226,253,0.75)" : "rgba(141,145,155,0.7)",
                    }}>
                      {mat.materia_nombre}
                    </span>

                    {isSel && (
                      <span
                        className="material-symbols-outlined"
                        style={{ position: "relative", fontSize: "12px", color: color?.text, fontVariationSettings: "'FILL' 1", flexShrink: 0 }}
                      >
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Panel derecho: picker + grilla ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Comision picker */}
          <div
            className="shrink-0 overflow-y-auto"
            style={{
              maxHeight: selectedMateria ? "210px" : "0px",
              transition: "max-height 0.2s ease",
              borderBottom: selectedMateria ? "1px solid rgba(141,145,155,0.08)" : "none",
              backgroundColor: "rgba(17,25,46,0.5)",
            }}
          >
            {selectedMateria && (
              <div className="px-5 pt-3.5 pb-3.5">
                <div className="flex items-center gap-2.5 mb-3">
                  <span style={{
                    display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                    backgroundColor: colorMap.get(selectedMateria.materia_codigo)?.text ?? "#adc6ff",
                  }} />
                  <span className="text-sm font-bold text-on-surface font-headline flex-1 truncate">
                    {selectedMateria.materia_nombre}
                  </span>
                  <span className="text-[11px] text-outline shrink-0">
                    {selectedMateria.comisiones.length} comisión{selectedMateria.comisiones.length !== 1 ? "es" : ""}
                  </span>
                  {seleccion.has(selectedMateria.materia_codigo) && (
                    <button
                      onClick={() => handleSelect(selectedMateria.materia_codigo, seleccion.get(selectedMateria.materia_codigo)!)}
                      disabled={loadingCodigo === selectedMateria.materia_codigo}
                      style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "rgba(141,145,155,0.6)", flexShrink: 0 }}
                      className="hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>close</span>
                      Quitar
                    </button>
                  )}
                </div>

                {selectedMateria.comisiones.length === 0 ? (
                  <p className="text-xs text-outline/40">Sin comisiones disponibles para este cuatrimestre.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedMateria.comisiones.map(c => {
                      const isSel = seleccion.get(selectedMateria.materia_codigo) === c.cursada_id;
                      const conflict = !isSel && conflicta(c, selectedMateria.materia_codigo);
                      const loading = loadingCodigo === selectedMateria.materia_codigo;
                      const resumen = c.horarios.slice(0, 3)
                        .map(h => `${normDia(h.dia ?? "").slice(0, 3)} ${h.hora_inicio?.slice(0, 5) ?? ""}`)
                        .join(" · ");

                      return (
                        <button
                          key={c.cursada_id}
                          onClick={() => !loading && !conflict && handleSelect(selectedMateria.materia_codigo, c.cursada_id)}
                          disabled={loading || conflict}
                          title={[c.docente ? `Prof: ${c.docente}` : null, resumen].filter(Boolean).join("\n") || undefined}
                          className="flex flex-col transition-all"
                          style={{
                            padding: "8px 12px",
                            borderRadius: "12px",
                            border: `1px solid ${isSel ? "rgba(125,255,162,0.35)" : conflict ? "rgba(141,145,155,0.1)" : "rgba(141,145,155,0.18)"}`,
                            backgroundColor: isSel
                              ? "rgba(125,255,162,0.09)"
                              : conflict ? "rgba(11,19,38,0.5)" : "rgba(34,42,61,0.6)",
                            color: isSel ? "#7dffa2" : conflict ? "rgba(141,145,155,0.28)" : "#dae2fd",
                            boxShadow: isSel ? "0 0 14px rgba(125,255,162,0.08)" : undefined,
                            cursor: conflict ? "not-allowed" : "pointer",
                          }}
                        >
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>
                            {c.comision_nombre ?? `#${c.comision_id}`}
                          </span>
                          <span style={{
                            fontSize: "10px", marginTop: "3px", fontWeight: 400,
                            color: isSel ? "rgba(125,255,162,0.5)" : conflict ? "rgba(141,145,155,0.2)" : "rgba(141,145,155,0.55)",
                          }}>
                            {resumen || "Sin horario"}
                          </span>
                          {conflict && (
                            <span style={{ fontSize: "9px", color: "rgba(255,100,100,0.45)", marginTop: "2px" }}>
                              superposición
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grilla semanal — siempre visible, llena el espacio restante */}
          <div className="flex-1 min-h-0" style={{ overflowX: "auto", overflowY: "hidden" }}>
            <ScheduleGrid seleccionados={seleccionActiva} colorMap={colorMap} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScheduleGrid — siempre muestra Lun-Vie con módulos UTN en el costado
// ---------------------------------------------------------------------------

type SelItem = { codigo: string; nombre: string; comision_nombre: string | null; horarios: HorarioOut[] };

function ScheduleGrid({
  seleccionados,
  colorMap,
}: {
  seleccionados: SelItem[];
  colorMap: Map<string, Color>;
}) {
  const tieneSab = seleccionados.some(s => s.horarios.some(h => h.dia && normDia(h.dia) === "Sabado"));
  const dias = tieneSab ? [...DIAS, "Sabado"] : DIAS;

  // Ventana vertical DINÁMICA: se ajusta al rango real de las clases elegidas.
  // Esto elimina el espacio muerto — la grilla siempre se ve "llena".
  let minStart = Infinity, maxEnd = -Infinity;
  for (const sel of seleccionados) {
    for (const h of sel.horarios) {
      const s = parseHF(h.hora_inicio), e = parseHF(h.hora_fin);
      if (s != null) minStart = Math.min(minStart, s);
      if (e != null) maxEnd = Math.max(maxEnd, e);
    }
  }
  const vacio = !isFinite(minStart) || !isFinite(maxEnd) || minStart >= maxEnd;
  // Vista por defecto (sin selección): turno mañana 07:15–13:00
  let startH = vacio ? 7.0 : minStart - 0.4;
  let endH = vacio ? 13.5 : maxEnd + 0.4;
  startH = Math.max(6.75, startH);
  endH = Math.min(24.2, endH);
  if (endH - startH < 5) endH = Math.min(24.2, startH + 5); // alto mínimo razonable
  const span = endH - startH;

  const pct = (v: number) => ((v - startH) / span) * 100;
  const toPct = (t: string | null) => {
    const v = parseHF(t);
    return v === null ? null : pct(v);
  };

  // Sólo los módulos dentro de la ventana visible
  const modulosVis = UTN_MODULOS.filter(t => {
    const v = moduloH(t);
    return v >= startH - 0.05 && v <= endH + 0.05;
  });

  // Turnos para el tinte de fondo, recortados a la ventana
  const turnos = [
    { from: 7.25, to: 13.0, rgb: "173,198,255" },
    { from: 13.0, to: 18.4, rgb: "255,185,80" },
    { from: 18.4, to: 24.2, rgb: "125,255,162" },
  ];

  return (
    <div
      style={{
        height: "100%",
        minWidth: `${LABEL_W + dias.length * 96}px`,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Encabezado de días */}
      <div
        className="flex shrink-0"
        style={{ paddingLeft: `${LABEL_W}px`, borderBottom: "1px solid rgba(141,145,155,0.08)" }}
      >
        {dias.map(dia => (
          <div
            key={dia}
            className="text-center font-bold font-label uppercase tracking-wider"
            style={{ flex: 1, fontSize: "10px", color: "rgba(141,145,155,0.55)", padding: "11px 0" }}
          >
            {DIA_LABEL[dia] ?? dia.slice(0, 3).toUpperCase()}
          </div>
        ))}
      </div>

      {/* Cuerpo — llena el alto restante */}
      <div className="flex flex-1" style={{ minHeight: 0 }}>

        {/* Columna de etiquetas de módulo */}
        <div className="shrink-0" style={{ width: `${LABEL_W}px`, position: "relative" }}>
          {modulosVis.map(t => (
            <div
              key={t}
              style={{
                position: "absolute",
                top: `${pct(moduloH(t))}%`,
                right: "8px",
                transform: "translateY(-50%)",
                fontSize: "9px",
                color: "rgba(141,145,155,0.4)",
                fontFamily: "var(--font-inter), ui-sans-serif",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </div>
          ))}
        </div>

        {/* Área de columnas */}
        <div className="relative flex" style={{ flex: 1 }}>
          {/* Tintes de turno */}
          {turnos.map(({ from, to, rgb }) => {
            const top = Math.max(0, pct(from));
            const bot = Math.min(100, pct(to));
            if (bot <= 0 || top >= 100 || bot <= top) return null;
            return (
              <div
                key={rgb}
                style={{
                  position: "absolute", left: 0, right: 0,
                  top: `${top}%`, height: `${bot - top}%`,
                  background: `rgba(${rgb},0.022)`,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {/* Líneas horizontales en los módulos */}
          {modulosVis.map(t => (
            <div
              key={t}
              style={{
                position: "absolute", left: 0, right: 0,
                top: `${pct(moduloH(t))}%`,
                borderTop: "1px solid rgba(141,145,155,0.06)",
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Una columna flexible por día */}
          {dias.map(dia => (
            <div
              key={dia}
              className="relative"
              style={{ flex: 1, borderRight: "1px solid rgba(141,145,155,0.045)" }}
            >
              {seleccionados.map(sel => {
                const color = colorMap.get(sel.codigo) ?? PALETTE[0];
                return sel.horarios
                  .filter(h => h.dia && normDia(h.dia) === dia)
                  .map((h, idx) => {
                    const top = toPct(h.hora_inicio);
                    const bot = toPct(h.hora_fin);
                    if (top === null || bot === null) return null;
                    const height = Math.max(bot - top, 2.2);
                    const compact = height < 7; // bloque chico → menos info

                    return (
                      <div
                        key={`${sel.codigo}-${idx}`}
                        title={`${sel.nombre} · ${sel.comision_nombre ?? ""}\n${h.hora_inicio?.slice(0, 5) ?? ""}–${h.hora_fin?.slice(0, 5) ?? ""}${h.aula ? ` · ${h.aula}` : ""}`}
                        style={{
                          position: "absolute",
                          top: `${top}%`,
                          height: `${height}%`,
                          left: "5px", right: "5px",
                          borderRadius: "10px",
                          overflow: "hidden",
                          background: `linear-gradient(160deg, rgba(${color.rgb},0.22), rgba(${color.rgb},0.10))`,
                          borderLeft: `3px solid rgb(${color.rgb})`,
                          boxShadow: `0 2px 12px rgba(${color.rgb},0.10), inset 0 0 0 1px rgba(${color.rgb},0.18)`,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: compact ? "center" : "flex-start",
                          padding: compact ? "0 8px" : "7px 9px",
                        }}
                      >
                        <p style={{
                          fontSize: "11px", fontWeight: 700, lineHeight: 1.25,
                          color: color.text,
                          overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: compact ? "nowrap" : "normal",
                          display: "-webkit-box",
                          WebkitLineClamp: compact ? 1 : 2,
                          WebkitBoxOrient: "vertical",
                        }}>
                          {sel.nombre}
                        </p>
                        {!compact && (
                          <p style={{
                            fontSize: "10px", lineHeight: 1.3, marginTop: "auto", paddingTop: "4px",
                            color: "rgba(218,226,253,0.5)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {h.hora_inicio?.slice(0, 5) ?? ""}–{h.hora_fin?.slice(0, 5) ?? ""}
                            {sel.comision_nombre ? ` · ${sel.comision_nombre}` : ""}
                          </p>
                        )}
                      </div>
                    );
                  });
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {seleccionados.length === 0 && (
        <div
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "10px", pointerEvents: "none",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "40px", color: "rgba(141,145,155,0.14)", fontVariationSettings: "'FILL' 0" }}
          >
            calendar_view_week
          </span>
          <p style={{ fontSize: "12px", color: "rgba(141,145,155,0.3)" }}>
            Elegí una materia y sus comisiones para armar tu cursada
          </p>
        </div>
      )}
    </div>
  );
}
