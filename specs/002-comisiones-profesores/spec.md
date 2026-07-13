# Feature Specification: Comisiones con Profesores (vista + cruce)

**Feature Branch**: `002-comisiones-profesores`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Cruzar las comisiones con los profesores reales y armar una vista de
comisiones segmentada por año, donde en cada comisión se vean las materias con sus profesores y el
horario. Mostrar un score de la comisión (promedio de sus materias-profesor). El cálculo real del
score (reviews de UTNTAC) queda para otra spec; por ahora la UX muestra el score mockeado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cruzar cada materia de una comisión con su profesor real (Priority: P1)

Hoy cada materia de una comisión guarda al docente como un apellido suelto (texto), desconectado del
padrón de profesores. Como sistema quiero resolver ese docente al profesor real del padrón, para que
en cualquier vista se pueda mostrar quién dicta —con su información asociada— en vez de un apellido
aislado.

**Why this priority**: Es el cimiento de datos. Sin este cruce, la vista de comisiones solo puede
mostrar apellidos sueltos. Además enriquece features ya existentes (p.ej. el armador de horarios, que
hoy muestra solo el apellido del docente).

**Independent Test**: Se puede validar consultando una comisión y verificando que sus materias traen
el profesor resuelto (cuando el apellido + la materia lo permiten) y que los casos ambiguos o sin
coincidencia caen limpiamente al apellido original sin romperse.

**Acceptance Scenarios**:

1. **Given** una materia de comisión cuyo docente (apellido) coincide inequívocamente con un profesor
   que dicta esa materia, **When** se resuelve el cruce, **Then** esa materia queda vinculada al
   profesor real.
2. **Given** un docente cuyo apellido no permite identificar un único profesor (ambiguo) o que no
   figura en el padrón, **When** se resuelve el cruce, **Then** la materia queda **sin** profesor
   vinculado y conserva el apellido original como respaldo visible.
3. **Given** que el cruce ya se resolvió, **When** se agrega/mejora la información de profesores del
   padrón, **Then** el cruce se puede volver a calcular sin perder los datos originales ni las
   correcciones hechas a mano.
4. **Given** un profesor vinculado a materias de comisión, **When** ese profesor deja de existir en el
   padrón, **Then** las materias afectadas quedan sin vínculo (no se borran las comisiones ni las
   materias).

---

### User Story 2 - Explorar comisiones por año (Priority: P2)

Como estudiante que tiene que elegir en qué comisión anotarse, quiero ver las comisiones agrupadas por
año, y dentro de cada una las materias con su profesor y su horario, todo en una sola pantalla, para
decidir sin tener que cruzar a mano el horario con quién dicta cada materia.

**Why this priority**: Es el valor visible principal de la feature: una vista que hoy no existe y que
combina comisión + materias + profesores + horario. Depende del cruce de US1 para mostrar profesores
reales.

**Independent Test**: Se puede validar entrando a la vista de comisiones, viendo las comisiones
agrupadas por año, y comprobando que cada comisión lista sus materias con el profesor (vinculado o, en
su defecto, el apellido) y el horario (día, rango horario y aula).

**Acceptance Scenarios**:

1. **Given** existen comisiones cargadas, **When** el alumno abre la vista, **Then** ve las comisiones
   **agrupadas/segmentadas por año**.
2. **Given** una comisión, **When** el alumno la mira, **Then** ve la lista de sus materias y, por cada
   materia, el profesor (nombre si está vinculado; apellido de respaldo si no) y el horario (día,
   inicio–fin, aula).
3. **Given** una comisión con materias sin horario o sin profesor resuelto, **When** el alumno la
   mira, **Then** cada dato faltante se muestra con un estado "sin dato" sin romper la pantalla.
4. **Given** que no hay comisiones cargadas, **When** el alumno abre la vista, **Then** ve un estado
   vacío explicativo.

---

### User Story 3 - Score de calidad de la comisión (Priority: P3)

Como estudiante quiero ver un puntaje de calidad por comisión —el promedio de las valoraciones de sus
materias-profesor— para comparar comisiones de un vistazo y priorizar dónde anotarme.

> **Alcance (esta versión)**: el score se muestra en la UX con **dato MOCKEADO** (placeholder). El
> cálculo real —nota 1–5 derivada de las reseñas por materia-profesor de la planilla de UTNTAC— y su
> ingesta/modelo de datos se implementan en una **spec futura** (reviews de profesores). Aquí solo se
> deja el lugar, el formato (nota 1–5) y la interacción listos, alimentados por un valor simulado y
> claramente marcado como provisorio.

**Why this priority**: Es un diferenciador de UX, pero depende de datos de reviews que todavía no se
capturan. Se implementa la presentación ahora (mock) y el backend real después, sin bloquear US1/US2.

**Independent Test**: Se puede validar viendo que cada comisión muestra un score con formato 1–5 y que
la interfaz indica —o el equipo sabe por la spec— que es un valor provisorio/mock hasta la feature de
reviews.

**Acceptance Scenarios**:

1. **Given** la vista de comisiones, **When** el alumno mira una comisión, **Then** ve un score de la
   comisión en formato nota 1–5 (por ahora con dato mockeado).
2. **Given** que el score es provisorio, **When** se implemente la feature de reviews (spec futura),
   **Then** el mismo lugar de la UX se alimenta del cálculo real (promedio de las materias-profesor)
   sin rediseñar la vista.

---

### Edge Cases

- **Docente ambiguo**: dos o más profesores del padrón comparten apellido y dictan la misma materia →
  la materia queda sin vínculo (no se adivina) y muestra el apellido.
- **Docente sin padrón**: el apellido no está entre los profesores → sin vínculo, apellido de respaldo.
- **Materia sin horario / sin aula / sin modalidad** → estado "sin dato" por campo.
- **Comisión sin materias** o **directorio de comisiones vacío** → estados vacíos.
- **Profesor borrado** → las materias vinculadas quedan sin vínculo, sin borrar comisiones/materias.
- **Score sin base real** (siempre, en esta versión) → se muestra el valor mockeado; no se presenta
  como dato definitivo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST resolver, para cada materia de una comisión, el profesor real del padrón
  a partir del docente (apellido) y la materia, cuando la combinación identifique un único profesor.
- **FR-002**: El sistema MUST dejar sin vínculo las materias cuyo docente sea ambiguo o no figure en el
  padrón, conservando SIEMPRE el apellido/texto original como respaldo (no destructivo).
- **FR-003**: El vínculo materia-comisión→profesor MUST poder recalcularse (re-resolverse) y MUST
  admitir corrección manual posterior, sin perder el dato original ni las correcciones.
- **FR-004**: Si un profesor deja de existir, las materias vinculadas MUST quedar sin vínculo sin
  eliminar la comisión ni la materia.
- **FR-005**: El sistema MUST exponer, por comisión, sus materias con el profesor resuelto (o el
  apellido de respaldo) y el horario asociado.
- **FR-006**: La vista de comisiones MUST mostrar las comisiones **agrupadas/segmentadas por año**.
- **FR-007**: Por cada comisión, la vista MUST listar sus materias y, por materia, el profesor y el
  horario (día, hora de inicio y fin, aula).
- **FR-008**: La vista MUST manejar datos faltantes (profesor no resuelto, horario/aula ausente,
  comisión sin materias, sin comisiones) con estados vacíos claros por sección.
- **FR-009**: La vista MUST mostrar un **score de comisión** en formato nota 1–5. En esta versión el
  valor es **mockeado** (placeholder); el cálculo real queda fuera de alcance (spec futura).
- **FR-010**: La presentación del score MUST quedar preparada para alimentarse luego del cálculo real
  (promedio de las valoraciones materia-profesor) sin rediseñar la vista.
- **FR-011**: La vista MUST ser visualmente coherente con el resto del dashboard y MUST reutilizar los
  componentes de presentación existentes (tarjetas, avatares de profesor, formato de horario) en vez
  de duplicarlos; el código compartido MAY reacomodarse para hacerse reutilizable.
- **FR-012**: El profesor mostrado en la vista, cuando esté vinculado, MAY ofrecer acceso a su detalle
  (reutilizando el módulo de profesores existente).

### Key Entities *(include if feature involves data)*

- **Comisión**: agrupación real de cursado (ej. "1K01"), con su año. Contiene varias materias-cursada.
- **Materia de comisión (cursada)**: una materia dictada dentro de una comisión en un cuatrimestre.
  Tiene un docente (apellido, texto crudo) y, nuevo, un **vínculo opcional al profesor** del padrón.
- **Profesor**: docente del padrón (nombre, contacto), ya existente. Se relaciona con materias vía las
  cátedras y ahora también, resuelto, con las materias de comisión.
- **Horario**: bloque (día, inicio, fin, aula) de una materia de comisión, ya existente.
- **Score de comisión**: nota 1–5 que resume la calidad de la comisión (promedio de sus materias-
  profesor). En esta versión es un valor **mockeado**; su origen real (reviews) es una entidad de una
  spec futura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al menos la mayoría de las materias-comisión con docente identificable quedan vinculadas
  automáticamente a su profesor real (referencia medida hoy: ~79% de los pares materia-docente
  resuelven 1:1, 0 ambiguos), y ninguna resolución ambigua produce un vínculo incorrecto.
- **SC-002**: Desde una sola pantalla, el alumno ve —por comisión— todas sus materias con profesor y
  horario, sin tener que cruzar información entre pantallas.
- **SC-003**: Las comisiones se presentan agrupadas por año, permitiendo ubicar la comisión de un año
  puntual en pocos segundos.
- **SC-004**: El 100% de los datos faltantes (profesor no resuelto, horario/aula ausente, comisión sin
  materias, sin comisiones) se muestran con un estado claro, sin pantallas rotas.
- **SC-005**: Cada comisión muestra un score en formato 1–5; al llegar la feature de reviews, el
  cálculo real se enchufa sin cambiar la vista.
- **SC-006**: La vista se percibe consistente con el resto del dashboard y no duplica componentes de
  presentación ya existentes.

## Assumptions

- **El score es mockeado en esta versión** (decisión explícita del usuario). El cálculo real —nota 1–5
  derivada de las reseñas por materia-profesor de la planilla pública de UTNTAC (columnas de
  clasificación/puntaje/votos que hoy no se capturan)— se especifica e implementa en una **spec
  aparte**, junto con su modelo de datos e ingesta.
- La resolución docente→profesor se apoya en el cruce por **materia + apellido**: la materia acota los
  candidatos y el apellido desambigua; se deja sin vínculo lo ambiguo (no se fuerza).
- El dato de comisiones/cursadas/horarios ya existe (se cargó desde los Excel de la FRRO); esta feature
  no cambia esa fuente, solo agrega el vínculo al profesor y la vista.
- La vista de comisiones es una **pantalla nueva y dedicada**, separada del armador de horarios
  personal del alumno (que sigue como está), reutilizando componentes comunes.
- La identidad visual de referencia es la del dashboard actual (sistema "Kinetic Blueprint").
- La escala esperada es acotada (comisiones de una carrera por año), apta para render en el cliente.
