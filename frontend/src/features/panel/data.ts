import {
  ApiError,
  getComisionesCursables,
  getEventosHoyCalendario,
  getGrafo,
  getProximosEventosCalendario,
  listarConversaciones,
  listarNovedades,
} from "@/lib/api";
import type {
  ContadoresGrafo,
  EventoCalendarioOut,
  MateriaCursableOut,
  MateriaNodo,
  NovedadOut,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Tipos de vista del dashboard
// ---------------------------------------------------------------------------

export interface AgendaItem {
  id: string | number;
  titulo: string;
  detalle: string;
  hora: string;
  duracionMin: number;
}

/** Severidad temporal de lo que se viene: urgente (≤3d), pronto (≤7d), lejano. */
export type Urgencia = "urgente" | "pronto" | "lejano";

export interface ProximoItem {
  id: string | number;
  titulo: string;
  detalle: string;
  diasRestantes: number;
  tipoLabel: string;
  urgencia: Urgencia;
}

export interface NovedadItem {
  id: number;
  categoria: string;
  titulo: string;
  hace: string;
  esAviso: boolean;
  url: string;
}

export interface AnioProgreso {
  anio: number;
  aprobadas: number;
  total: number;
}

export interface ChatUltimo {
  titulo: string;
  hace: string;
  conversacionId: number;
}

export interface PanelData {
  contadores: ContadoresGrafo;
  porAnio: AnioProgreso[];
  agenda: AgendaItem[];
  proximos: ProximoItem[];
  novedades: NovedadItem[];
  chat: ChatUltimo | null;
  /** true si el progreso no pudo traerse del backend (modo degradado). */
  progresoMock: boolean;
}

// Fallback de contadores: mantiene la UI usable si el backend no responde.
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
  promedio_general: null,
};

// ---------------------------------------------------------------------------
// Helpers de fecha
// ---------------------------------------------------------------------------

/** Días calendario desde hoy hasta `iso` (0 = hoy, negativo = ya pasó). */
function diasHasta(iso: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(iso);
  f.setHours(0, 0, 0, 0);
  return Math.round((f.getTime() - hoy.getTime()) / 86_400_000);
}

/** "hace 2 h", "hace 3 d", "recién". Texto humano corto para timestamps. */
function haceTexto(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "recién";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs} h`;
  const dias = Math.floor(hs / 24);
  if (dias < 30) return `hace ${dias} d`;
  return `hace ${Math.floor(dias / 30)} mes`;
}

function urgenciaDe(dias: number): Urgencia {
  if (dias <= 3) return "urgente";
  if (dias <= 7) return "pronto";
  return "lejano";
}

// 2do cuatrimestre arranca ~20 de julio.
function cuatriActual(): 1 | 2 {
  const hoy = new Date();
  const m = hoy.getMonth();
  const d = hoy.getDate();
  return m > 6 || (m === 6 && d >= 20) ? 2 : 1;
}

// ---------------------------------------------------------------------------
// Progreso por año (a partir de los nodos del grafo troncal)
// ---------------------------------------------------------------------------

function progresoPorAnio(nodos: MateriaNodo[]): AnioProgreso[] {
  const acc = new Map<number, { aprobadas: number; total: number }>();
  for (const n of nodos) {
    if (n.anio_carrera == null) continue;
    const cur = acc.get(n.anio_carrera) ?? { aprobadas: 0, total: 0 };
    cur.total += 1;
    if (n.estado === "aprobado") cur.aprobadas += 1;
    acc.set(n.anio_carrera, cur);
  }
  return [...acc.entries()]
    .sort(([a], [b]) => a - b)
    .map(([anio, v]) => ({ anio, ...v }));
}

// ---------------------------------------------------------------------------
// Agenda del día (clases elegidas en Horarios + eventos del calendario)
// ---------------------------------------------------------------------------

const DIAS_JS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const normDia = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function duracionMin(ini: string | null, fin: string | null): number {
  if (!ini || !fin) return 0;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  let d = toMin(fin) - toMin(ini);
  if (d < 0) d += 24 * 60;
  return d;
}

// Tipos de evento que sí son "tu día": los que rendís o entregás. Los
// institucionales (`evento`, `feriado`) quedan afuera de la agenda.
const TIPOS_AGENDA = new Set<EventoCalendarioOut["tipo"]>([
  "examen",
  "mesa",
  "trabajo_practico",
]);

function clasesDeHoy(actual: MateriaCursableOut[], todos: MateriaCursableOut[]): AgendaItem[] {
  // Resolver la comisión elegida por materia (cruzando ambos cuatris para las anuales).
  const selCom = new Map<string, number>();
  for (const m of todos) {
    if (m.cursada_seleccionada_id == null) continue;
    for (const com of m.comisiones) {
      if (com.cursada_id === m.cursada_seleccionada_id) selCom.set(m.materia_codigo, com.comision_id);
    }
  }
  const diaHoy = normDia(DIAS_JS[new Date().getDay()]);
  const items: AgendaItem[] = [];
  for (const m of actual) {
    const cid = selCom.get(m.materia_codigo);
    if (cid == null) continue;
    const com = m.comisiones.find((c) => c.comision_id === cid);
    if (!com) continue;
    com.horarios.forEach((h, idx) => {
      if (!h.dia || normDia(h.dia) !== diaHoy) return;
      items.push({
        id: `clase-${com.cursada_id}-${idx}`,
        titulo: m.materia_nombre,
        detalle: [com.comision_nombre, h.aula].filter(Boolean).join(" · ") || "Clase",
        hora: h.hora_inicio?.slice(0, 5) ?? "",
        duracionMin: duracionMin(h.hora_inicio, h.hora_fin),
      });
    });
  }
  items.sort((a, b) => a.hora.localeCompare(b.hora));
  return items;
}

function eventoToAgenda(e: EventoCalendarioOut): AgendaItem {
  const inicio = new Date(e.fecha_inicio);
  const fin = e.fecha_fin ? new Date(e.fecha_fin) : null;
  return {
    id: e.id,
    titulo: e.titulo,
    detalle: e.descripcion ?? etiquetaTipo(e.tipo),
    hora: inicio.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    duracionMin: fin ? Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 60000)) : 0,
  };
}

function etiquetaTipo(tipo: EventoCalendarioOut["tipo"]): string {
  const etiquetas: Record<EventoCalendarioOut["tipo"], string> = {
    examen: "Parcial",
    mesa: "Mesa",
    trabajo_practico: "TP",
    feriado: "Feriado",
    evento: "Evento",
  };
  return etiquetas[tipo];
}

// ---------------------------------------------------------------------------
// Novedades
// ---------------------------------------------------------------------------

const NOVEDADES_EN_PANEL = 4;

const ETIQUETA_CATEGORIA: Record<string, string> = {
  evento: "Evento",
  aviso: "Aviso",
  noticia: "Noticia",
  general: "General",
};

function novedadToItem(n: NovedadOut): NovedadItem {
  const categoria = (typeof n.categoria === "string" ? n.categoria.trim() : "") || null;
  return {
    id: n.id,
    categoria: (categoria && ETIQUETA_CATEGORIA[categoria]) || "Novedad",
    titulo: n.titulo ?? "Novedad sin título",
    hace: haceTexto(n.fecha_publicacion ?? n.created_at ?? null),
    esAviso: categoria === "aviso",
    // Deep link interno (el mismo que usa el buscador global y la campana).
    url: `/novedades?novedad=${n.id}`,
  };
}

// ---------------------------------------------------------------------------
// Fetch principal — todo con tolerancia a fallos por fuente
// ---------------------------------------------------------------------------

export async function obtenerPanel(): Promise<PanelData> {
  const anio = new Date().getFullYear();
  const cuatri = cuatriActual();

  const [grafoR, agendaR, proximosR, novedadesR, chatR] = await Promise.allSettled([
    getGrafo({ tipo: "troncal" }),
    (async () => {
      const [hoy, c1, c2] = await Promise.all([
        getEventosHoyCalendario("ISI"),
        getComisionesCursables(anio, 1),
        getComisionesCursables(anio, 2),
      ]);
      const clases = clasesDeHoy(cuatri === 1 ? c1 : c2, [...c1, ...c2]);
      // La agenda es "tu día real": clases + lo que rendís/entregás hoy. Lo
      // institucional del calendario (inscripciones, feriados, avisos) se filtra
      // acá — eso vive en "Se viene" y Novedades, no en la agenda del día.
      const eventosAgenda = hoy.filter((e) => TIPOS_AGENDA.has(e.tipo));
      // Primero las clases (con hora real), luego los eventos accionables.
      return [...clases, ...eventosAgenda.map(eventoToAgenda)];
    })(),
    getProximosEventosCalendario(45, "ISI"),
    listarNovedades({ limite: NOVEDADES_EN_PANEL }),
    obtenerChat(),
  ]);

  const grafo = grafoR.status === "fulfilled" ? grafoR.value : null;
  const contadores = grafo?.contadores ?? CONTADORES_VACIOS;
  const porAnio = grafo ? progresoPorAnio(grafo.nodos) : [];

  const agenda = agendaR.status === "fulfilled" ? agendaR.value : [];

  const proximos: ProximoItem[] =
    proximosR.status === "fulfilled"
      ? proximosR.value
          .filter((e) => e.tipo !== "feriado")
          .map((e) => {
            const dias = diasHasta(e.fecha_inicio);
            const hora = new Date(e.fecha_inicio).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return {
              id: e.id,
              titulo: e.titulo,
              detalle: [etiquetaTipo(e.tipo), e.descripcion].filter(Boolean).join(" · ") || hora,
              diasRestantes: Math.max(0, dias),
              tipoLabel: etiquetaTipo(e.tipo),
              urgencia: urgenciaDe(dias),
            };
          })
      : [];

  const novedades =
    novedadesR.status === "fulfilled" ? novedadesR.value.map(novedadToItem) : [];

  const chat = chatR.status === "fulfilled" ? chatR.value : null;

  return {
    contadores,
    porAnio,
    agenda,
    proximos,
    novedades,
    chat,
    progresoMock: !grafo,
  };
}

/** Última conversación del asistente (título + cuándo), para el atajo del panel. */
async function obtenerChat(): Promise<ChatUltimo | null> {
  try {
    const convs = await listarConversaciones();
    if (convs.length === 0) return null;
    // La lista viene ordenada por actividad; por las dudas, elegimos la más
    // reciente por updated_at (cae a created_at si no hay).
    const ultima = [...convs].sort((a, b) => {
      const ta = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
      const tb = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
      return tb - ta;
    })[0];
    if (!ultima.titulo) return null;
    return {
      titulo: ultima.titulo,
      hace: haceTexto(ultima.updated_at ?? ultima.created_at ?? null),
      conversacionId: ultima.id,
    };
  } catch (err) {
    if (err instanceof ApiError) return null;
    return null;
  }
}
