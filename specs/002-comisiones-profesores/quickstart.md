# Quickstart — Validar Comisiones con Profesores

## Prerrequisitos
- `backend/.env` con `DATABASE_URL` (Neon).
- Datos ya cargados: comisiones/cursadas/horarios (seed Excel), profesores + `materia_profesor`
  (sync de cátedras). Sin `materia_profesor` el matcher no resuelve nada.

## Aplicar el cambio de schema
```bash
docker compose up
docker compose exec app uv run alembic upgrade head    # crea cursada.profesor_id
```

## Correr el backfill del matcher
```bash
# vía script/servicio de resolución docente→profesor (idempotente, no destructivo)
docker compose exec app uv run python -m app.services.cursada_profesor_service   # o script equivalente
```

## Tests de la regla de negocio
```bash
docker compose exec app uv run pytest tests/test_cursada_profesor.py -q
```
Casos cubiertos: match único (materia+apellido) → vincula; ambiguo (2 mismo apellido en la materia) →
NULL; sin match → NULL; insensible a acentos/mayúsculas; no pisa un `profesor_id` ya seteado.

## Frontend
```bash
cd frontend && npm run dev        # o pnpm dev
npm run type-check
```

## Escenarios de validación (por user story)

### US1 — Cruce (P1)
- `GET /comisiones/con-profesores?anio=3` → las cursadas resolubles traen `profesor` != null; los
  ambiguos/sin match traen `profesor: null` y conservan `docente`.
- Re-correr el backfill no cambia los ya resueltos ni pisa correcciones.

### US2 — Vista (P2)
- Ir a `/comisiones`: comisiones **agrupadas por año**; cada comisión lista sus materias con profesor
  (nombre o apellido fallback) + horario (`HH:MM`–`HH:MM`, aula). Estados vacíos OK.
- Un profesor vinculado enlaza a `/profesores/{id}`.

### US3 — Score mock (P3)
- Cada comisión muestra una nota 1–5, **marcada como provisoria/mock**. Verificar que el lugar/formato
  quedan listos para el cálculo real (spec futura), sin rediseño.

## Criterios cubiertos
- Cruce + fallback + no destructivo → FR-001..FR-005, SC-001.
- Vista por año + materias/profesores/horario + estados → FR-006..FR-008, FR-011/012, SC-002/003/004/006.
- Score mock listo para enchufar → FR-009/010, SC-005.
