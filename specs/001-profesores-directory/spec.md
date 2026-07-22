# Feature Specification: Directorio de Profesores (frontend)

**Feature Branch**: `001-profesores-directory`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Módulo Profesores en el frontend de UTNHub — listado con búsqueda, detalle de un profesor (materias que dicta + horarios de consulta, sin enlace a materias) y acciones de mantenimiento para sincronizar datos desde fuentes externas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar y explorar el directorio de profesores (Priority: P1)

Como estudiante de ISI quiero ver el listado de profesores y buscar por nombre o email, para
encontrar rápido a un docente en particular y darme una idea de cuánto dicta y si tiene horarios
de consulta, sin tener que recorrer sitios dispersos.

**Why this priority**: Es la puerta de entrada del módulo y el caso de uso más frecuente del alumno.
Por sí sola ya entrega valor: centraliza el padrón de profesores con información de un vistazo. Sin
esto, ninguna otra parte del módulo es accesible.

**Independent Test**: Se puede probar entrando al directorio de profesores, viendo la lista completa,
escribiendo texto en el buscador y comprobando que la lista se filtra por nombre/email; entrega valor
aunque el detalle y la sincronización todavía no existan.

**Acceptance Scenarios**:

1. **Given** existen profesores cargados, **When** el alumno abre el directorio, **Then** ve la lista
   de profesores, cada uno con su nombre, email y los contadores de cuántas materias dicta y cuántos
   horarios de consulta tiene.
2. **Given** el directorio está mostrando todos los profesores, **When** el alumno escribe parte de un
   nombre o de un email en el buscador, **Then** la lista se reduce a los profesores que coinciden, de
   forma inmediata y sin recargar la página.
3. **Given** el alumno escribió un texto que no coincide con ningún profesor, **When** no hay
   resultados, **Then** ve un estado vacío claro que indica que la búsqueda no arrojó resultados.
4. **Given** todavía no hay profesores cargados, **When** el alumno abre el directorio, **Then** ve un
   estado vacío que explica que aún no hay datos (en lugar de una pantalla en blanco).

---

### User Story 2 - Ver el detalle de un profesor (Priority: P2)

Como estudiante quiero abrir un profesor del listado y ver su información completa —cómo contactarlo,
qué materias dicta y sus horarios de consulta— para saber a quién escribirle y cuándo puedo ir a
consulta.

**Why this priority**: Es el valor profundo del módulo (el "para qué" de buscar un profesor), pero
depende de que exista primero el listado que lleva hasta él.

**Independent Test**: Se puede probar abriendo un profesor desde el listado y verificando que se
muestran sus datos de contacto, sus materias con cargo y año, y sus horarios de consulta con día,
rango horario, modalidad y aula.

**Acceptance Scenarios**:

1. **Given** el alumno está en el listado, **When** selecciona un profesor, **Then** navega a la
   pantalla de detalle de ese profesor.
2. **Given** un profesor tiene email, **When** el alumno ve el detalle, **Then** el email se presenta
   como medio de contacto directo (accionable para escribirle).
3. **Given** un profesor dicta materias, **When** el alumno ve el detalle, **Then** ve la lista de
   materias que dicta, cada una con su cargo y el año, presentadas solo como información (sin enlace
   navegable a otra sección).
4. **Given** un profesor tiene horarios de consulta, **When** el alumno ve el detalle, **Then** ve
   cada horario con día, hora de inicio y fin, modalidad y aula.
5. **Given** un profesor no tiene email, o no dicta materias, o no tiene horarios de consulta, **When**
   el alumno ve el detalle, **Then** cada sección faltante muestra un texto claro de "sin datos" en
   lugar de aparecer vacía o rota.
6. **Given** el alumno intenta abrir un profesor que no existe, **When** se carga el detalle, **Then**
   ve un mensaje de "profesor no encontrado" con una forma de volver al listado.

---

### User Story 3 - Sincronizar los datos de profesores (mantenimiento) (Priority: P3)

> **Alcance (esta versión)**: DIFERIDA. Las acciones de sincronización NO se muestran en la pantalla de
> directorio de profesores; se trasladan a un futuro **panel de administración**. La lógica ya está
> implementada (componente `SincronizarMenu` + funciones de API) y queda lista para montarse en el
> admin panel cuando exista. Los requisitos de abajo describen el comportamiento esperado allí.

Como responsable de mantenimiento del contenido quiero disparar la actualización de los datos de
profesores desde sus fuentes externas y ver un resumen de qué cambió, para mantener el directorio al
día sin tocar la base de datos a mano.

**Why this priority**: Mantiene la información fresca y confiable, pero no es parte del uso cotidiano
del alumno; el directorio funciona con los datos ya cargados aunque esta acción no se ejecute.

**Independent Test**: Se puede probar disparando cada una de las tres sincronizaciones y verificando
que la interfaz muestra el estado de carga, y al terminar un resumen del resultado (o un error
explicado si la fuente falla).

**Acceptance Scenarios**:

1. **Given** el responsable está en el directorio, **When** dispara una de las tres sincronizaciones
   (horarios de consulta / mails / cátedras), **Then** la interfaz indica que la actualización está en
   curso y evita disparos duplicados mientras corre.
2. **Given** una sincronización terminó con éxito, **When** se muestra el resultado, **Then** el
   responsable ve un resumen con los contadores relevantes (creados, actualizados, ya existentes),
   las advertencias, los errores y —cuando aplica— las asignaturas que no pudieron mapearse al plan.
3. **Given** una sincronización terminó con éxito y modificó datos, **When** vuelve el resultado,
   **Then** los contadores del listado de profesores reflejan la información actualizada.
4. **Given** la fuente externa no responde o falla, **When** la sincronización no puede completarse,
   **Then** el responsable ve un mensaje de error claro y la pantalla sigue utilizable (no queda
   colgada ni rota).
5. **Given** el alumno común usa el directorio, **When** navega la pantalla, **Then** las acciones de
   mantenimiento se presentan de forma diferenciada/secundaria y no interfieren con la búsqueda ni la
   consulta.

---

### Edge Cases

- **Directorio vacío**: no hay ningún profesor cargado → estado vacío explicativo.
- **Búsqueda sin coincidencias**: el texto ingresado no matchea ningún profesor → estado "sin
  resultados" diferenciado del directorio vacío.
- **Datos parciales de un profesor**: falta email, cargo, año, modalidad o aula → se muestra un texto
  de "sin dato" por campo, sin romper el layout.
- **Profesor sin materias o sin horarios**: cada sección muestra su propio estado vacío.
- **Profesor inexistente**: acceso directo al detalle de un id que no existe → mensaje "no encontrado"
  + volver al listado.
- **Sincronización lenta**: la fuente externa demora → se mantiene el estado de carga; el usuario no
  puede re-disparar la misma acción hasta que termine.
- **Sincronización fallida**: la fuente externa está caída o cambió de formato → error claro,
  sin pérdida del estado de la pantalla.
- **Sincronización parcial**: hay asignaturas que no mapean al plan o advertencias no bloqueantes → se
  reportan explícitamente en el resumen sin considerarse un fallo total.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar un listado de todos los profesores, cada uno con su nombre, su
  email y dos contadores: cantidad de materias que dicta y cantidad de horarios de consulta.
- **FR-002**: El sistema MUST permitir buscar/filtrar el listado por nombre o email, actualizando los
  resultados de forma inmediata a medida que el usuario escribe.
- **FR-003**: El sistema MUST mostrar un estado vacío diferenciado para (a) el directorio sin
  profesores cargados y (b) una búsqueda sin coincidencias.
- **FR-004**: Los usuarios MUST poder abrir el detalle de un profesor desde el listado.
- **FR-005**: El detalle MUST mostrar los datos de contacto del profesor, presentando el email como
  medio de contacto directo cuando exista.
- **FR-006**: El detalle MUST listar las materias que dicta el profesor, cada una con su cargo y el
  año correspondiente.
- **FR-007**: El detalle MUST listar los horarios de consulta del profesor, cada uno con día, hora de
  inicio, hora de fin, modalidad y aula.
- **FR-008**: Las materias mostradas en el detalle MUST presentarse únicamente como información, SIN
  enlace navegable hacia el módulo de materias (explícitamente fuera de alcance en esta versión).
- **FR-009**: El sistema MUST manejar el acceso al detalle de un profesor inexistente mostrando un
  mensaje claro de "no encontrado" y una forma de volver al listado.
- **FR-010**: El sistema MUST manejar datos faltantes de un profesor (sin email, sin materias, sin
  horarios, o campos individuales incompletos) mostrando textos de "sin dato"/estado vacío por sección
  en lugar de espacios en blanco o errores.
- **FR-011**: El sistema MUST permitir a un usuario de mantenimiento disparar tres sincronizaciones de
  datos independientes: (1) horarios de consulta desde el sitio del Departamento de ISI, (2) mails de
  docentes desde la planilla pública de UTNTAC, y (3) cátedras (asociación profesor–materia) desde la
  planilla pública de UTNTAC.
- **FR-012**: Mientras una sincronización está en curso, el sistema MUST comunicar el estado de carga
  e impedir disparos duplicados de la misma acción.
- **FR-013**: Al finalizar una sincronización, el sistema MUST mostrar un resumen del resultado con
  los contadores correspondientes (creados / actualizados / ya existentes), las advertencias, los
  errores y las asignaturas no mapeadas cuando apliquen.
- **FR-014**: Si una sincronización falla porque la fuente externa no responde o cambió, el sistema
  MUST mostrar un mensaje de error comprensible y mantener la pantalla utilizable.
- **FR-015**: Cuando una sincronización exitosa modifica datos, el sistema MUST reflejar la
  información actualizada en los contadores del listado sin requerir que el usuario recargue
  manualmente.
- **FR-016**: Las pantallas del módulo MUST ser visualmente coherentes con el resto del dashboard de
  UTNHub.
- **FR-017**: Las acciones de mantenimiento (sincronización) NO se muestran en la pantalla de directorio
  de profesores (para el alumno); se reservan para un futuro panel de administración. FR-011..FR-016
  aplican en el contexto de ese panel, no en el directorio.
- **FR-018**: El listado MUST paginarse para no renderizar todos los profesores a la vez (con cientos
  de docentes, mostrarlos todos juntos degrada la experiencia). La paginación MUST mostrar una porción
  por página con controles de navegación (anterior/siguiente + página actual/total) y un indicador del
  rango mostrado sobre el total. El buscador MUST seguir operando sobre el conjunto completo y, al
  cambiar la búsqueda, la vista MUST volver a la primera página.

### Key Entities *(include if feature involves data)*

- **Profesor**: docente del padrón. Atributos visibles: nombre, email (contacto), cantidad de materias
  que dicta, cantidad de horarios de consulta. Es la entidad central del listado y del detalle.
- **Cátedra (materia que dicta)**: asociación entre un profesor y una materia. Atributos visibles:
  nombre de la materia, cargo del profesor en ella y año.
- **Horario de consulta**: franja de atención de un profesor. Atributos visibles: día, hora de inicio,
  hora de fin, modalidad y aula.
- **Resultado de sincronización**: resumen de una actualización de datos. Atributos visibles:
  contadores (creados / actualizados / ya existentes según la fuente), lista de advertencias, lista de
  errores y lista de asignaturas no mapeadas al plan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un alumno que conoce el nombre (o parte) de un profesor lo localiza en el listado en
  menos de 10 segundos y en no más de 3 interacciones.
- **SC-002**: Desde el listado, el alumno accede al detalle completo de un profesor en un solo paso
  (una selección).
- **SC-003**: El filtrado del listado se percibe instantáneo (resultados actualizados en menos de 1
  segundo) y sin recarga de página.
- **SC-004**: El 100% de las sincronizaciones disparadas terminan mostrando un desenlace explícito
  —resumen de éxito o error explicado—, sin quedar nunca sin feedback.
- **SC-005**: El 100% de los estados sin datos están cubiertos con un mensaje claro: directorio vacío,
  búsqueda sin resultados, profesor sin email/materias/horarios y profesor inexistente.
- **SC-006**: En una revisión visual, la pantalla se percibe consistente con el resto del dashboard
  (misma identidad visual), sin elementos que rompan el estilo general.
- **SC-007**: El listado nunca renderiza más de una página de profesores por vez (porción acotada),
  manteniendo la navegación fluida independientemente de la cantidad total de docentes.

## Assumptions

- Los datos de profesores, sus cátedras y sus horarios de consulta ya están disponibles para consulta
  desde el backend existente; esta feature es la capa de presentación que los expone al alumno.
- Las acciones de sincronización (mantenimiento) se sacan de la pantalla de directorio y se reservan
  para un futuro panel de administración; su lógica ya está construida (`SincronizarMenu` + API) y solo
  resta montarla allí. El control de acceso por rol también queda para ese panel (versión futura).
- La escala esperada es del orden de cientos de profesores (padrón de una facultad), no de millones;
  por eso el filtrado del lado del cliente sobre la lista completa es aceptable.
- Un profesor puede tener campos incompletos (sin email, sin cargo, sin aula, sin modalidad); la
  interfaz debe tolerarlo.
- El enlace navegable desde las materias del detalle hacia el módulo de materias queda explícitamente
  fuera de alcance en esta versión (posible mejora futura).
- La identidad visual de referencia es la del dashboard actual de UTNHub (misma paleta, tipografías y
  componentes ya usados en las otras secciones).
