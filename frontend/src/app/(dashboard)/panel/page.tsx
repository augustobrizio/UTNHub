import { RequiereCuenta } from "@/components/RequiereCuenta";
import { PanelDashboard } from "@/features/panel/PanelDashboard";
import { getUsuarioActual, nombreVisible } from "@/lib/auth";

// UTNHub cubre una sola carrera (ISI 2023): es una constante del producto, no
// un dato del usuario que falte.
const CARRERA = "Ingeniería en Sistemas de Información";

function lineaCarrera(anioIngresado: number | null | undefined): string {
  const base = `${CARRERA} · UTN FRRO`;
  return anioIngresado ? `${CARRERA} · Ingreso ${anioIngresado} · UTN FRRO` : base;
}

/**
 * "Mi panel": el dashboard personal del alumno. Antes vivía embebido en
 * /perfil; ahora es su propia pantalla y /perfil quedó como la cuenta.
 */
export default async function PanelPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return (
      <RequiereCuenta
        titulo="Mi panel"
        icono="dashboard"
        motivo="Tu resumen de cursada: progreso, agenda del día y lo que se viene."
        next="/panel"
      />
    );
  }

  const nombre = usuario.nombre ?? nombreVisible(usuario);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--shell-canvas)]">
      <div className="mx-auto max-w-[1200px] p-5 md:p-8">
        <header className="mb-6">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--shell-fg)] md:text-[26px]">
            Hola, {nombre}.
          </h1>
          <p className="mt-1 text-sm text-[var(--shell-fg-muted)]">
            {lineaCarrera(usuario.anio_ingresado)}
          </p>
        </header>

        <PanelDashboard />
      </div>
    </div>
  );
}
