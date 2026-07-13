# Phase 0 — Research: Directorio de Profesores (frontend)

No quedaron marcadores `NEEDS CLARIFICATION` en el Technical Context: el stack y los patrones ya están
establecidos en el repo. Este documento consolida las decisiones de diseño técnicas y por qué se
eligieron, reutilizando lo existente en lugar de introducir dependencias nuevas.

## D1 — Obtención de datos: Server Component + isla cliente

- **Decisión**: la lista y el detalle se cargan en Server Components (`page.tsx`) con
  `listarProfesores()` / `getProfesorDetalle(id)` de `lib/api.ts`; la interacción (búsqueda, menú de
  sync) vive en islas cliente (`"use client"`).
- **Rationale**: es exactamente el patrón de `materias/page.tsx` y `horarios/page.tsx` (fetch en
  server, componente cliente para UI). Aprovecha el caching/revalidación de `fetch` de Next 15 sin
  sumar react-query.
- **Alternativas**: fetch client-side con `useEffect` — descartado, rompe la convención y pierde el
  caching de Server Components.

## D2 — Búsqueda/filtrado del lado del cliente

- **Decisión**: traer la lista completa desde el server y filtrar por nombre/email en el cliente con
  `useMemo`.
- **Rationale**: el padrón es del orden de cientos de profesores (ver spec Assumptions); filtrar en
  memoria es instantáneo (<1s, SC-003) y evita round-trips por tecla. No hay endpoint de búsqueda en
  el backend y no hace falta crearlo.
- **Alternativas**: búsqueda server-side con querystring — innecesario a esta escala; agrega latencia.

## D3 — Sincronizaciones (mutaciones) vía proxy `/api/backend`

- **Decisión**: las 3 acciones de sync son POST a `/api/backend/profesores/sincronizar-*`, siguiendo el
  patrón de `sincronizarCalendario()` en `lib/api.ts`.
- **Rationale**: el rewrite de `next.config.ts` (`/api/backend/:path* → localhost:8000/:path*`) evita
  CORS en el browser. `router.refresh()` tras un sync exitoso revalida el Server Component del listado
  y actualiza los contadores (FR-015).
- **Alternativas**: llamar directo al backend desde el browser — descartado por CORS y por romper la
  convención existente.

## D4 — Tipos como espejo de los schemas Pydantic

- **Decisión**: agregar a `types.ts` interfaces que reflejan 1:1 `backend/app/schemas/profesor.py`
  (`ProfesorListItem`, `ProfesorDetalleOut`, `MateriaProfesorOut`, `HorarioConsultaOut`, y los 3
  `ResultadoSinc*`). Los `time` de Pydantic llegan como string `"HH:MM:SS"`.
- **Rationale**: es la regla explícita del encabezado de `types.ts` ("ni un campo más, ni uno menos").
- **Alternativas**: generación automática de tipos (openapi-typescript) — fuera de alcance; el repo
  mantiene los tipos a mano.

## D5 — Formato de horarios de consulta

- **Decisión**: mostrar `hora_inicio`–`hora_fin` recortando los segundos (`"HH:MM:SS"` → `"HH:MM"`).
- **Rationale**: legibilidad; los segundos no aportan. Se maneja el caso de campos nulos con "sin dato".
- **Alternativas**: librería de fechas — innecesaria para un slice de string.

## D6 — Avatar de profesor (iniciales + color de acento)

- **Decisión**: helper `profesorAvatar.ts` (estilo `materiaIcon.ts`) que deriva iniciales del nombre y
  rota determinísticamente entre los acentos del tema (`primary`/`secondary`/`tertiary`).
- **Rationale**: da identidad visual a cada tarjeta sin imágenes; determinístico ⇒ estable entre
  renders. Mismos tokens que ya usa el dashboard.
- **Alternativas**: avatar fijo monocromo — más pobre; imágenes reales — no hay fuente de fotos.

## D7 — Materias del detalle sin enlace (alcance)

- **Decisión**: las materias del detalle se muestran como información (chips/filas), sin `<Link>`.
- **Rationale**: pedido explícito del usuario (FR-008). Además el módulo de materias es un grafo sin
  ruta de detalle por materia ni foco por nodo, así que un enlace no tendría destino útil hoy.
- **Alternativas**: enlazar a `/materias` — descartado por pedido; deep-link a un nodo — mejora futura.

## D8 — Estados de carga/vacío/error

- **Decisión**: cubrir explícitamente directorio vacío, búsqueda sin resultados, profesor inexistente
  (404 → mensaje + volver), y por-sección "sin dato"; en sync, loading + resumen + error legible.
- **Rationale**: son requisitos duros (FR-003, FR-009, FR-010, FR-012..FR-014; SC-004/005). Se reusa
  la estética de estados vacíos ya presente (p.ej. `Placeholder`, `GrafoErrorState`).
- **Alternativas**: dejar caer errores sin manejar — inaceptable por spec.

## D9 — Paginación de render, client-side (24/página)

- **Decisión**: se mantiene el fetch único de la lista completa (D2), pero se pagina el **render** a 24
  tarjetas por página con controles anterior/siguiente + "Mostrando X–Y de N" + "Página P de T". El
  buscador filtra sobre el total y, al cambiar la query, la vista vuelve a la página 1.
- **Rationale**: con cientos de profesores (419 hoy) el costo no es la query ni el payload (~50KB) sino
  montar cientos de tarjetas en el DOM. Paginar el render lo elimina sin perder la búsqueda instantánea.
  No requiere tocar el backend.
- **Alternativas**: paginación server-side (limit/offset + total) — más escalable a miles, pero obliga a
  búsqueda server-side (pierde el filtrado instantáneo) y a cambiar el endpoint; descartada a esta
  escala. Infinite scroll / "cargar más" — válido, pero los controles de página numerados son más
  predecibles y simples.

**Output**: todas las decisiones resueltas; sin `NEEDS CLARIFICATION` pendientes. Listo para Phase 1.
