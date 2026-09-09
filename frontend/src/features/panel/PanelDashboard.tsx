import { obtenerPanel } from "./data";
import { AccesosRow } from "./AccesosRow";
import { AgendaCard } from "./AgendaCard";
import { AsistenteBar } from "./AsistenteBar";
import { NovedadesCard } from "./NovedadesCard";
import { ProgresoCard } from "./ProgresoCard";
import { QuickStats } from "./QuickStats";
import { SeVieneCard } from "./SeVieneCard";

/**
 * Dashboard personal ("Mi panel"): resumen de un vistazo (KPIs arriba) + bento
 * de cards compactas que se despliegan bajo demanda. Vive en /panel, separado
 * de /perfil (que es la cuenta). Todo se alimenta de endpoints existentes.
 */
export async function PanelDashboard() {
  const panel = await obtenerPanel();

  return (
    <div className="flex flex-col gap-3.5">
      {panel.progresoMock && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-600 dark:text-amber-400">
          No pude traer tu progreso del backend. Mostrando el panel en modo degradado.
        </div>
      )}

      <QuickStats contadores={panel.contadores} proximo={panel.proximos[0] ?? null} />

      {/* Bento: dos columnas de cards compactas en escritorio, una en mobile. */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <ProgresoCard contadores={panel.contadores} porAnio={panel.porAnio} />
        <AgendaCard items={panel.agenda} />
        <SeVieneCard proximos={panel.proximos} />
        <NovedadesCard novedades={panel.novedades} />
      </div>

      <AsistenteBar chat={panel.chat} />
      <AccesosRow />
    </div>
  );
}
