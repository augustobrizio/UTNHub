import { ChatWindow } from "@/features/chat/ChatWindow";
import { RequiereCuenta } from "@/components/RequiereCuenta";
import { getUsuarioActual } from "@/lib/auth";

/**
 * Chatbot. Necesita cuenta: las conversaciones son de un usuario concreto y el
 * backend valida el token en cada request. Sin sesion mostramos el CTA de
 * `RequiereCuenta` —el mismo de perfil, materias u horarios— en vez de dejar
 * que el visitante choque contra un 401 sin explicacion.
 */
export default async function ChatPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return (
      <RequiereCuenta
        titulo="Chatbot"
        icono="smart_toy"
        motivo="El asistente que responde sobre materias, trámites, fechas y novedades con fuentes citadas."
        next="/chat"
      />
    );
  }

  return <ChatWindow />;
}
