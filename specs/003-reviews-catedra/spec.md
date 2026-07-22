# Feature Specification: Reviews de cátedra (profesor × materia)

**Feature Branch**: `003-reviews-catedra`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Implementar la feature de reviews. Las reseñas son por cada profesor en
cada materia (cátedra), a partir de la planilla pública de UTNTAC. Score = nota 1–5 derivada de los
votos. Las vistas del frontend se definen después."

## Contexto

En la feature 002 el score de comisión se muestra **mockeado**. Esta feature construye el dato real:
capturar las reseñas por **(profesor, materia)** desde la planilla de UTNTAC (que hoy se lee para las
cátedras pero cuyos votos/puntajes se descartan) y calcular una **nota 1–5**. El promedio de esas notas
alimenta el score de la comisión.

**Alcance de esta versión (decisión del usuario)**: se implementa la **capa de datos + ingesta +
scoring (backend)** y su exposición por API. **Las vistas del frontend quedan diferidas** ("después
vemos cómo hacer las vistas"): el `ScoreMock` se reemplazará por el dato real en un paso posterior.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capturar las reseñas por profesor y materia (Priority: P1)

Como sistema quiero ingerir, para cada par (profesor, materia) de la planilla de UTNTAC, su desglose de
votos y su clasificación, para tener el dato base de calidad de cada cátedra en la base de datos.

**Why this priority**: Es el cimiento. Sin las reseñas persistidas no hay nota ni score real posible.

**Independent Test**: Correr la sincronización y verificar que se crean/actualizan las reseñas por
(profesor, materia) con sus conteos de votos, la cantidad de respuestas y su clasificación.

**Acceptance Scenarios**:

1. **Given** la planilla trae un par (profesor, materia) con su desglose de votos, **When** se
   sincroniza, **Then** queda una reseña asociada a ese profesor y esa materia con los 5 conteos
   (super recomiendo / recomiendo / normal / evitaría / super evitaría), la cantidad de respuestas y
   la clasificación textual.
2. **Given** una reseña ya existente para ese par, **When** se vuelve a sincronizar con datos nuevos,
   **Then** se actualiza (no se duplica).
3. **Given** una asignatura de la planilla que no pertenece al plan (no mapea a una materia), **When**
   se sincroniza, **Then** esa reseña no se persiste (se reporta como no mapeada) sin frenar el resto.
4. **Given** un profesor de la planilla que aún no estaba en el padrón, **When** se sincroniza, **Then**
   se resuelve/crea (reusando el mismo cruce que ya hace la sincronización de cátedras) y la reseña
   queda asociada a él.

---

### User Story 2 - Calcular la nota 1–5 de cada cátedra (Priority: P1)

Como sistema quiero calcular una nota de 1 a 5 por (profesor, materia) a partir de sus votos, para
poder comparar cátedras y promediarlas por comisión.

**Why this priority**: Es la regla de negocio central de la feature; el score de comisión depende de
ella.

**Independent Test**: Dado un desglose de votos conocido, la nota calculada coincide con el promedio
ponderado esperado (super evitaría=1 … super recomiendo=5).

**Acceptance Scenarios**:

1. **Given** una cátedra con votos `{super recomiendo:41, recomiendo:33, normal:13, evitaría:1, super
   evitaría:0}`, **When** se calcula la nota, **Then** da ≈ 4.3 (promedio ponderado 1–5).
2. **Given** una cátedra sin votos, **When** se calcula la nota, **Then** no hay nota (se trata como
   "sin datos"), sin división por cero.
3. **Given** cualquier nota, **When** se expone, **Then** viene acompañada de la **cantidad de
   respuestas** (decisión: nota cruda + #respuestas, sin recorte por muestra chica).

---

### User Story 3 - Score de comisión desde las notas reales (Priority: P2)

Como sistema quiero que el score de una comisión sea el promedio de las notas de sus (materia,
profesor) con reseña, para reemplazar el valor mockeado por el real.

**Why this priority**: Es el objetivo visible que motivó la feature, pero depende de US1 y US2.

**Independent Test**: Para una comisión con notas conocidas en algunas de sus cátedras, el score es el
promedio de las disponibles, e informa la cobertura (cuántas de sus cátedras tienen reseña).

**Acceptance Scenarios**:

1. **Given** una comisión donde algunas cátedras tienen reseña y otras no, **When** se calcula el
   score, **Then** es el promedio de las que tienen, e informa la cobertura (N con reseña de M).
2. **Given** una comisión sin ninguna cátedra con reseña, **When** se calcula el score, **Then** no
   hay score (se trata como "sin reseñas").

---

### User Story 4 - Exponer las reseñas por API (Priority: P2)

Como consumidor (las futuras vistas), quiero obtener por API la nota, la clasificación y la cantidad de
respuestas de cada (profesor, materia), y el score de cada comisión, para poder mostrarlas cuando se
definan las vistas.

**Why this priority**: Deja el dato listo para el frontend sin acoplar esta feature a un diseño de UI
todavía indefinido.

**Independent Test**: Consultar el/los endpoint(s) y ver, por cátedra, `nota`, `clasificacion` y
`cantidad_respuestas`; y por comisión, el `score` + cobertura.

**Acceptance Scenarios**:

1. **Given** cátedras con reseña, **When** se consulta la comisión, **Then** cada una de sus cátedras
   expone nota + clasificación + #respuestas, y la comisión su score + cobertura.
2. **Given** una cátedra sin reseña, **When** se consulta, **Then** sus campos de reseña vienen en
   null (la UI decidirá el fallback).

### Edge Cases

- Cátedra sin votos / sin reseña → nota null, no rompe.
- Asignatura fuera del plan → reseña no persistida, reportada.
- Profesor homónimo / no resoluble → se reusa el criterio de la sync de cátedras; si no resuelve, la
  reseña de esa fila no se asocia.
- Muestra chica (1–4 respuestas) → **se muestra igual**, con su #respuestas (sin ocultar ni ajustar).
- Re-sincronización → upsert idempotente, sin duplicar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST persistir, por par (profesor, materia), los 5 conteos de votos (super
  recomiendo / recomiendo / normal / evitaría / super evitaría), la cantidad de respuestas y la
  clasificación textual, tomados de la planilla de UTNTAC.
- **FR-002**: La ingesta MUST reutilizar el cruce nombre→profesor y asignatura→materia que ya realiza
  la sincronización de cátedras (misma planilla), y MUST ser idempotente (upsert, sin duplicar).
- **FR-003**: Las reseñas cuya asignatura no mapee al plan o cuyo profesor no se resuelva MUST no
  persistirse y MUST reportarse, sin interrumpir el resto de la ingesta.
- **FR-004**: El sistema MUST calcular una **nota de 1 a 5** por cátedra como promedio ponderado de los
  votos (super evitaría=1, evitaría=2, normal=3, recomiendo=4, super recomiendo=5).
- **FR-005**: La nota MUST ser "sin datos" cuando no hay votos (sin división por cero) y MUST exponerse
  siempre junto a la **cantidad de respuestas** (sin recorte ni ajuste por muestra chica).
- **FR-006**: El sistema MUST calcular el **score de una comisión** como el promedio de las notas de sus
  cátedras con reseña, e informar la **cobertura** (cuántas de sus cátedras tienen reseña); "sin
  reseñas" si ninguna la tiene.
- **FR-007**: El sistema MUST exponer por API, por cátedra: nota, clasificación y cantidad de
  respuestas; y por comisión: el score + cobertura. Campos en null cuando no hay reseña.
- **FR-008**: La regla de negocio de la nota (FR-004/005) MUST estar cubierta por tests.

### Key Entities *(include if feature involves data)*

- **Reseña de cátedra (ReviewCatedra)**: evaluación agregada de un profesor en una materia. Atributos:
  referencia a (profesor, materia), los 5 conteos de votos, cantidad de respuestas, clasificación
  textual (p.ej. "Super Recomendado" / "Evitar"). Una por par (profesor, materia).
- **Nota de cátedra** (derivada, no persistida): número 1–5 calculado desde los votos de la reseña.
- **Score de comisión** (derivado): promedio de las notas de sus cátedras con reseña + cobertura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tras sincronizar, se persisten las reseñas de los ~259 pares (profesor, materia) que la
  planilla trae con votos (menos los que no mapean al plan, que quedan reportados).
- **SC-002**: La nota calculada coincide con el promedio ponderado esperado en casos conocidos (p.ej.
  el par de referencia da ≈ 4.3).
- **SC-003**: Cada cátedra con reseña expone nota + clasificación + #respuestas; cada comisión expone
  su score real + cobertura, reemplazando el mock cuando se conecten las vistas.
- **SC-004**: Re-sincronizar no genera duplicados (mismo total de reseñas ante datos sin cambios).

## Assumptions

- **Las vistas del frontend quedan fuera de alcance** de esta feature (decisión explícita). Se entrega
  el dato + API; el reemplazo del `ScoreMock` y cualquier UI de reseñas se define después.
- **Muestras chicas se muestran sin ajuste** (nota cruda + #respuestas). Un shrinkage/umbral podría
  sumarse más adelante si se quiere, sin cambiar el modelo (la nota se computa, no se persiste).
- La fuente es la planilla pública de UTNTAC ya usada por la sincronización de cátedras; su formato y
  disponibilidad son un riesgo externo (igual que el resto de los scrapers).
- Las reseñas son **agregados** (conteos de votos ya sumados), no reseñas individuales de alumnos.
- La nota no se persiste: se calcula en el servicio para poder ajustar la fórmula sin migrar.
