import Link from "next/link";

/**
 * Home del dashboard. Por ahora es una landing minima con accesos
 * directos. Se va a llenar a medida que armemos las otras pestanas.
 */
export default function DashboardHome() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-12 space-y-2">
        <p className="text-[10px] uppercase tracking-widest font-bold text-outline font-label">
          Welcome back
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight font-headline text-on-surface">
          Hola, Julian.
        </h1>
        <p className="text-on-surface-variant max-w-2xl">
          Tu asistente integral de UTN FRRO. Toda la informacion dispersa
          (web, calendario, profesores, novedades) en un solo lugar.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickLink
          href="/materias"
          icon="account_tree"
          title="Grafo de Correlativas"
          description="Mapa interactivo del plan de estudios. Que materias podes cursar, cuales te faltan."
        />
        <QuickLink
          href="/chat"
          icon="smart_toy"
          title="Chatbot"
          description="Pregunta sobre regimen academico, profesores o novedades. Respuestas con fuentes."
        />
        <QuickLink
          href="/calendario"
          icon="calendar_month"
          title="Calendario"
          description="Inscripciones, finales y fechas clave del cuatrimestre."
        />
      </section>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block bg-surface-container-high/40 hover:bg-surface-container-high p-6 rounded-2xl border border-outline-variant/10 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}
