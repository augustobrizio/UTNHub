"use client";

/**
 * Menu de acciones de mantenimiento: dispara las 3 sincronizaciones de datos
 * de profesores desde fuentes externas. Presentado como accion secundaria.
 *
 * Cada sync consulta un sitio/planilla externa: puede demorar o fallar (502).
 * La UI muestra loading, y al terminar un resumen o un error legible. Tras un
 * exito refresca el Server Component del listado (router.refresh) para que los
 * contadores reflejen los cambios.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  sincronizarCatedrasUtntac,
  sincronizarHorariosProfesores,
  sincronizarMailsProfesores,
} from "@/lib/api";

type AccionKey = "horarios" | "mails" | "catedras";

interface Resumen {
  titulo: string;
  contadores: { label: string; valor: number }[];
  advertencias: string[];
  errores: string[];
  noMapeadas?: string[];
}

const ACCIONES: {
  key: AccionKey;
  label: string;
  descripcion: string;
  icono: string;
  run: () => Promise<Resumen>;
}[] = [
  {
    key: "horarios",
    label: "Horarios de consulta",
    descripcion: "Sitio del Dpto. ISI",
    icono: "schedule",
    run: async () => {
      const r = await sincronizarHorariosProfesores();
      return {
        titulo: "Horarios de consulta",
        contadores: [
          { label: "Profesores tocados", valor: r.profesores_tocados },
          { label: "Horarios creados", valor: r.horarios_creados },
          { label: "Horarios borrados", valor: r.horarios_borrados },
          { label: "Cátedras creadas", valor: r.materia_profesor_creados },
        ],
        advertencias: r.advertencias,
        errores: r.errores,
      };
    },
  },
  {
    key: "mails",
    label: "Mails de docentes",
    descripcion: "Planilla UTNTAC",
    icono: "mail",
    run: async () => {
      const r = await sincronizarMailsProfesores();
      return {
        titulo: "Mails de docentes",
        contadores: [
          { label: "Filas procesadas", valor: r.filas_procesadas },
          { label: "Emails seteados", valor: r.emails_seteados },
          { label: "Ya tenían email", valor: r.emails_ya_existentes },
          { label: "Profesores creados", valor: r.profesores_creados },
        ],
        advertencias: r.advertencias,
        errores: r.errores,
      };
    },
  },
  {
    key: "catedras",
    label: "Cátedras",
    descripcion: "Planilla UTNTAC",
    icono: "groups",
    run: async () => {
      const r = await sincronizarCatedrasUtntac();
      return {
        titulo: "Cátedras",
        contadores: [
          { label: "Filas procesadas", valor: r.filas_procesadas },
          { label: "Profesores creados", valor: r.profesores_creados },
          { label: "Cátedras creadas", valor: r.materia_profesor_creados },
          { label: "Ya existentes", valor: r.materia_profesor_ya_existentes },
        ],
        advertencias: [],
        errores: r.errores,
        noMapeadas: r.asignaturas_no_mapeadas,
      };
    },
  },
];

function mensajeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 502) return "La fuente externa no respondió (502). Probá de nuevo en un rato.";
    if (err.status === 422) return "La página cambió de formato y el scraper no encontró datos (422).";
    return `El backend devolvió ${err.status}.`;
  }
  if (err instanceof Error) return err.message;
  return "Error desconocido al sincronizar.";
}

export function SincronizarMenu() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [corriendo, setCorriendo] = useState<AccionKey | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async (accion: (typeof ACCIONES)[number]) => {
    if (corriendo) return; // evita disparos duplicados mientras corre
    setCorriendo(accion.key);
    setResumen(null);
    setError(null);
    try {
      const r = await accion.run();
      setResumen(r);
      router.refresh(); // revalida el listado → actualiza contadores
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCorriendo(null);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 hover:border-outline-variant/40 px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-all duration-200"
        title="Acciones de mantenimiento: sincronizar datos desde fuentes externas"
        aria-expanded={abierto}
      >
        <span
          className={`material-symbols-outlined text-[18px] ${corriendo ? "animate-spin" : ""}`}
        >
          sync
        </span>
        Sincronizar
        <span className="material-symbols-outlined text-[18px] text-outline">
          {abierto ? "expand_less" : "expand_more"}
        </span>
      </button>

      {abierto && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl bg-surface-container-high border border-outline-variant/20 shadow-2xl p-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-outline px-2.5 pt-1.5 pb-2 font-label">
            Mantenimiento · fuentes externas
          </p>

          <div className="space-y-0.5">
            {ACCIONES.map((accion) => {
              const esta = corriendo === accion.key;
              return (
                <button
                  key={accion.key}
                  type="button"
                  onClick={() => ejecutar(accion)}
                  disabled={corriendo !== null}
                  className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface-container-highest disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
                    {accion.icono}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-on-surface truncate">
                      {accion.label}
                    </span>
                    <span className="block text-[11px] text-outline truncate">
                      {accion.descripcion}
                    </span>
                  </span>
                  {esta && (
                    <span className="material-symbols-outlined text-[18px] text-primary animate-spin shrink-0">
                      progress_activity
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {(resumen || error) && (
            <div className="mt-2 border-t border-outline-variant/15 pt-2 px-1">
              {error ? (
                <div className="rounded-xl bg-error/10 border border-error/20 p-3">
                  <p className="text-xs font-semibold text-error flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    No se pudo sincronizar
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">{error}</p>
                </div>
              ) : resumen ? (
                <ResumenPanel resumen={resumen} />
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResumenPanel({ resumen }: { resumen: Resumen }) {
  return (
    <div className="rounded-xl bg-surface-container-highest/60 p-3">
      <p className="text-xs font-headline font-bold text-secondary flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined text-[16px]">check_circle</span>
        {resumen.titulo} · listo
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {resumen.contadores.map((c) => (
          <div key={c.label} className="rounded-lg bg-surface-container-low px-2.5 py-1.5">
            <p className="text-sm font-bold text-on-surface leading-none">{c.valor}</p>
            <p className="text-[10px] text-outline mt-1 leading-tight">{c.label}</p>
          </div>
        ))}
      </div>

      {resumen.noMapeadas && resumen.noMapeadas.length > 0 && (
        <ListaColapsable
          titulo={`${resumen.noMapeadas.length} asignaturas no mapeadas`}
          items={resumen.noMapeadas}
          tono="text-tertiary"
        />
      )}
      {resumen.advertencias.length > 0 && (
        <ListaColapsable
          titulo={`${resumen.advertencias.length} advertencias`}
          items={resumen.advertencias}
          tono="text-tertiary"
        />
      )}
      {resumen.errores.length > 0 && (
        <ListaColapsable
          titulo={`${resumen.errores.length} errores`}
          items={resumen.errores}
          tono="text-error"
        />
      )}
    </div>
  );
}

function ListaColapsable({
  titulo,
  items,
  tono,
}: {
  titulo: string;
  items: string[];
  tono: string;
}) {
  return (
    <details className="mt-2">
      <summary className={`text-[11px] font-semibold cursor-pointer ${tono}`}>{titulo}</summary>
      <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
        {items.map((it, i) => (
          <li key={i} className="text-[11px] text-on-surface-variant leading-snug">
            · {it}
          </li>
        ))}
      </ul>
    </details>
  );
}
