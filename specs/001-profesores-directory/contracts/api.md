# Contract — API consumida por la UI de Profesores

El frontend NO define endpoints; consume los que ya expone `backend/app/api/profesores.py`. Este
contrato documenta lo que la UI espera de cada uno. Fuente de verdad: los schemas en
`backend/app/schemas/profesor.py`.

## Lectura (Server Components, vía `lib/api.ts` → `request()`)

### GET /profesores
- **Respuesta 200**: `ProfesorListItem[]` (ver [data-model.md](../data-model.md)).
- **Uso UI**: listado + contadores + filtro client-side.
- **Cache**: revalidación corta (~30s); `router.refresh()` la invalida tras un sync.

### GET /profesores/{profesor_id}
- **Respuesta 200**: `ProfesorDetalleOut` (con `materias[]` y `horarios_consulta[]`).
- **404**: el profesor no existe → la UI muestra "profesor no encontrado" + volver al listado (FR-009).

## Mutaciones (islas cliente, vía proxy `/api/backend`, POST)

Estas acciones consultan fuentes externas: pueden **demorar** o devolver **502** si la fuente no
responde. La UI debe mostrar loading, y al terminar un resumen (éxito) o un error legible (fallo).

### POST /profesores/sincronizar-horarios
- **200**: `ResultadoSincHorarios`.
- **422**: el scraper no devolvió filas (cambió la página/el formato).
- **502**: no se pudo descargar el sitio del Dpto. ISI.

### POST /profesores/sincronizar-mails
- **200**: `ResultadoSincMails`.
- **502**: no se pudo descargar la sheet de UTNTAC.

### POST /profesores/sincronizar-catedras-utntac
- **200**: `ResultadoSincCatedras` (incluye `asignaturas_no_mapeadas`).
- **502**: no se pudo descargar la sheet de UTNTAC.

## Manejo de errores en la UI (todas las llamadas)

- Los helpers de `lib/api.ts` lanzan `ApiError { status, body }` en respuestas no-OK.
- Lectura fallida en el listado/detalle ⇒ estado de error de la pantalla (patrón de `materias/page.tsx`).
- Sync fallido ⇒ panel de error dentro del menú de sincronización, sin tumbar la pantalla (FR-014).

## Contrato UI (comportamiento observable, no endpoints)

- **Listado**: cada tarjeta expone nombre, email (o "sin email"), y 2 contadores; navega al detalle en
  1 click. Buscador filtra en vivo; estados vacíos para directorio vacío y para sin-resultados.
- **Detalle**: secciones Contacto / Materias que dicta / Horarios de consulta, cada una con su estado
  vacío. Materias sin enlace.
- **Sincronización**: acción secundaria/diferenciada; deshabilitada mientras corre; resumen con
  contadores + advertencias + errores + asignaturas no mapeadas; refresca contadores al terminar OK.
