import { notFound } from "next/navigation";

import { ChatWindow } from "@/features/chat/ChatWindow";
import type { MensajeChat } from "@/features/chat/useChat";
import { RequiereCuenta } from "@/components/RequiereCuenta";
import { ApiError, getConversacion } from "@/lib/api";
import { getUsuarioActual } from "@/lib/auth";

/**
 * Retoma una conversacion guardada. El historial lo trae el backend, que es
 * quien lo persiste (incluidas las fuentes citadas por cada respuesta).
 */
export default async function ConversacionPage({
  params,
}: {
  params: Promise<{ conversacionId: string }>;
}) {
  // Necesita cuenta igual que el listado: la conversacion pertenece a un
  // usuario y `getConversacion` va con token. Sin sesion, el CTA en vez del
  // 401 —y antes de pedirle nada al backend.
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

  const { conversacionId } = await params;
  const id = Number(conversacionId);
  if (!Number.isInteger(id)) notFound();

  try {
    const conversacion = await getConversacion(id);
    const inicial: MensajeChat[] = conversacion.mensajes
      .filter((m) => m.contenido && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({
        id: String(m.id),
        rol: m.role as "user" | "assistant",
        texto: m.contenido as string,
        fuentes: m.role === "assistant" ? m.fuentes : undefined,
        mensajeId: m.role === "assistant" ? m.id : undefined,
      }));

    return <ChatWindow conversacionId={id} inicial={inicial} />;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
