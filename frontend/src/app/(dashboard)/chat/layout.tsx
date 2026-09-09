import { ChatSidebar } from "@/features/chat/ChatSidebar";
import { listarConversaciones, type ConversacionOut } from "@/lib/api";
import { getUsuarioActual } from "@/lib/auth";

/**
 * Layout de la sección chat: panel de historial + la conversación activa.
 *
 * Trae las conversaciones del backend en el servidor (con la cookie de sesión).
 * Ojo: un layout NO se re-renderiza al navegar entre /chat y /chat/[id], así que
 * cuando se crea una conversación nueva el ChatWindow llama a router.refresh()
 * para que esta lista se actualice.
 */
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sin cuenta no hay historial que traer (`listarConversaciones` va con token)
  // ni panel de conversaciones que mostrar: el visitante ve el chat solo, a todo
  // el ancho. Igual lo envolvemos en el mismo contenedor de alto fijo que la
  // versión con sesión, si no el ChatWindow (que es `h-full`) se colapsa contra
  // el alto automático del main.
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  let conversaciones: ConversacionOut[] = [];
  try {
    conversaciones = await listarConversaciones();
  } catch {
    // Si el backend no responde, mostramos el chat igual (sin historial).
    conversaciones = [];
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ChatSidebar conversaciones={conversaciones} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
