# Implementation Plan: Directorio de Profesores (frontend)

**Branch**: `001-profesores-directory` (trabajando sobre `main`) | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-profesores-directory/spec.md`

## Summary

Cablear el frontend del módulo Profesores de UTNHub, hoy `<Placeholder />` en `/profesores` y
`/profesores/[profesorId]`. El backend ya expone todo lo necesario (`GET /profesores`,
`GET /profesores/{id}`, y `POST /profesores/sincronizar-{horarios,mails,catedras-utntac}`). El trabajo
es capa de presentación: listar profesores con búsqueda, mostrar el detalle (materias que dicta +
horarios de consulta, sin enlace navegable a materias) y ofrecer las 3 acciones de sincronización de
mantenimiento con estados de carga/resultado/error. Se reutilizan los patrones existentes: Server
Components que consumen `lib/api.ts` (`request()` para GETs cacheados, proxy `/api/backend` para
mutaciones), `types.ts` como espejo de los Pydantic schemas, y el sistema de diseño "Kinetic
Blueprint" (tokens de Tailwind + Material Symbols).

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15 (App Router)

**Primary Dependencies**: Next.js (App Router, Server Components + rewrites), React, Tailwind CSS.
Cliente HTTP propio en `frontend/src/lib/api.ts` (sin axios/react-query, por decisión del proyecto).

**Storage**: N/A en el frontend. Los datos viven en el backend (FastAPI + SQLAlchemy + Neon Postgres)
y se consumen vía REST. Esta feature no persiste estado propio.

**Testing**: ESLint (`npm run lint`) + verificación manual end-to-end en el browser. (Los tests
automatizados de reglas de negocio viven en el backend con pytest; el alcance de esta feature es UI.)

**Target Platform**: Navegador web — pantalla dentro del dashboard `(dashboard)` de Next.js.

**Project Type**: Web application (feature de frontend dentro del monorepo existente).

**Performance Goals**: filtrado del listado percibido instantáneo (<1s, client-side sobre la lista ya
cargada); interacciones fluidas (~60fps) coherentes con las microinteracciones de `globals.css`.

**Constraints**: respetar la arquitectura por capas (el frontend NO accede a la DB; solo consume la
API — las mutaciones pasan por el proxy `/api/backend`). Coherencia visual estricta con el resto del
dashboard (tokens de `tailwind.config`, nada de colores hardcodeados). Tolerar datos incompletos.

**Scale/Scope**: 2 rutas (listado + detalle) ya existentes como placeholder; ~5 componentes nuevos +
2 helpers; padrón del orden de cientos de profesores (por eso el filtro client-side es aceptable).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

La constitución del proyecto (`.specify/memory/constitution.md`) todavía es el template sin ratificar,
así que no hay gates formales. En su lugar se aplican las reglas operativas vigentes de `CLAUDE.md`
como restricciones de-facto, y esta feature las cumple:

- **Arquitectura en capas**: ✅ el frontend consume la API por `lib/api.ts`; ninguna llamada directa a
  la DB; mutaciones vía proxy `/api/backend` (rewrite de `next.config.ts`). No se bypassa ninguna capa.
- **Sin credenciales hardcodeadas**: ✅ base URL por `NEXT_PUBLIC_API_URL`; no se agregan secretos.
- **Reuso de patrones**: ✅ se replican los patrones ya usados en materias/calendario/horarios
  (Server Component que hace fetch + isla cliente para interacción; `types.ts` espejo de schemas).
- **RNF-12 (respuestas fundamentadas)**: N/A — no toca el chatbot/RAG.

Resultado: **PASS** (sin violaciones; sin necesidad de Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/001-profesores-directory/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Phase 0 (/speckit-plan)
├── data-model.md        # Phase 1 (/speckit-plan)
├── quickstart.md        # Phase 1 (/speckit-plan)
├── contracts/           # Phase 1 (/speckit-plan) — contrato de API consumida por la UI
│   └── api.md
├── checklists/
│   └── requirements.md  # (/speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
frontend/src/
├── app/(dashboard)/profesores/
│   ├── page.tsx                     # [EDIT] reemplaza Placeholder → Server Component (lista)
│   └── [profesorId]/page.tsx        # [EDIT] reemplaza Placeholder → Server Component (detalle)
├── components/profesores/           # [NEW] componentes del módulo
│   ├── ProfesoresView.tsx           # [NEW] isla cliente: búsqueda + grid + menú sync
│   ├── ProfesorCard.tsx             # [NEW] tarjeta de la lista → link al detalle
│   ├── SincronizarMenu.tsx          # [NEW] isla cliente: 3 acciones sync + feedback
│   └── ProfesorDetalle.tsx          # [NEW] presentacional: contacto + materias + horarios
└── lib/
    ├── api.ts                       # [EDIT] + listarProfesores, getProfesorDetalle, 3 sync
    ├── types.ts                     # [EDIT] + tipos espejo de schemas/profesor.py
    └── profesorAvatar.ts            # [NEW] helper: iniciales + color de acento determinístico
```

**Structure Decision**: Web application. La feature vive íntegramente bajo `frontend/src/` reutilizando
la estructura ya establecida (páginas en `app/(dashboard)/`, componentes por feature en
`components/<feature>/`, y utilidades en `lib/`). "Profesores" ya está registrado en el Sidebar
(`components/Sidebar.tsx`), así que no hay cambios de navegación.

## Complexity Tracking

> No aplica — Constitution Check pasa sin violaciones.
