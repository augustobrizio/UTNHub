# Guía de estilo de UI

El frontend hoy conviven **dos lenguajes visuales distintos**. Este doc
existe para que, si tocás una página, sepas cuál seguís — y para que el
shell nuevo (Sidebar/TopNav/Novedades) tenga sus reglas escritas en algún
lado antes de que alguien más lo extienda.

## Los dos sistemas

| | **"Kinetic Blueprint"** (viejo) | **"Vercel × UTN"** (nuevo) |
|---|---|---|
| Dónde vive | Grafo de correlativas, Materias, Calendario, Horarios | Sidebar, TopNav, Novedades |
| Paleta | Navy/MD3 (`surface`, `on-surface`, `primary`, etc. en `tailwind.config.ts`) | Canvas neutro real (blanco/negro), acento celeste institucional |
| Dark/Light | Dark-only, `color-scheme: dark` fijo en `globals.css` | Ambos — toggle en el TopNav (`next-themes`) |
| Bordes | "No-Line Rule": nada de `border 1px solid gris`, se usa tonal layering / glow | Hairline borders explícitos (`border-white/[0.06]` en dark) |
| Definido en | `agent_docs/database_schema.md`-adyacente, comentarios en `globals.css` (`Kinetic Blueprint`) | Este doc |

**No mezclés los dos en el mismo componente.** Si tu página es del sistema
viejo (Materias, Calendario, Horarios, Grafo) y no está en el roadmap de
reskin todavía, seguí usando `surface`/`on-surface`/etc. Si vas a reskinear
tu página al lenguaje nuevo, es un cambio de diseño explícito — avisá antes,
no lo hagas de paso en un PR de otra cosa.

## El sistema "Vercel × UTN" — cómo se arma

### Tokens de color (`--shell-*`)

Definidos en `frontend/src/app/globals.css`, con valores distintos en
`:root` (light) y `.dark` (dark). **Usalos en vez de hex hardcodeado** —
es lo que hace que el light mode funcione sin tocar cada componente:

```css
:root {
  --shell-canvas: #fafafa;      /* bg de página */
  --shell-panel: #ffffff;       /* bg de card/sidebar/topnav/dialog */
  --shell-border: rgba(0,0,0,0.08);
  --shell-hover: rgba(0,0,0,0.04);
  --shell-fg: #171717;          /* texto de alto énfasis (títulos) */
  --shell-fg-muted: #525252;    /* texto secundario (body, labels) */
  --shell-fg-dim: #a3a3a3;      /* texto terciario (hints, iconos idle) */
  --shell-accent-fg: #0e7fb0;   /* celeste sobre texto/iconos (contraste en claro) */
}
.dark { /* mismos nombres, valores oscuros */ }
```

En Tailwind se usan como arbitrary values: `bg-[var(--shell-canvas)]`,
`text-[var(--shell-fg-muted)]`, `border-[var(--shell-border)]`.

El celeste institucional **`#1CA4DF`** se deja literal (no es un token) —
funciona igual de bien sobre fondo blanco o negro, típicamente en `/10` de
opacidad para fondos (`bg-[#1CA4DF]/10`) y sin opacidad para acentos sólidos
(la barrita del nav activo, el punto de notificación).

Mapeo rápido si estás migrando un componente viejo del shell:

| Antes (hardcodeado, dark-only) | Ahora |
|---|---|
| `bg-[#09090b]`, `bg-[#0a0a0a]` (canvas de página) | `bg-[var(--shell-canvas)]` |
| `bg-[#0c0c0e]` (card/panel/sidebar/topnav) | `bg-[var(--shell-panel)]` |
| `border-white/[0.06]`, `border-white/[0.07]`, `border-white/10` | `border-[var(--shell-border)]` |
| `bg-white/[0.04]`, `bg-white/[0.05]`, `bg-white/[0.06]`, `hover:bg-[#111113]` | `bg-[var(--shell-hover)]` |
| `text-neutral-50`, `text-neutral-100`, `text-neutral-200` | `text-[var(--shell-fg)]` |
| `text-neutral-300`, `text-neutral-400` | `text-[var(--shell-fg-muted)]` |
| `text-neutral-500`, `text-neutral-600` | `text-[var(--shell-fg-dim)]` |
| `text-[#4EC0EC]` (celeste sobre texto) | `text-[var(--shell-accent-fg)]` |

### Tipografía

- `font-headline` (Manrope) — títulos, nombres propios (UTNHub, títulos de card).
- `font-body` (Inter) — todo el resto (default del `<body>`, no hace falta declararlo).
- `font-label` (Inter) — labels en mayúscula/tracking ancho (ej. "MÓDULOS", "ACTUALIZADO AUTOMATICAMENTE").

### Iconos

Material Symbols Outlined (`<span className="material-symbols-outlined">nombre_del_icono</span>`),
cargado globalmente en `app/layout.tsx`. No se usa ninguna librería de
iconos de React (lucide, heroicons, etc.) — mantenerlo así.

### Componentes base (`components/ui/`)

Primitivas estilo shadcn/ui: `Card`/`CardContent`/`CardFooter` (`card.tsx`),
`Badge` (`badge.tsx`, variantes `celeste`/`neutral`/`outline`), `Dialog`
(`dialog.tsx`, wrapper de `@radix-ui/react-dialog`). Todas usan
`React.forwardRef` + `cn()` (`lib/utils.ts`, clsx + tailwind-merge) para
aceptar `className` adicional desde el caller. Si necesitás un primitivo
nuevo (dropdown, tooltip, sheet), seguí el mismo patrón — Radix headless +
wrapper con los tokens `--shell-*`, no una librería de componentes con
estilos propios (Chakra, MUI, etc.).

### Dark/Light mode

`next-themes` (`attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`),
provider en `components/ThemeProvider.tsx` envolviendo todo en
`app/layout.tsx`. El toggle vive en `TopNav.tsx` (`useTheme()`). Como es
`attribute="class"`, alcanza con que tus estilos usen los tokens
`--shell-*` (que ya cambian solos con `.dark` en el html) — no hace falta
lógica condicional en el componente.

**Esto NO alcanza a las páginas de Kinetic Blueprint** — su
`color-scheme: dark` en `globals.css` es fijo, independiente de la clase
`.dark`/`.light` del html. El toggle de tema no las afecta ni para bien ni
para mal.

## Layout / composición

- Cards: `rounded-xl`, hairline border, sin drop-shadow — el hover es un
  cambio sutil de `bg` + `border-color` hacia el celeste (`group-hover:border-[#1CA4DF]/40`).
- Footers de card con dos grupos flex explícitos (`min-w-0 flex-1` a la
  izquierda para lo que trunca, `shrink-0` a la derecha para lo que no) en
  vez de `ml-auto` suelto — evita gaps inconsistentes cuando el contenido
  varía en longitud (ver `NovedadCard.tsx`).
- Modales/detalles (`Dialog`): overlay con blur, panel `rounded-xl` +
  hairline border, transición vía `data-[state=open|closed]` de Radix (sin
  plugin de animaciones — no está instalado `tailwindcss-animate`).
- Filtros como chips (`rounded-full`, border hairline, estado activo =
  `bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]` + `border-[#1CA4DF]/30`),
  navegación vía querystring (`?centro=handle`) en vez de estado de cliente
  cuando la página ya es un Server Component — ver `FiltroFuentes.tsx`.

## Referencia de archivos

- `app/globals.css` — tokens `--shell-*` + estilos de Kinetic Blueprint (no tocar esa sección).
- `components/ThemeProvider.tsx`, `components/TopNav.tsx` (toggle) — dark/light.
- `components/Sidebar.tsx`, `components/TopNav.tsx` — shell reskineado.
- `components/ui/card.tsx`, `badge.tsx`, `dialog.tsx` — primitivas.
- `features/novedades/` — ejemplo end-to-end del lenguaje aplicado a una feature completa (card, detalle, filtro).
