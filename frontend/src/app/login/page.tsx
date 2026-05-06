/**
 * Login screen — placeholder. Esta ruta esta fuera del route group
 * (dashboard), por lo cual NO tiene sidebar/topbar.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-blueprint flex items-center justify-center p-8">
      <div className="bg-surface-container/60 border border-outline-variant/10 rounded-3xl p-12 max-w-md w-full">
        <h1 className="text-3xl font-extrabold tracking-tight font-headline text-on-surface mb-2">
          UTNHub
        </h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Inicia sesion con tu cuenta de UTN FRRO.
        </p>
        <p className="text-xs text-outline">Pantalla en construccion.</p>
      </div>
    </div>
  );
}
