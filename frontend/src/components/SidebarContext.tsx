"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Estado de la sidebar. Son tres cosas distintas y no hay que mezclarlas:
 *
 * - `collapsed` es de escritorio: la barra sigue visible pero en 64px, y la
 *   preferencia se recuerda entre visitas.
 * - `mobileOpen` es del drawer: abajo de `lg` la barra sale de pantalla y se
 *   abre por encima del contenido. No se persiste — que una visita nueva
 *   arranque con el menu abierto tapando todo seria un bug, no una comodidad.
 * - `editandoNav` es el modo "personalizar barra": qué módulos se muestran.
 *   Lo dispara el menú de cuenta (otro componente), por eso vive acá y no
 *   como estado local de la Sidebar.
 */
interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
  editandoNav: boolean;
  /** Entra a personalizar: expande la barra (editar necesita los textos) y,
   *  en mobile, abre el drawer. Recuerda cómo estaba para dejarlo igual al salir. */
  iniciarPersonalizacion: () => void;
  /** Sale de personalizar y restaura el colapso previo. */
  terminarPersonalizacion: () => void;
}

const Ctx = createContext<SidebarCtx>({
  collapsed: false,
  toggle: () => {},
  mobileOpen: false,
  toggleMobile: () => {},
  closeMobile: () => {},
  editandoNav: false,
  iniciarPersonalizacion: () => {},
  terminarPersonalizacion: () => {},
});

const STORAGE_KEY = "utnhub.sidebar.collapsed";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editandoNav, setEditandoNav] = useState(false);
  // Cómo estaba el colapso antes de entrar a personalizar, para restaurarlo al
  // salir. En un ref y no en estado: no dispara render, sólo se lee al terminar.
  const colapsadoPrevio = useRef(false);

  // Restaurar preferencia (solo cliente, evita mismatch de hidratación)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  // Con el drawer abierto se bloquea el scroll del fondo: si no, el dedo
  // scrollea la pagina de atras en vez del menu.
  useEffect(() => {
    if (!mobileOpen) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [mobileOpen]);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });

  // El expandir/colapsar de personalización NO se persiste (no toca STORAGE_KEY):
  // es temporal mientras dura la edición, la preferencia real del usuario queda
  // como estaba.
  const iniciarPersonalizacion = () => {
    colapsadoPrevio.current = collapsed;
    setCollapsed(false);
    setMobileOpen(true);
    setEditandoNav(true);
  };
  const terminarPersonalizacion = () => {
    setEditandoNav(false);
    setMobileOpen(false);
    if (colapsadoPrevio.current) setCollapsed(true);
  };

  return (
    <Ctx.Provider
      value={{
        collapsed,
        toggle,
        mobileOpen,
        toggleMobile: () => setMobileOpen((o) => !o),
        closeMobile: () => setMobileOpen(false),
        editandoNav,
        iniciarPersonalizacion,
        terminarPersonalizacion,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSidebar = () => useContext(Ctx);
