import { ApiError, getGrafo } from "@/lib/api";
import type { ContadoresGrafo, GrafoResponse } from "@/lib/types";

import { ProgresoHero } from "@/components/dashboard/ProgresoHero";
import { AgendaHoy, type AgendaItem } from "@/components/dashboard/AgendaHoy";
import { ChatSnippet } from "@/components/dashboard/ChatSnippet";
import { AccionesRapidas } from "@/components/dashboard/AccionesRapidas";
import {
  NovedadesAlertas,
  type NovedadAlerta,
} from "@/components/dashboard/NovedadesAlertas";
import { AtajosToolbox } from "@/components/dashboard/AtajosToolbox";

// Hardcoded mientras no hay auth — alineado con lo que ya hace materias/page.tsx.
// Cuando exista AuthProvider real, esto pasa a venir de la sesion.
const USUARIO_ID = 1;
const NOMBRE = "Julian";
const CARRERA = "Ingenieria en Sistemas - 3er Anio";

// Fallback de contadores si el backend no responde. Mantiene la UI usable
// y evita arrastrar un null por todo el render.
const CONTADORES_VACIOS: ContadoresGrafo = {
  aprobadas: 0,
  regulares: 0,
  cursando: 0,
  cursables: 0,
  libres: 0,
  total: 0,
  porcentaje_aprobadas: 0,
  carga_horaria_cursando: 0,
  creditos_electivas: 0,
  meta_creditos_electivas: 0,
};

// ---------------------------------------------------------------------------
// Mocks — se reemplazan por endpoints cuando esten implementados.
// La forma del dato ya respeta el contrato que va a exponer el BE.
// ---------------------------------------------------------------------------

const AGENDA_MOCK: AgendaItem[] = [
  {
    id: "ds-teorica",
    titulo: "Diseno de Sistemas (teoria)",
    detalle: "Aula M-12 - Prof. Brignole",
    hora: "14:00",
    duracionMin: 90,
    icono: "schema",
  },
  {
    id: "bd2-lab",
    titulo: "Bases de Datos II - laboratorio",
    detalle: "Lab L-3 - hibrido",
    hora: "16:30",
    duracionMin: 120,
    icono: "database",
  },
];

const NOVEDADES_MOCK: NovedadAlerta[] = [
  {
    id: "paro-adutn",
    categoria: "Paro academico",
    titulo: "Paro docente del 09/05",
    resumen:
      "ADUTN convoco a 24h de paro. Verifica el campus virtual antes de salir de tu casa: hay clases que pasan a virtual.",
    severidad: "critica",
  },
  {
    id: "insc-finales",
    categoria: "Administrativo",
    titulo: "Inscripcion a finales de mayo",
    resumen:
      "La ventana de inscripcion al turno de mayo cierra el viernes 16 a las 23:59. Recorda chequear correlativas para rendir.",
    severidad: "importante",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function obtenerGrafoSeguro(): Promise<{
  grafo: GrafoResponse | null;
  error: string | null;
}> {
  try {
    const grafo = await getGrafo({ tipo: "troncal", usuarioId: USUARIO_ID });
    return { grafo, error: null };
  } catch (err) {
    if (err instanceof ApiError) {
      return { grafo: null, error: `Backend devolvio ${err.status}.` };
    }
    if (err instanceof Error) return { grafo: null, error: err.message };
    return { grafo: null, error: "Error desconocido." };
  }
}

// ---------------------------------------------------------------------------
// Pagina principal del dashboard
// ---------------------------------------------------------------------------

export default async function DashboardHome() {
  const { grafo, error } = await obtenerGrafoSeguro();
  const contadores = grafo?.contadores ?? CONTADORES_VACIOS;
  const enCursada = contadores.cursando;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-2xl px-4 py-3 text-sm text-error font-medium">
          No pude traer tu progreso del backend ({error}). Mostrando dashboard
          en modo degradado.
        </div>
      )}

      <ProgresoHero
        nombre={NOMBRE}
        carrera={CARRERA}
        contadores={contadores}
        enCursada={enCursada}
        esMock={!grafo}
      />

      {/* Bento grid: 12 columnas, asimetrico segun DESIGN.md */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <AgendaHoy items={AGENDA_MOCK} esMock />
        </div>
        <div className="md:col-span-4">
          <ChatSnippet
            ultimaPregunta={null}
            haceTexto={null}
            conversacionId={null}
          />
        </div>
        <div className="md:col-span-4">
          <AccionesRapidas />
        </div>
        <div className="md:col-span-8">
          <NovedadesAlertas novedades={NOVEDADES_MOCK} esMock />
        </div>
        <div className="md:col-span-12">
          <AtajosToolbox />
        </div>
      </div>
    </div>
  );
}
