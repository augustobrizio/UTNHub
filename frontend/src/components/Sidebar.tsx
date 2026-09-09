"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  CalendarDays,
  ChevronsUpDown,
  Clock,
  Contact,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Gauge,
  House,
  LayoutDashboard,
  LogIn,
  Megaphone,
  Network,
  Pin,
  RotateCcw,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { LogoutButton } from "@/features/auth/LogoutButton";
import { LogoUTNHub } from "./LogoUTNHub";
import { useSidebar } from "./SidebarContext";

/**
 * `true` de `lg` para arriba, el mismo corte que usan las clases `lg:` del
 * shell. Hace falta en JS —y no solo en CSS— porque el modo compacto no es
 * cuestion de ancho sino de que se renderiza: con la barra colapsada se
 * ocultan los textos y aparecen tooltips. Sin esto, un usuario que colapso la
 * barra en la compu abriria el drawer del celular en 256px de ancho pero sin
 * un solo texto adentro.
 */
function useEsEscritorio() {
  const [esEscritorio, setEsEscritorio] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setEsEscritorio(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return esEscritorio;
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Inicio",       icon: House,        href: "/"          },
  { label: "Chatbot",      icon: Bot,          href: "/chat"      },
  { label: "Calendario",   icon: CalendarDays, href: "/calendario"},
  { label: "Mesas",        icon: FileText,     href: "/mesas"     },
  { label: "Materias",     icon: Network,      href: "/materias"  },
  { label: "Material",     icon: FolderOpen,   href: "/material"  },
  { label: "Horarios",     icon: Clock,        href: "/horarios"  },
  { label: "Comisiones",   icon: Users,        href: "/comisiones"},
  { label: "Novedades",    icon: Megaphone,    href: "/novedades" },
  { label: "Profesores",   icon: Contact,      href: "/profesores"},
  { label: "Mi panel",     icon: LayoutDashboard, href: "/panel"   },
  { label: "Perfil",       icon: User,         href: "/perfil"    },
] as const;

/** Sólo para admin: no se muestra al resto. */
const ITEM_ADMIN: NavItem = {
  label: "Moderar",
  icon: ShieldCheck,
  href: "/admin/novedades",
};

/**
 * Módulos que el usuario decidió ocultar de la navegación, por `href`.
 *
 * Es una preferencia **de este dispositivo/navegador** (no de la cuenta): la
 * barra es puro chrome de UI, y guardarla en localStorage la deja instantánea
 * y sin tocar backend. Si más adelante se quiere que siga al usuario entre
 * dispositivos, se mueve a un campo de perfil sin cambiar el resto.
 */
const NAV_STORAGE_KEY = "utnhub:nav-ocultos";

/** Inicio no se puede ocultar: es el ancla a la portada y evita que la barra
 *  quede vacía si alguien esconde todo lo demás. */
const HREF_FIJO = "/";

function leerOcultos(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(NAV_STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((h): h is string => typeof h === "string") : []);
  } catch {
    return new Set();
  }
}

function guardarOcultos(ocultos: Set<string>) {
  try {
    window.localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify([...ocultos]));
  } catch {
    // localStorage puede fallar (modo privado, storage lleno): la barra sigue
    // funcionando, sólo no persiste la preferencia.
  }
}

function isActive(currentPath: string, href: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

/** Tooltip flotante que aparece a la derecha del ícono cuando la sidebar está colapsada.
 *
 * Aparece con el mouse **y con el foco de teclado**: colapsada, el único
 * texto de cada item es este tooltip, así que si sólo respondiera al hover,
 * quien navega con Tab recorría diez íconos sin nombre. El `aria-label` ya
 * cubría al lector de pantalla; esto cubre al que ve la pantalla y no usa
 * mouse. `group-focus-visible` y no `group-focus`: al hacer click el item
 * también queda enfocado, y el tooltip se quedaba pegado después de navegar. */
function Tooltip({ label }: { label: string }) {
  return (
    <span
      className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg bg-[var(--shell-panel)] border border-[var(--shell-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--shell-fg)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
    >
      {label}
    </span>
  );
}

/** Datos del usuario logueado, resueltos en el layout (Server Component). */
export interface UsuarioSidebar {
  nombre: string;
  detalle: string;
  iniciales: string;
}

/** `null` = visitante sin cuenta: en vez del avatar van los accesos a entrar. */
export function Sidebar({
  usuario,
  esAdmin = false,
}: {
  usuario: UsuarioSidebar | null;
  /** Muestra los accesos de administración (moderar novedades, huecos del chatbot). */
  esAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { collapsed, mobileOpen, closeMobile, editandoNav, terminarPersonalizacion } =
    useSidebar();
  const esEscritorio = useEsEscritorio();

  // Colapsar es una preferencia de escritorio: el drawer del celular se abre
  // siempre completo.
  const compacto = collapsed && esEscritorio;

  // Al navegar se cierra solo. Sin esto, tocar una seccion deja el menu
  // abierto tapando justo lo que se acaba de abrir.
  useEffect(() => {
    closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Personalización de la navegación: qué módulos ocultó el usuario y si está
  // en modo edición. `hidratado` arranca en false para que el server y el
  // primer render del cliente coincidan (muestran todo); recién montado se lee
  // localStorage y se aplica el filtro. Sin esto, React tira mismatch de
  // hidratación cuando la preferencia guardada difiere de lo que rindió el server.
  const [hidratado, setHidratado] = useState(false);
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOcultos(leerOcultos());
    setHidratado(true);
  }, []);

  // `editandoNav` lo dispara el menú de cuenta y ya llega con la barra
  // expandida (ver iniciarPersonalizacion en SidebarContext). El `&& !compacto`
  // es un cinturón de seguridad: sin textos no se puede mostrar/ocultar.
  const editMode = editandoNav && !compacto;

  function alternarOculto(href: string) {
    if (href === HREF_FIJO) return; // Inicio no se oculta
    setOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      guardarOcultos(next);
      return next;
    });
  }

  function mostrarTodo() {
    setOcultos(() => {
      const vacio = new Set<string>();
      guardarOcultos(vacio);
      return vacio;
    });
  }

  return (
    <>
      {/* Fondo que atrapa el toque para cerrar. Solo existe con el drawer
          abierto, asi no bloquea clicks en escritorio. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          // z alto solo en mobile: el drawer tapa el TopNav (z-50). En
          // escritorio vuelve a z-40, que es como estaba, y el TopNav sigue
          // pasando por encima del header de la barra.
          "fixed left-0 top-0 z-[60] flex h-screen flex-col border-r border-[var(--shell-border)] bg-[var(--shell-panel)] lg:z-40",
          // Mobile: ancho fijo y entra/sale deslizando.
          "w-64 transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Escritorio: siempre visible, y el ancho lo manda `collapsed`.
          "lg:translate-x-0 lg:w-[var(--sb-w)] lg:transition-[width]",
        ].join(" ")}
        style={{ "--sb-w": compacto ? "var(--sb-w-closed)" : "var(--sb-w-open)" } as React.CSSProperties}
      >
      {/* Logo — alineado con el TopNav (h-16), y link a la portada igual que
          el de la barra superior: son el mismo isotipo repetido, que uno
          llevara al inicio y el otro no era justamente la inconsistencia.
          `closeMobile` explicito porque el drawer se cierra al cambiar de
          ruta: estando ya en `/` no hay cambio, y sin esto el menu quedaba
          abierto tapando la portada a la que se acaba de volver. */}
      <Link
        href="/"
        aria-label="Ir al inicio"
        onClick={closeMobile}
        className={[
          "flex h-16 shrink-0 items-center border-b border-[var(--shell-border)] transition-opacity hover:opacity-80",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1CA4DF]/40",
          compacto ? "justify-center px-0" : "gap-3 px-5",
        ].join(" ")}
      >
        <LogoUTNHub size={36} className="shrink-0" />
        {!compacto && (
          <div className="leading-none">
            <p className="font-headline text-[15px] font-extrabold tracking-tight text-[var(--shell-fg)]">
              UTNHub
            </p>
            <p className="mt-0.5 font-label text-[9px] uppercase tracking-[0.14em] text-[var(--shell-fg-dim)]">
              ISI · UTN FRRO
            </p>
          </div>
        )}
      </Link>

      {/* Navegacion.
          - Colapsada NO recorta overflow, si no los tooltips quedarian
            cortados contra el borde de la barra.
          - Expandida scrollea, pero con la barra de scroll oculta
            (`sin-scrollbar`): aparecia una barra gris permanente al costado
            de los modulos que ensuciaba toda la columna. Los items entran
            enteros en cualquier pantalla normal; el scroll queda como red de
            seguridad para ventanas muy bajas. */}
      <nav className={`flex-1 space-y-px pb-2 pt-3 ${compacto ? "overflow-visible px-2" : "sin-scrollbar overflow-y-auto overflow-x-hidden px-3"}`}>
        {/* Barra de edición — sólo mientras se personaliza. Concentra acá el
            "Listo" (salir) y el "Mostrar todo" (restaurar), así el modo normal
            no arrastra ningún control extra colgando de la navegación. */}
        {editMode && (
          <div className="mb-2 rounded-xl border border-[#1CA4DF]/20 bg-[#1CA4DF]/[0.07] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--shell-accent-fg)]">
                Personalizando
              </span>
              <button
                type="button"
                onClick={terminarPersonalizacion}
                className="rounded-md bg-[#1CA4DF]/15 px-2.5 py-1 font-body text-xs font-semibold text-[var(--shell-accent-fg)] transition-colors hover:bg-[#1CA4DF]/25"
              >
                Listo
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--shell-fg-dim)]">
              Tocá un módulo para ocultarlo o mostrarlo. Inicio queda siempre.
            </p>
            {ocultos.size > 0 && (
              <button
                type="button"
                onClick={mostrarTodo}
                className="mt-2 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-[var(--shell-fg-muted)] transition-colors hover:bg-[var(--shell-hover)] hover:text-[var(--shell-fg)]"
              >
                <RotateCcw className="h-[13px] w-[13px] shrink-0" strokeWidth={1.75} />
                Mostrar todo
              </button>
            )}
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const oculto = ocultos.has(item.href);
          const fijo = item.href === HREF_FIJO;

          // Fuera de edición, un módulo oculto no se dibuja (Inicio nunca).
          // Antes de hidratar mostramos todo: es lo que rindió el server.
          if (!editMode && hidratado && oculto && !fijo) return null;

          // Modo edición: cada módulo es un botón que alterna su visibilidad,
          // no un link — tocarlo no navega, lo oculta o lo vuelve a mostrar.
          // Se ven todos (los ocultos, atenuados) para poder recuperarlos.
          if (editMode) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => alternarOculto(item.href)}
                disabled={fijo}
                aria-pressed={!oculto}
                className={[
                  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 2xl:px-3.5 2xl:py-2.5 text-left transition-colors",
                  fijo
                    ? "cursor-default"
                    : "hover:bg-[var(--shell-hover)]",
                  oculto ? "text-[var(--shell-fg-dim)]" : "text-[var(--shell-fg)]",
                ].join(" ")}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0 2xl:h-5 2xl:w-5" strokeWidth={1.75} />
                <span className="flex-1 font-body text-sm font-medium 2xl:text-[15px]">{item.label}</span>
                {fijo ? (
                  <Pin className="h-[15px] w-[15px] shrink-0 text-[var(--shell-fg-dim)]" strokeWidth={1.75} />
                ) : oculto ? (
                  <EyeOff className="h-[15px] w-[15px] shrink-0 text-[var(--shell-fg-dim)]" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-[15px] w-[15px] shrink-0 text-[var(--shell-accent-fg)]" strokeWidth={1.75} />
                )}
              </button>
            );
          }

          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group relative flex items-center gap-3 rounded-lg transition-colors duration-150",
                compacto ? "justify-center px-0 py-2 2xl:py-2.5" : "px-3 py-2 2xl:px-3.5 2xl:py-2.5",
                active
                  ? "bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]"
                  : "text-[var(--shell-fg-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-fg)]",
              ].join(" ")}
            >
              {/* Accent pill del item activo (solo expandido) */}
              {active && !compacto && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#1CA4DF]" />
              )}
              <item.icon
                className="h-[18px] w-[18px] shrink-0 2xl:h-5 2xl:w-5"
                strokeWidth={active ? 2.25 : 1.75}
              />
              {!compacto && <span className="font-body text-sm font-medium 2xl:text-[15px]">{item.label}</span>}
              {compacto && <Tooltip label={item.label} />}
            </Link>
          );
        })}

        {/* Sección admin: sólo para cuentas con rol admin. No es personalizable,
            así que en modo edición se esconde para no mezclar links con los
            botones de mostrar/ocultar. */}
        {esAdmin && !editMode && (
          <>
            <div className={`my-2 border-t border-[var(--shell-border)] ${compacto ? "mx-2" : "mx-3"}`} />
            <Link
              href={ITEM_ADMIN.href}
              className={[
                "group relative flex items-center gap-3 rounded-lg transition-colors duration-150",
                compacto ? "justify-center px-0 py-2 2xl:py-2.5" : "px-3 py-2 2xl:px-3.5 2xl:py-2.5",
                isActive(pathname, ITEM_ADMIN.href)
                  ? "bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]"
                  : "text-[var(--shell-fg-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-fg)]",
              ].join(" ")}
            >
              <ITEM_ADMIN.icon className="h-[18px] w-[18px] shrink-0 2xl:h-5 2xl:w-5" strokeWidth={1.75} />
              {!compacto && (
                <span className="font-body text-sm font-medium 2xl:text-[15px]">{ITEM_ADMIN.label}</span>
              )}
              {compacto && <Tooltip label={ITEM_ADMIN.label} />}
            </Link>
            <Link
              href="/admin/chatbot"
              className={[
                "group relative flex items-center gap-3 rounded-lg transition-colors duration-150",
                compacto ? "justify-center px-0 py-2 2xl:py-2.5" : "px-3 py-2 2xl:px-3.5 2xl:py-2.5",
                isActive(pathname, "/admin/chatbot")
                  ? "bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]"
                  : "text-[var(--shell-fg-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-fg)]",
              ].join(" ")}
            >
              <Gauge className="h-[18px] w-[18px] shrink-0 2xl:h-5 2xl:w-5" strokeWidth={1.75} />
              {!compacto && (
                <span className="font-body text-sm font-medium 2xl:text-[15px]">Huecos del chatbot</span>
              )}
              {compacto && <Tooltip label="Huecos del chatbot" />}
            </Link>
          </>
        )}
      </nav>

      {/* Usuario — o los accesos a entrar, si es un visitante sin cuenta */}
      <div className={`shrink-0 border-t border-[var(--shell-border)] pb-4 pt-3 ${compacto ? "px-2" : "px-3"}`}>
        {usuario ? (
          <>
            <div className={`group relative flex cursor-pointer items-center gap-3 rounded-lg transition-colors hover:bg-[var(--shell-hover)] ${compacto ? "justify-center px-0 py-2.5" : "px-3 py-2.5"}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1CA4DF]/25 bg-[#1CA4DF]/10 font-headline text-xs font-extrabold text-[var(--shell-accent-fg)] 2xl:h-9 2xl:w-9 2xl:text-[13px]">
                {usuario.iniciales}
              </div>
              {!compacto && (
                <>
                  <div className="min-w-0 flex-1 leading-none">
                    <p className="truncate text-xs font-semibold text-[var(--shell-fg)] 2xl:text-[13px]">
                      {usuario.nombre}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--shell-fg-dim)] 2xl:text-[11px]">
                      {usuario.detalle}
                    </p>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--shell-fg-dim)] transition-colors group-hover:text-[var(--shell-fg-muted)]" strokeWidth={1.75} />
                </>
              )}
              {compacto && <Tooltip label={usuario.nombre} />}
            </div>

            <LogoutButton
              collapsed={compacto}
              tooltip={<Tooltip label="Cerrar sesión" />}
            />
          </>
        ) : (
          <div className={compacto ? "space-y-1" : "space-y-2"}>
            <Link
              href="/login"
              className={[
                "group relative flex items-center gap-3 rounded-lg bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)] transition-colors hover:bg-[#1CA4DF]/15",
                compacto ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
              ].join(" ")}
            >
              <LogIn className="h-[18px] w-[18px] shrink-0 2xl:h-5 2xl:w-5" strokeWidth={1.75} />
              {!compacto && (
                <span className="font-body text-sm font-medium 2xl:text-[15px]">
                  Iniciar sesión
                </span>
              )}
              {compacto && <Tooltip label="Iniciar sesión" />}
            </Link>

            {/* Colapsada queda solo el de entrar: dos íconos parecidos sin
                texto no se distinguen, y desde el login se llega al registro. */}
            {!compacto && (
              <Link
                href="/register"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[var(--shell-fg-muted)] transition-colors hover:bg-[var(--shell-hover)] hover:text-[var(--shell-fg)]"
              >
                <UserPlus className="h-[18px] w-[18px] shrink-0 2xl:h-5 2xl:w-5" strokeWidth={1.75} />
                <span className="font-body text-sm font-medium 2xl:text-[15px]">
                  Crear cuenta
                </span>
              </Link>
            )}
          </div>
        )}
        </div>
      </aside>
    </>
  );
}
