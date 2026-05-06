import { ApiError, getGrafo } from "@/lib/api";
import type { GrafoResponse, TipoMateria } from "@/lib/types";
import { MateriasGraphView } from "@/components/materias/MateriasGraphView";
import { GrafoErrorState } from "@/components/materias/GrafoErrorState";

interface PageProps {
  searchParams: Promise<{ tipo?: string; usuario_id?: string }>;
}

/**
 * Pestana "Grafo/Carrera". Server component: hace el fetch del grafo
 * en el server (cache de Next), y delega filtros + canvas al client
 * component `MateriasGraphView`.
 *
 * Filtros que cambian el query string (`tipo=troncal|electiva`) hacen
 * refetch automatico via Next.
 *
 * Filtros visuales (anio, estado) se aplican client-side sobre el
 * mismo dataset.
 */
export default async function MateriasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tipo: TipoMateria = params.tipo === "electiva" ? "electiva" : "troncal";

  // TODO: cuando haya auth, este id viene de la sesion. Por ahora hardcoded.
  const usuarioId = params.usuario_id ? Number(params.usuario_id) : 1;

  let grafo: GrafoResponse | null = null;
  let errorMsg: string | null = null;

  try {
    grafo = await getGrafo({ tipo, usuarioId });
  } catch (err) {
    if (err instanceof ApiError) {
      errorMsg = `Backend devolvio ${err.status}.`;
    } else if (err instanceof Error) {
      errorMsg = err.message;
    } else {
      errorMsg = "Error desconocido.";
    }
  }

  if (!grafo) {
    return <GrafoErrorState mensaje={errorMsg ?? "No se pudo cargar el grafo."} />;
  }

  return <MateriasGraphView grafo={grafo} tipo={tipo} />;
}
