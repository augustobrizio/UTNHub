import { ChatWindow } from "@/features/chat/ChatWindow";
import { getUsuarioActual } from "@/lib/auth";

/**
 * Chatbot. La sección se **ve** sin cuenta —la interfaz, las sugerencias— pero
 * para **usarla** hace falta registrarse: al enviar sin sesión, el ChatWindow
 * abre el aviso de registro en vez de pegarle al backend (que daría 401). Por
 * eso pasamos `autenticado` en vez de cortar con un gate a pantalla completa.
 */
export default async function ChatPage() {
  const usuario = await getUsuarioActual();
  return <ChatWindow autenticado={usuario !== null} />;
}
