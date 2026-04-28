# AGENTS.md

Instrucciones operativas para agentes de codificación (Codex, Cursor, otros) trabajando en UTNHub.

> Este archivo es el espejo de [`CLAUDE.md`](./CLAUDE.md) para herramientas que no son Claude Code. El contenido es prácticamente idéntico — lo importante es que cualquier agente lea las mismas reglas y la misma documentación técnica.

## Sobre el proyecto

UTNHub es un asistente integral para estudiantes de UTN FRRO que centraliza información dispersa (sitio web, Instagram, PDFs, calendarios) mediante un chatbot agéntico con IA y un pipeline de ingesta automática.

Es un Trabajo Práctico Integrador (TPI) de Ingeniería en Sistemas de Información, con condiciones obligatorias: Python, arquitectura en capas, ORM (SQLAlchemy), reglas de negocio con tests.

Para descripción extensa, requerimientos y decisiones de diseño, ver **[PROYECTO.md](./PROYECTO.md)**.

## Documentación técnica

Toda la documentación técnica del proyecto vive en **[`agent_docs/`](./agent_docs/)**. Antes de trabajar en un área, leé el documento correspondiente:

- `agent_docs/architecture.md` — Arquitectura por capas, flujos, módulos
- `agent_docs/code_conventions.md` — Convenciones de código del equipo
- `agent_docs/database_schema.md` — Schema de la DB y relaciones
- `agent_docs/api_conventions.md` — Convenciones de la API REST
- `agent_docs/scraper_guide.md` — Guía de scrapers e ingesta

## Estructura del repo

```
TPI-Soporte/
├── backend/              # FastAPI + SQLAlchemy + LangGraph
│   ├── app/
│   │   ├── api/          # Endpoints REST
│   │   ├── agent/        # Agente LangGraph (graph, prompts, tools)
│   │   ├── db/           # Modelos SQLAlchemy y sesión
│   │   ├── rag/          # Pipeline RAG (chunker, embeddings, retriever)
│   │   ├── repositories/ # Acceso a datos
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── scrapers/     # Scrapers por fuente
│   │   ├── services/     # Lógica de negocio
│   │   ├── workers/      # Jobs y scheduler
│   │   └── core/         # Logging, security, exceptions
│   └── pyproject.toml
├── frontend/             # React + Next.js + Tailwind
│   └── src/
│       ├── app/          # Páginas (Next.js App Router)
│       └── features/     # Componentes por feature
├── agent_docs/           # Documentación técnica (fuente de verdad)
├── CLAUDE.md             # Instrucciones para Claude Code
├── AGENTS.md             # Este archivo (Codex y otros)
└── PROYECTO.md           # Documento del TPI (humanos y tribunal)
```

## Reglas operativas

### Stack obligatorio
- **Python** + **FastAPI** (backend, obligatorio por la materia)
- **PostgreSQL** + **SQLAlchemy** + **Alembic** (datos)
- **pgvector** (embeddings dentro de Postgres, no usar Chroma/Pinecone)
- **LangChain / LangGraph** (negocio — agente)
- **React** + **Next.js** + **Tailwind** (frontend)
- **pytest** (tests)

### Arquitectura en capas
Respetá la separación: **Datos** (`db/`, `repositories/`, `scrapers/`), **Negocio** (`services/`, `agent/`, `rag/`), **Presentación** (`api/`, frontend).

- Los endpoints de `api/` no acceden directamente a la DB — pasan por `services/`.
- Los servicios usan `repositories/` para acceso a datos.
- Las tools del agente viven en `agent/tools/` y consumen `services/`.

### Reglas de negocio con tests
Cuatro reglas son centrales y deben tener tests en pytest:
- **RN-01**: Validación de correlatividades
- **RN-02**: Deduplicación de ingesta por content_hash
- **RN-03**: Guardrails de consultas (límite de tokens, dominio)
- **RN-04**: Integridad de conversaciones (alternancia de roles)

### Convenciones rápidas
- Nombres de modelos, columnas y endpoints en **español** (es el dominio del proyecto: materias, correlatividades, novedades).
- Imports absolutos desde `app.` (no relativos).
- Tipado con type hints en todo el backend.
- Componentes React en TypeScript (`.tsx`), nombres en inglés.

### Antes de codear
1. Si la tarea toca un área documentada en `agent_docs/`, leé el doc primero.
2. Si la tarea agrega un patrón nuevo, considerá actualizar el doc correspondiente.
3. No inventes nombres de tablas, endpoints o tools — confirmá contra el código existente.

### Comandos útiles
TODO: completar cuando estén configurados pyproject.toml y package.json.

```bash
# Backend
cd backend && uv run uvicorn app.main:app --reload
cd backend && uv run pytest

# Frontend
cd frontend && npm run dev
cd frontend && npm run lint
```

## Qué NO hacer
- No introducir bases vectoriales externas (pgvector cubre el caso).
- No bypassear servicios desde los endpoints (rompe la arquitectura por capas).
- No hardcodear credenciales — todo va por `.env`.
- No agregar dependencias sin discutir; el stack ya está definido.
- No generar respuestas del chatbot que no estén fundamentadas en fuentes recuperadas (RNF-12).
