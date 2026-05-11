/**
 * Cliente HTTP minimo y tipado contra el backend FastAPI.
 *
 * No usamos axios ni react-query a proposito: los Server Components de
 * Next 15 ya nos dan caching y revalidacion via `fetch`. Si en algun
 * momento sumamos client-side fetching pesado, vemos.
 */
import type {
  ConfirmarImportIn,
  GrafoResponse,
  MateriaOut,
  PreviewImportSysacad,
  ResultadoImportSysacad,
  TipoMateria,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Backend devolvio ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface FetchOptions extends RequestInit {
  /** segundos de revalidacion del cache (Server Component). */
  revalidate?: number;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { revalidate, ...init } = options;
  const url = `${API_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    // Server Components: cachear con revalidacion. Default 60s.
    next: { revalidate: revalidate ?? 60 },
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignorar
    }
    throw new ApiError(res.status, body);
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Endpoints del dominio academico
// ---------------------------------------------------------------------------

export interface GrafoParams {
  tipo: TipoMateria;
  usuarioId?: number;
}

export function getGrafo({ tipo, usuarioId }: GrafoParams): Promise<GrafoResponse> {
  const qs = new URLSearchParams({ tipo });
  if (usuarioId !== undefined) qs.set("usuario_id", String(usuarioId));
  // revalidate: 0 → nunca cachear. El grafo es user-specific y cambia con cada mutacion.
  return request<GrafoResponse>(`/materias/grafo?${qs.toString()}`, { revalidate: 0 });
}

export function listarMaterias(tipo?: TipoMateria): Promise<MateriaOut[]> {
  const qs = tipo ? `?tipo=${tipo}` : "";
  return request<MateriaOut[]>(`/materias${qs}`);
}

// Las mutaciones se enrutan via /api/backend (proxy Next.js) para evitar CORS en browser.
const MUTATION_BASE = "/api/backend";

export async function registrarEstado(
  usuarioId: number,
  codigo: string,
  payload: { condicion: string; forzar?: boolean },
): Promise<unknown> {
  const res = await fetch(`${MUTATION_BASE}/usuarios/${usuarioId}/materias/${codigo}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch { /* ignorar */ }
    throw new ApiError(res.status, body);
  }
  return res.json();
}

export async function eliminarEstado(usuarioId: number, codigo: string): Promise<void> {
  const res = await fetch(`${MUTATION_BASE}/usuarios/${usuarioId}/materias/${codigo}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok && res.status !== 404) {
    throw new ApiError(res.status, null);
  }
}

/** Elimina TODOS los registros de cursada del usuario (reset masivo). */
export async function resetearTodosRegistros(usuarioId: number): Promise<{ eliminados: number }> {
  const res = await fetch(`${MUTATION_BASE}/usuarios/${usuarioId}/materias`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new ApiError(res.status, null);
  }
  return res.json() as Promise<{ eliminados: number }>;
}

/**
 * Paso 1: manda el texto pegado de SYSACAD al backend y devuelve un preview
 * con las materias detectadas + el matching propuesto.
 * No toca la DB.
 */
export async function previewImportarSysacad(
  usuarioId: number,
  texto: string,
): Promise<PreviewImportSysacad> {
  const res = await fetch(
    `${MUTATION_BASE}/usuarios/${usuarioId}/materias/importar-sysacad/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ texto }),
    },
  );
  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch { /* ignorar */ }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<PreviewImportSysacad>;
}

/**
 * Paso 2 OCR: aplica la importacion con los items que el alumno confirmo.
 */
export async function confirmarImportarSysacad(
  usuarioId: number,
  payload: ConfirmarImportIn,
): Promise<ResultadoImportSysacad> {
  const res = await fetch(
    `${MUTATION_BASE}/usuarios/${usuarioId}/materias/importar-sysacad/confirmar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch { /* ignorar */ }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<ResultadoImportSysacad>;
}

export const api = {
  getGrafo,
  listarMaterias,
  registrarEstado,
  eliminarEstado,
  resetearTodosRegistros,
  previewImportarSysacad,
  confirmarImportarSysacad,
};
