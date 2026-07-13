# Phase 0 — Research: Comisiones con Profesores

Sin `NEEDS CLARIFICATION` pendientes (las 2 decisiones abiertas —base del score y ubicación de la
vista— las cerró el usuario: nota 1–5 desde votos [futura] y página nueva `/comisiones`). Decisiones:

## D1 — Vínculo `cursada → profesor`: FK nullable, no reemplazar `docente`

- **Decisión**: agregar `cursada.profesor_id` **nullable**, FK a `profesor.id`, `ON DELETE SET NULL`,
  indexado; **conservar** la columna `docente` (texto crudo).
- **Rationale**: el `docente` viene del Excel como **apellido** y no siempre resuelve (ambiguos / fuera
  del padrón). Un FK obligatorio sería imposible de poblar sin forzar matches. Es el mismo patrón que
  ya usa el repo en `usuario_materia.cursada_id`. `docente` queda como fallback + provenance.
- **Alternativas**: FK `NOT NULL` (descartada, pierde datos); tabla N:M `cursada_profesor` (descartada
  por YAGNI: el dato trae un docente por cursada; el equipo de cátedra ya vive en `materia_profesor`).

## D2 — Matcher docente→profesor por `materia + apellido`

- **Decisión**: candidatos = profesores vinculados a la materia vía `materia_profesor`; entre ellos, el
  que matchea el apellido de `docente` (normalizado: minúsculas, sin acentos). Exactamente 1 → vincula;
  0 o >1 → deja `NULL`. Se apoya en `rapidfuzz` (ya presente) para normalizar/comparar, pero el filtro
  por materia hace el trabajo pesado.
- **Rationale**: medido sobre datos reales → **19/24 (79%) resueltos 1:1, 0 ambiguos, 5 sin match**
  (cobertura de `materia_profesor`). La materia acota candidatos a 1–2; el apellido desambigua.
- **Alternativas**: match global por apellido sin materia (descartado: apellido solo no desambigua,
  homónimos); fuzzy sobre nombre completo (innecesario, `docente` es apellido).

## D3 — Backfill re-ejecutable y no destructivo

- **Decisión**: el backfill/resolución **solo completa `profesor_id` cuando está NULL**; nunca pisa un
  valor existente.
- **Rationale**: hace la operación idempotente y **preserva correcciones manuales** (FR-003) y vínculos
  ya resueltos. Re-correr tras mejorar `materia_profesor` solo llena los huecos.
- **Alternativas**: recomputar todo siempre (descartado: borraría correcciones manuales).

## D4 — Endpoint de la vista: `GET /comisiones/con-profesores`

- **Decisión**: nuevo endpoint que devuelve comisiones (opcionalmente filtradas por año) con sus
  cursadas → materia + **profesor resuelto (mini)** + horarios. Reutiliza/extiende `comision_repo`
  (eager-load `cursada.profesor` y `cursada.materia`/`horarios`). El **agrupado por año** lo hace el
  frontend (client-side), consistente con la decisión de paginación/agrupado del cliente en 001.
- **Rationale**: separa datos (API plana con `anio` por comisión) de presentación (agrupado). Menos
  acoplamiento y reuso del repo existente `listar_comisiones`.
- **Alternativas**: agrupar en el backend (devolver dict por año) — más rígido; se descarta.

## D5 — Score de comisión: MOCK en el frontend

- **Decisión**: el score 1–5 se genera en el **frontend** de forma **determinística por comisión**
  (placeholder), visualmente marcado como provisorio. El API **no** expone `score` en esta feature.
- **Rationale**: el usuario pidió explícitamente "dejá la UX con dato mockeado" y hacer el backend real
  después. Mantener el mock fuera del API evita ensuciar el contrato con datos falsos; cuando llegue la
  spec de reviews, el API gana un `score` real y el frontend deja de mockear.
- **Alternativas**: mock en el backend (descartado: mete datos falsos en el contrato); no mostrar score
  (descartado: el usuario quiere ver el lugar/known formato ya).

## D6 — Reuso de presentación (evitar duplicar)

- **Decisión**: reutilizar `profesorAvatar` (iniciales+acento), extraer el formato `HH:MM` de
  `ProfesorDetalle` a un `lib/horario.ts` compartido, y seguir los estilos Kinetic. Card/row nuevos
  específicos de comisión, pero apoyados en esos helpers.
- **Rationale**: FR-011 pide reuso explícito; el formato de horario ya estaba inline en dos lugares.
- **Alternativas**: duplicar helpers (descartado).

**Output**: decisiones resueltas; listo para Phase 1.
