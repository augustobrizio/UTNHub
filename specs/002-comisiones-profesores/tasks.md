---
description: "Task list — Comisiones con Profesores (vista + cruce)"
---

# Tasks: Comisiones con Profesores (vista + cruce)

**Input**: Design documents from `specs/002-comisiones-profesores/`

**Tests**: SÍ se genera 1 test de regla de negocio (el matcher docente→profesor) con pytest — lo pide
la materia (reglas de negocio con tests). El frontend se valida con `type-check` + browser.

**Organization**: por user story (US1 cruce / US2 vista / US3 score mock).

## Format: `[ID] [P?] [Story] Description` · rutas relativas a la raíz del repo.

---

## Phase 1: Setup

- [X] T001 Verificar entorno: `docker compose up` (backend :8000), `alembic current` = `c1d2e3f4a5b6` (head), y datos presentes (comisiones + `materia_profesor`).

---

## Phase 2: Foundational (Blocking) — cambio de schema

**⚠️ Bloquea todas las user stories.**

- [X] T002 [P] Agregar `Cursada.profesor_id` (nullable) + `relationship` en `backend/app/db/models/academico.py` (FK `profesor.id`, `ondelete="SET NULL"`, `index=True`).
- [~] T003 Migración Alembic `backend/alembic/versions/b2c3d4e5f6a7_add_profesor_id_to_cursada.py` — **archivo ESCRITO**, pero `alembic upgrade head` **BLOQUEADO**: el Neon compartido está en `b3e8f1c2a9d7` (rama `feat/novedades-ingesta-ia`, no mergeada), divergente de main. No se aplicó (decisión del usuario: no tocar la DB compartida).

**Checkpoint**: la columna existe; empiezan las user stories.

---

## Phase 3: User Story 1 - Cruce docente→profesor (Priority: P1)

**Goal**: resolver el profesor real de cada materia-comisión y exponerlo por API (fallback al apellido).

**Independent Test**: `GET /comisiones/con-profesores?anio=3` trae `profesor` resuelto donde
corresponde y `null` + `docente` donde es ambiguo/sin match; re-correr no pisa lo resuelto.

- [X] T004 [P] [US1] Matcher en `backend/app/services/cursada_profesor_service.py`: `resolver_cursadas(db)` que vincula por `materia_codigo` + apellido (normalizado, sin acentos/case) usando candidatos de `materia_profesor`; setea `profesor_id` solo si hay 1 candidato; **idempotente y no destructivo** (solo cuando `profesor_id IS NULL`). Depende de T002.
- [X] T005 [P] [US1] Test `backend/tests/test_cursada_profesor.py` (SQLite in-memory, patrón de `test_calendario.py`): match único → vincula; 2 mismo apellido en la materia → NULL; sin match → NULL; insensible a acentos/mayúsculas; no pisa `profesor_id` ya seteado. Depende de T004.
- [X] T006 [US1] Schemas en `backend/app/schemas/comision.py`: `ProfesorMiniOut {id, nombre}` + agregar `profesor: ProfesorMiniOut | None` a `CursadaOut` (conservando `docente`).
- [X] T007 [US1] Repo `backend/app/repositories/comision_repo.py`: `listar_comisiones_con_profesor(db, *, anio: int | None)` con eager-load de `cursada.profesor`, `cursada.materia`, `cursada.horarios`, ordenado por año/nombre.
- [X] T008 [US1] Service + endpoint: `comision_service` arma la respuesta y `GET /comisiones/con-profesores` (query `anio` opcional) en `backend/app/api/comisiones.py` → `list[ComisionOut]`. Depende de T006, T007.
- [~] T009 [US1] Backfill del matcher sobre la DB real — **BLOQUEADO** (depende de T003/columna aplicada). Pendiente hasta resolver la divergencia de migraciones. La lógica está lista y testeada en SQLite.

**Checkpoint**: el cruce funciona y se ve por API.

---

## Phase 4: User Story 2 - Vista /comisiones por año (Priority: P2)

**Goal**: página nueva que muestra comisiones agrupadas por año con materias + profesor + horario.

**Independent Test**: `/comisiones` muestra comisiones agrupadas por año; cada comisión lista materias
con profesor (o apellido) + horario; estados vacíos OK; profesor vinculado enlaza a su detalle.

- [X] T010 [P] [US2] `frontend/src/lib/horario.ts`: `formatHora("HH:MM:SS") → "HH:MM"` (extraído de `ProfesorDetalle`); refactorizar `ProfesorDetalle.tsx` para usarlo (reuso, FR-011).
- [X] T011 [P] [US2] `frontend/src/lib/types.ts`: tipos espejo — `ProfesorMini`, `CursadaConProfesor` (materia, docente, profesor, horarios), `ComisionConProfesores` ({id, nombre, anio, cursadas}).
- [X] T012 [US2] `frontend/src/lib/api.ts`: `listarComisionesConProfesores(anio?)` → `GET /comisiones/con-profesores` (revalidate ~30) + registrar en `api`. Depende de T011.
- [X] T013 [P] [US2] Componentes `frontend/src/components/comisiones/`: `MateriaComisionRow.tsx` (materia + profesor [avatar/link reusando 001] + horario vía `formatHora`) y `ComisionCard.tsx` (comisión → filas de materias). Depende de T010, T011.
- [X] T014 [US2] `frontend/src/components/comisiones/ComisionesView.tsx` (client): agrupa por año, filtro por año, estados vacíos. Depende de T013.
- [X] T015 [US2] `frontend/src/app/(dashboard)/comisiones/page.tsx`: Server Component `listarComisionesConProfesores()` + `try/catch ApiError` (patrón 001) → `<ComisionesView>`. Depende de T012, T014.
- [X] T016 [US2] `frontend/src/components/Sidebar.tsx`: agregar ítem "Comisiones" (ruta `/comisiones`, icono p.ej. `groups`).

**Checkpoint**: la vista funciona con profesores reales.

---

## Phase 5: User Story 3 - Score de comisión (MOCK) (Priority: P3)

**Goal**: mostrar un score 1–5 por comisión, mockeado y marcado provisorio (backend real → spec futura).

**Independent Test**: cada comisión muestra una nota 1–5 marcada como provisoria; el lugar/formato
quedan listos para enchufar el cálculo real.

- [X] T017 [P] [US3] `frontend/src/components/comisiones/ScoreMock.tsx`: nota 1–5 determinística por `comisionId` (placeholder), visualmente marcada como provisoria/mock. NO viene del API.
- [X] T018 [US3] Integrar `<ScoreMock>` en `ComisionCard`. Depende de T013, T017.

**Checkpoint**: score visible (mock) sin tocar backend.

---

## Phase 6: Polish

- [X] T019 [P] Verdes: `cd frontend && npm run type-check` y `docker compose exec app uv run pytest tests/test_cursada_profesor.py -q`.
- [X] T020 [P] Consistencia visual: tokens de `tailwind.config` (nada hardcodeado), Material Symbols, responsive; confirmar reuso de `profesorAvatar`/`formatHora` (FR-011, SC-006).
- [~] T021 Validación en browser — **PARCIAL**: verificado routing, ítem de Sidebar y estado de error (500) con gracia. El **happy path** (comisiones agrupadas + profesores resueltos + score mock) queda BLOQUEADO por la DB sin migrar; cubierto en su lugar por el test de integración pytest `test_endpoint_con_profesores_expone_vinculo_y_fallback`.

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2: T002→T003)** bloquea todo.
- **US1 (P3.x)**: T004/T005 (matcher+test) ∥ T006/T007 (schema/repo) → T008 (endpoint) → T009 (backfill).
- **US2 (P4.x)**: T010/T011 base → T012, T013 → T014 → T015; T016 independiente.
- **US3 (P5.x)**: T017 → T018 (sobre `ComisionCard` de US2).
- **Polish (P6)** al final.

### Parallel Opportunities
- T004 ∥ T006 ∥ T007 (backend, archivos distintos) tras T002.
- T010 ∥ T011 (frontend base) tras Foundational.
- T013 (componentes) y T017 (score) en paralelo.

## Notes
- Respetar capas: endpoint→service→repo; el matcher vive en `services/`. El FE solo consume API.
- Reuso obligado (FR-011): `profesorAvatar`, `formatHora` (nuevo helper compartido), estilos Kinetic.
- Score = **mock en el frontend**; el API NO gana `score` en esta feature (lo agrega la spec de reviews).
- Backfill (T009) muta la DB real (setea `profesor_id`), pero es no destructivo e idempotente.
