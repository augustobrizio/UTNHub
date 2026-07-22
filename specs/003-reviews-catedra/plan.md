# Implementation Plan: Reviews de cátedra (profesor × materia)

**Branch**: `main` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

## Summary

Capa de datos + ingesta + scoring de reviews por (profesor, materia) desde la planilla de UTNTAC (misma
que alimenta cátedras). Nota 1–5 = promedio ponderado de los votos (cruda, con #respuestas). Score de
comisión = promedio de las notas de sus cátedras + cobertura. Se expone por API extendiendo
`/comisiones/con-profesores`. **Frontend/vistas diferidas** (el `ScoreMock` se reemplaza después).

## Technical Context

- Backend Python 3.12 / FastAPI / SQLAlchemy 2 / Alembic. `rapidfuzz` ya presente (matching de materia).
- Storage: Neon Postgres — **1 tabla nueva** `review_catedra`.
- Testing: pytest (regla de negocio: `nota_catedra`, `score_comision`).
- Reuso: la sync de cátedras (`profesor_utntac_service.sincronizar_catedras`) ya resuelve
  nombre→profesor y asignatura→materia sobre esta misma planilla.

## Constitution Check
Capas ✅ (api→service→repo; scraper→service). ORM+Alembic ✅. Regla de negocio con tests ✅. Sin
secretos ✅. **PASS**.

## Cambios (backend)

```
backend/
├── alembic/versions/<rev>_review_catedra.py      # [NEW] down_revision = b2c3d4e5f6a7
├── app/db/models/review.py                        # [NEW] ReviewCatedra (unique materia+profesor)
├── app/db/models/__init__.py                      # [EDIT] registrar ReviewCatedra
├── app/scrapers/profesores_utntac_catedras.py     # [EDIT] CatedraDocente + parseo de votos/clasif.
├── app/repositories/review_repo.py                # [NEW] upsert + listar por (materia, profesor)
├── app/services/review_service.py                 # [NEW] nota_catedra() + score_comision()
├── app/services/profesor_utntac_service.py        # [EDIT] upsert review en la pasada de cátedras
├── app/schemas/comision.py                        # [EDIT] CursadaOut + review; ComisionOut + score
├── app/services/comision_service.py               # [EDIT] adjuntar nota/clasif./score
├── app/schemas/profesor.py                        # [EDIT] (opcional) ResultadoSincCatedras + reviews
└── tests/test_review_catedra.py                   # [NEW] nota + score + edge cases
```

## Decisiones

- **Modelo** `review_catedra(id, materia_codigo FK, profesor_id FK, super_recomiendo, recomiendo,
  normal, evitaria, super_evitaria, cantidad_respuestas, clasificacion)`, unique `(materia_codigo,
  profesor_id)`, FKs `ON DELETE CASCADE`. La **nota NO se persiste** (se computa en el service).
- **Nota** = `(5·sr + 4·r + 3·n + 2·e + 1·se) / (sr+r+n+e+se)`; `None` si total 0. Se expone con
  `cantidad_respuestas` (cruda, sin ajuste por muestra chica — decisión del usuario).
- **Score de comisión** = promedio de las notas de sus cursadas con review; expone `cobertura`
  (con_review / total). `None` si ninguna tiene review.
- **Ingesta**: se **extiende la sync de cátedras** (misma planilla, mismo cruce): al resolver
  `(codigo, profesor_id)` se hace upsert del review. Idempotente. Asignaturas no mapeadas / profesor no
  resuelto → sin review (ya se reportan). Contadores de review en el resultado.
- **API**: `/comisiones/con-profesores` — cada cursada gana `nota`, `clasificacion`,
  `cantidad_respuestas`; cada comisión gana `score` + `cobertura`. Null cuando no hay review.

## Verificación
- `alembic upgrade head` (tabla nueva) + correr la sync de cátedras (puebla reviews).
- `pytest tests/test_review_catedra.py`.
- `GET /comisiones/con-profesores` → cursadas con nota/clasif./#resp y comisión con score+cobertura.
- SC: ~259 reviews persistidas (menos no-mapeadas); nota de referencia ≈ 4.3; re-sync sin duplicar.
