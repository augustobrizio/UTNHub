---
description: "Task list — Directorio de Profesores (frontend)"
---

# Tasks: Directorio de Profesores (frontend)

**Input**: Design documents from `specs/001-profesores-directory/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: NO se generan tasks de tests. La spec no solicita TDD y el frontend no tiene suite de tests;
la verificación es por `npm run lint` + validación manual en el browser (ver quickstart.md).

**Organization**: agrupadas por user story (US1/US2/US3) para implementación e testeo incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: a qué user story pertenece (US1/US2/US3)
- Rutas relativas a la raíz del repo.

## Path Conventions

Web app — el código de esta feature vive bajo `frontend/src/` (ver plan.md → Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: no requiere inicialización — el proyecto Next.js, el tooling (ESLint), las rutas
placeholder (`/profesores`, `/profesores/[profesorId]`) y la entrada del Sidebar ya existen.

- [X] T001 Verificar que el entorno levanta antes de codear: `docker compose up` (backend en :8000) y `cd frontend && npm run dev` (:3000); confirmar que `/profesores` renderiza el Placeholder actual.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, cliente API y helper compartidos por las tres user stories.

**⚠️ CRITICAL**: ninguna user story puede empezar hasta completar esta fase.

- [X] T002 [P] Agregar los tipos del dominio Profesores en `frontend/src/lib/types.ts` (sección "Dominio profesores"), espejo 1:1 de `backend/app/schemas/profesor.py`: `ProfesorListItem`, `ProfesorDetalleOut`, `MateriaProfesorOut`, `HorarioConsultaOut`, `ResultadoSincHorarios`, `ResultadoSincMails`, `ResultadoSincCatedras` (times como `string | null`).
- [X] T003 [P] Crear el helper `frontend/src/lib/profesorAvatar.ts` (estilo `materiaIcon.ts`): `inicialesProfesor(nombre)` y `acentoProfesor(seed)` que rota entre tokens `primary`/`secondary`/`tertiary`.
- [X] T004 Agregar a `frontend/src/lib/api.ts` las 5 funciones y registrarlas en el objeto `api`: lecturas `listarProfesores()` (GET `/profesores`, revalidate ~30) y `getProfesorDetalle(id)` (GET `/profesores/{id}`); mutaciones vía `MUTATION_BASE` `sincronizarHorariosProfesores()`, `sincronizarMailsProfesores()`, `sincronizarCatedrasUtntac()` (patrón de `sincronizarCalendario`, manejo de `ApiError`). Depende de T002.

**Checkpoint**: base lista — las user stories pueden comenzar.

---

## Phase 3: User Story 1 - Listado + búsqueda (Priority: P1) 🎯 MVP

**Goal**: el alumno ve el directorio de profesores con contadores y filtra por nombre/email, con
estados vacíos claros.

**Independent Test**: entrar a `/profesores`, ver el grid con contadores, filtrar en vivo, y verificar
los estados "sin resultados" y "directorio vacío" (ver quickstart US1).

### Implementation for User Story 1

- [X] T005 [P] [US1] Crear `frontend/src/components/profesores/ProfesorCard.tsx`: tarjeta con avatar (helper T003), nombre, email (o "sin email"), y 2 badges (materias / horarios de consulta); envuelta en `<Link href={/profesores/${id}}>`; hover-lift estilo `.cal-card`.
- [X] T006 [US1] Crear `frontend/src/components/profesores/ProfesoresView.tsx` (isla cliente): header con título + conteo, buscador controlado que filtra `nombre`/`email` con `useMemo`, grid responsivo de `ProfesorCard`, y estados vacíos (directorio vacío / sin resultados). Depende de T005.
- [X] T007 [US1] Cablear `frontend/src/app/(dashboard)/profesores/page.tsx`: reemplazar el Placeholder por un Server Component que hace `listarProfesores()` con `try/catch` de `ApiError` (patrón de `materias/page.tsx`) y renderiza `<ProfesoresView>`. Depende de T004, T006.

**Checkpoint**: US1 funcional y testeable por sí sola (MVP).

---

## Phase 4: User Story 2 - Detalle del profesor (Priority: P2)

**Goal**: al abrir un profesor se ven contacto, materias que dicta (sin enlace) y horarios de consulta,
con manejo de datos faltantes y de profesor inexistente.

**Independent Test**: abrir un profesor desde el listado y verificar las 3 secciones + estados vacíos;
navegar a un id inexistente y ver "no encontrado" (ver quickstart US2).

### Implementation for User Story 2

- [X] T008 [P] [US2] Crear `frontend/src/components/profesores/ProfesorDetalle.tsx` (presentacional): link "volver", header con avatar + nombre + email (`mailto:` si existe), sección "Materias que dicta" (nombre/fallback código, cargo, año, **sin** `<Link>`), sección "Horarios de consulta" (día, `HH:MM`–`HH:MM`, modalidad, aula), y estado vacío por sección (FR-010).
- [X] T009 [US2] Cablear `frontend/src/app/(dashboard)/profesores/[profesorId]/page.tsx`: reemplazar el Placeholder por un Server Component que hace `getProfesorDetalle(Number(profesorId))`; si `ApiError.status === 404` renderizar "profesor no encontrado" + volver; si OK renderizar `<ProfesorDetalle>`. Depende de T004, T008.

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Sincronización (mantenimiento) (Priority: P3)

**Goal**: disparar las 3 sincronizaciones con loading, resumen de resultado, errores legibles y
refresh de contadores; presentadas como acción secundaria.

**Independent Test**: disparar cada sync y verificar loading → resumen (o error si la fuente falla) y
la actualización de contadores del listado (ver quickstart US3).

### Implementation for User Story 3

- [X] T010 [P] [US3] Crear `frontend/src/components/profesores/SincronizarMenu.tsx` (isla cliente): botón/menú con 3 acciones (horarios/mails/cátedras); por cada una estado `loading` (deshabilita disparo duplicado), panel de resumen (contadores + `advertencias` + `errores` + `asignaturas_no_mapeadas`) y panel de error legible ante fallo; `router.refresh()` tras éxito. Usa las fns de T004.
- [~] T011 [US3] ~~Integrar `<SincronizarMenu>` en el header de `ProfesoresView`~~ → REVERTIDO: la sincronización se difiere al futuro panel de admin (FR-017). `SincronizarMenu` NO se monta en la pantalla de directorio; el componente y las funciones de API se conservan intactos para reusarlos en el admin panel.

**Checkpoint**: las tres user stories funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T012 [P] Correr `cd frontend && npm run lint` y corregir issues introducidos (si el repo usa pnpm, `pnpm lint`).
- [X] T013 [P] Pasada de consistencia visual: usar solo tokens de `tailwind.config` (nada hardcodeado), Material Symbols, y verificar responsividad del grid (FR-016, SC-006).
- [X] T014 Ejecutar la validación de `quickstart.md` en el browser (listado+búsqueda, detalle, 404, las 3 sync) — idealmente con el Browser MCP y screenshots.
- [X] T015 [US1] Paginación de render en `frontend/src/components/profesores/ProfesoresView.tsx` (FR-018): 24 tarjetas por página, controles anterior/siguiente + "Mostrando X–Y de N" + "Página P de T", filtrado sobre el total y reset a página 1 al cambiar la búsqueda.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: bloquea todas las user stories. T004 depende de T002.
- **User Stories (Phase 3-5)**: todas dependen de Foundational. Luego pueden ir en paralelo o en orden
  de prioridad P1 → P2 → P3.
- **Polish (Phase 6)**: depende de las stories deseadas completas.

### User Story Dependencies

- **US1 (P1)**: arranca tras Foundational. Sin dependencias de otras stories.
- **US2 (P2)**: arranca tras Foundational. Independiente de US1 (comparte solo `api.ts`/`types.ts`).
- **US3 (P3)**: arranca tras Foundational; T011 edita `ProfesoresView` (creado en US1), así que si se
  hace US3 sin US1, `ProfesoresView` debe existir primero.

### Within Each User Story

- Componentes hijos antes que los contenedores (Card → View; Detalle → page).
- Páginas Server Component al final de cada story (consumen los componentes + `api.ts`).

### Parallel Opportunities

- T002 y T003 en paralelo (archivos distintos).
- T005 [US1], T008 [US2], T010 [US3] pueden crearse en paralelo (componentes en archivos distintos),
  una vez lista la Foundational.
- Cuidado: T004, T006/T011 tocan archivos compartidos (`api.ts`, `ProfesoresView.tsx`) → no [P] entre sí.

---

## Parallel Example: arranque tras Foundational

```bash
# Componentes de presentación de cada story, en paralelo:
Task: "T005 ProfesorCard.tsx (US1)"
Task: "T008 ProfesorDetalle.tsx (US2)"
Task: "T010 SincronizarMenu.tsx (US3)"
```

---

## Implementation Strategy

### MVP First (US1)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **validar `/profesores`** → demo.

### Incremental Delivery
Foundational → US1 (MVP: listado+búsqueda) → US2 (detalle) → US3 (sincronización) → Polish. Cada story
agrega valor sin romper las anteriores.

---

## Notes

- [P] = archivos distintos, sin dependencias.
- Respetar arquitectura por capas: el frontend solo consume la API (`lib/api.ts` + proxy `/api/backend`).
- Reusar patrones existentes (Server Component + isla cliente; `types.ts` espejo de schemas).
- Commit por task o grupo lógico (el trackeo en git se define aparte con el usuario).
