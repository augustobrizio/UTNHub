# CLAUDE.md

Instrucciones operativas para Claude Code trabajando en UTNHub.

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
├── .claude/              # Config de Claude Code (rules, skills)
├── CLAUDE.md             # Este archivo
├── AGENTS.md             # Espejo para Codex y otros agentes
└── PROYECTO.md           # Documento del TPI (humanos y tribunal)
```

## Reglas operativas

### Stack obligatorio
- **Python** + **FastAPI** (backend, obligatorio por la materia)
- **Neon** (Postgres serverless con pgvector) — DB de desarrollo y producción
- **SQLAlchemy** + **Alembic** (ORM y migraciones)
- **pgvector** (embeddings dentro de Postgres, no usar Chroma/Pinecone)
- **LangChain / LangGraph** (negocio — agente)
- **React** + **Next.js** + **Tailwind** (frontend)
- **pytest** (tests)

### Base de datos: Neon
La DB vive en **Neon** (serverless Postgres). La connection string se lee desde `DATABASE_URL` en `backend/.env` (gitignored). El template está en `backend/.env.example`.

- Soporta **pgvector** nativo — activado con `CREATE EXTENSION vector;`.
- Connection string requiere `?sslmode=require&channel_binding=require`.
- Usar `pool_pre_ping=True` en el engine de SQLAlchemy: el compute de Neon se duerme tras inactividad y la primera query puede fallar sin pre-ping.
- Hay un **MCP server de Neon** configurado en `.mcp.json` — permite consultar la DB, listar branches, ver schemas, ejecutar SQL, etc. directamente desde Claude Code.

### Arquitectura en capas
Respetá la separación: **Datos** (`db/`, `repositories/`, `scrapers/`), **Negocio** (`services/`, `agent/`, `rag/`), **Presentación** (`api/`, frontend).

- Los endpoints de `api/` no acceden directamente a la DB — pasan por `services/`.
- Los servicios usan `repositories/` para acceso a datos.
- Las tools del agente viven en `agent/tools/` y consumen `services/`.


### Entorno de desarrollo

El backend corre en Docker. La DB está en Neon (remota), no hay container de Postgres.

**Setup inicial (una sola vez):**
```bash
cp backend/.env.example backend/.env
# Completar DATABASE_URL en backend/.env con el string de Neon
```

**Comandos del día a día:**
```bash
docker compose up           # levanta el backend en http://localhost:8000
docker compose up --build   # rebuild de la imagen (cuando cambia pyproject.toml)
docker compose down         # baja el container
docker compose logs -f      # ver logs en tiempo real

# Correr comandos dentro del container
docker compose exec app uv run pytest
docker compose exec app uv run alembic upgrade head
docker compose exec app uv run alembic revision --autogenerate -m "descripcion"
```

**Frontend (directo en la máquina host):**
```bash
cd frontend && npm run dev     # http://localhost:3000
cd frontend && npm run lint
```

### Antes de codear
1. Si la tarea toca un área documentada en `agent_docs/`, leé el doc primero.
2. Si la tarea agrega un patrón nuevo, considerá actualizar el doc correspondiente.
3. No inventes nombres de tablas, endpoints o tools — confirmá contra el código existente.

## Qué NO hacer
- No bypassear servicios desde los endpoints (rompe la arquitectura por capas).
- No hardcodear credenciales — todo va por `.env`.
- No generar respuestas del chatbot que no estén fundamentadas en fuentes recuperadas (RNF-12).
