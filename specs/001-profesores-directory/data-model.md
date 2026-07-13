# Phase 1 — Data Model (vista): Directorio de Profesores

Entidades tal como las consume el frontend. Son la proyección de lectura de
`backend/app/schemas/profesor.py`; el frontend no define modelos propios ni persiste estado. Estos
tipos se agregan a `frontend/src/lib/types.ts` (espejo 1:1 de los schemas).

## ProfesorListItem  (item del listado)

| Campo | Tipo (TS) | Notas |
|-------|-----------|-------|
| `id` | `number` | identificador del profesor |
| `nombre` | `string \| null` | puede faltar |
| `email` | `string \| null` | contacto; puede faltar |
| `cantidad_materias` | `number` | contador (default 0) |
| `cantidad_horarios` | `number` | contador de horarios de consulta (default 0) |

- **Origen**: `GET /profesores`.
- **Uso**: grid del listado + filtrado client-side por `nombre`/`email`.

## ProfesorDetalleOut  (detalle)

| Campo | Tipo (TS) | Notas |
|-------|-----------|-------|
| `id` | `number` | |
| `nombre` | `string \| null` | |
| `email` | `string \| null` | contacto directo (mailto) si existe |
| `materias` | `MateriaProfesorOut[]` | materias que dicta (default `[]`) |
| `horarios_consulta` | `HorarioConsultaOut[]` | default `[]` |

- **Origen**: `GET /profesores/{id}` (404 si no existe).

## MateriaProfesorOut  (cátedra: materia que dicta)

| Campo | Tipo (TS) | Notas |
|-------|-----------|-------|
| `materia_codigo` | `string` | código de plan |
| `materia_nombre` | `string \| null` | fallback a `materia_codigo` si falta |
| `cargo` | `string \| null` | p.ej. "Titular", "JTP" |
| `anio` | `number \| null` | año de la cátedra |

- **Presentación**: solo informativa, **sin enlace** (FR-008).

## HorarioConsultaOut  (horario de consulta)

| Campo | Tipo (TS) | Notas |
|-------|-----------|-------|
| `id` | `number` | |
| `profesor_id` | `number` | |
| `dia` | `string \| null` | p.ej. "Lunes" |
| `hora_inicio` | `string \| null` | `"HH:MM:SS"` → mostrar `"HH:MM"` |
| `hora_fin` | `string \| null` | `"HH:MM:SS"` → mostrar `"HH:MM"` |
| `modalidad` | `string \| null` | p.ej. "Presencial", "Virtual" |
| `aula` | `string \| null` | |

## ResultadoSincHorarios  (POST /profesores/sincronizar-horarios)

| Campo | Tipo (TS) |
|-------|-----------|
| `profesores_tocados` | `number` |
| `horarios_borrados` | `number` |
| `horarios_creados` | `number` |
| `materia_profesor_borrados` | `number` |
| `materia_profesor_creados` | `number` |
| `advertencias` | `string[]` |
| `errores` | `string[]` |

## ResultadoSincMails  (POST /profesores/sincronizar-mails)

| Campo | Tipo (TS) |
|-------|-----------|
| `filas_procesadas` | `number` |
| `emails_seteados` | `number` |
| `emails_ya_existentes` | `number` |
| `profesores_creados` | `number` |
| `advertencias` | `string[]` |
| `errores` | `string[]` |

## ResultadoSincCatedras  (POST /profesores/sincronizar-catedras-utntac)

| Campo | Tipo (TS) |
|-------|-----------|
| `filas_procesadas` | `number` |
| `profesores_creados` | `number` |
| `materia_profesor_creados` | `number` |
| `materia_profesor_ya_existentes` | `number` |
| `asignaturas_no_mapeadas` | `string[]` |
| `errores` | `string[]` |

## Relaciones

```
ProfesorListItem (N)  ── listado ──►  ProfesorDetalleOut (1)   [vía id]
ProfesorDetalleOut (1) ─── tiene ───► MateriaProfesorOut (N)
ProfesorDetalleOut (1) ─── tiene ───► HorarioConsultaOut (N)
SincronizarMenu ── dispara ──► ResultadoSinc{Horarios|Mails|Catedras} (resumen efímero)
```

## Reglas de presentación (derivadas de requisitos)

- Cualquier `string | null` que sea `null`/vacío ⇒ texto "sin dato"/estado vacío por sección (FR-010).
- `materia_nombre` ausente ⇒ mostrar `materia_codigo`.
- Horas ⇒ recortar segundos; si `hora_inicio`/`hora_fin` es `null`, no romper el layout.
- Filtro del listado: match case-insensitive sobre `nombre` + `email`.
