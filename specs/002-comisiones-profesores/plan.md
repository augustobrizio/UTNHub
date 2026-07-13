# Implementation Plan: Comisiones con Profesores (vista + cruce)

**Branch**: `002-comisiones-profesores` (sobre `main`) | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-comisiones-profesores/spec.md`

## Summary

Dos entregables acoplados: (1) **cruzar** cada materia de comisión (`cursada`) con su profesor real del
padrón —hoy solo hay un `docente` (apellido) en texto— mediante un FK nullable + un matcher por
`materia + apellido`; y (2) una **vista nueva `/comisiones`** agrupada por año que muestra, por
comisión, sus materias con profesor + horario, reutilizando componentes existentes. El **score de
comisión se muestra MOCKEADO** en el frontend (placeholder 1–5); el cálculo real (reviews UTNTAC) es
una spec futura y NO se toca backend para eso.

## Technical Context

**Language/Version**: Backend Python 3.12 (FastAPI, SQLAlchemy 2, Alembic). Frontend TypeScript 5 /
React 19 / Next.js 15 (App Router).

**Primary Dependencies**: FastAPI, SQLAlchemy, Alembic, `rapidfuzz` (ya usado para matching de nombres
en `profesor_consulta_service`). Frontend: Next.js + Tailwind + `lib/api.ts`.

**Storage**: Neon Postgres (pgvector). Cambio de schema: **una columna nueva** `cursada.profesor_id`.

**Testing**: pytest (backend) — se agrega test de la **regla de negocio** del matcher (patrón de
`tests/test_calendario.py`: SQLite in-memory + `TestClient`). Frontend: `type-check` + validación en
browser.

**Target Platform**: Web (dashboard Next.js) + API FastAPI en Docker.

**Project Type**: Web application (feature full-stack en el monorepo).

**Performance Goals**: la vista agrupa/renderiza client-side; escala acotada (comisiones de una carrera
por año). Matcher/backfill: operación puntual, no en el hot path.

**Constraints**: arquitectura por capas (api→service→repo; el FE solo consume API). Cruce **no
destructivo**: se conserva `docente`. Reuso de componentes de presentación (no duplicar).

**Scale/Scope**: backend = 1 migración + 1 columna/relación + 1 service (matcher+backfill) + 1 test +
1 endpoint + schemas; frontend = 1 página nueva + ~4 componentes + 1 item de Sidebar + api/types.

## Constitution Check

Constitución sin ratificar (template); se aplican las reglas de `CLAUDE.md` como gates de-facto:
- **Capas**: ✅ endpoint→`comision_service`→`comision_repo`; matcher en `services/`; FE consume API.
- **ORM + migración**: ✅ SQLAlchemy + Alembic (revisión nueva, no `create_all`).
- **Regla de negocio con tests**: ✅ el matcher docente→profesor es la regla; se testea con pytest.
- **Sin credenciales hardcodeadas / reuso de patrones**: ✅.
- **No inventar respuestas del chatbot**: N/A.

Resultado: **PASS**, sin Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-comisiones-profesores/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md            # (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── alembic/versions/
│   └── <rev>_add_profesor_id_to_cursada.py      # [NEW] down_revision = c1d2e3f4a5b6
├── app/db/models/academico.py                   # [EDIT] Cursada.profesor_id + relationship
├── app/repositories/comision_repo.py            # [EDIT] listar_comisiones_con_profesor(anio?)
├── app/services/
│   ├── cursada_profesor_service.py              # [NEW] matcher (materia+apellido) + backfill
│   └── comision_service.py                      # [EDIT] armar la respuesta de la vista
├── app/schemas/comision.py                      # [EDIT] ProfesorMiniOut + CursadaOut.profesor
├── app/api/comisiones.py                        # [EDIT] GET /comisiones/con-profesores
└── tests/test_cursada_profesor.py               # [NEW] regla de negocio (matcher)

frontend/src/
├── app/(dashboard)/comisiones/page.tsx          # [NEW] Server Component (fetch + error)
├── components/comisiones/                        # [NEW]
│   ├── ComisionesView.tsx                        #   agrupa por año + filtro (client)
│   ├── ComisionCard.tsx                          #   comisión → materias
│   ├── MateriaComisionRow.tsx                    #   materia + profesor + horario
│   └── ScoreMock.tsx                             #   score 1–5 PLACEHOLDER (provisorio)
├── components/Sidebar.tsx                        # [EDIT] item "Comisiones"
└── lib/
    ├── api.ts · types.ts                         # [EDIT] listarComisionesConProfesores + tipos
    └── horario.ts                                # [NEW] formatHora() compartido (extrae hhmm)
```

**Structure Decision**: Web app full-stack. Backend agrega la columna + matcher + endpoint siguiendo
capas; frontend agrega la página `/comisiones` reutilizando `profesorAvatar`, el formato de horario
(se extrae a `lib/horario.ts` desde `ProfesorDetalle`) y los estilos Kinetic. Sidebar suma el ítem.

## Decisiones clave (ver research.md)

- **FK nullable + conservar `docente`**, `ON DELETE SET NULL`, indexado (patrón `usuario_materia.cursada_id`).
- **Matcher**: candidatos = profesores que dictan la materia (`materia_profesor`) cuyo apellido
  (normalizado, sin acentos/case) coincide con `cursada.docente`. Exactamente 1 → vincula; si 0 o >1 →
  NULL. Medido: ~79% resuelto, 0 ambiguos.
- **Backfill re-ejecutable y no destructivo**: solo completa `profesor_id` NULL (nunca pisa un vínculo
  existente) → preserva correcciones manuales.
- **Score = mock en el FRONTEND** (determinístico por comisión, 1–5, marcado provisorio). El API **no**
  gana campo `score` todavía; lo agrega la spec de reviews.

## Complexity Tracking

> No aplica — Constitution Check pasa sin violaciones.
