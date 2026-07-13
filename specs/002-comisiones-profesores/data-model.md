# Phase 1 — Data Model: Comisiones con Profesores

## Cambio de schema (backend)

### `cursada` — columna nueva
| Campo | Tipo | Nota |
|-------|------|------|
| `profesor_id` | `int NULL`, FK → `profesor.id` `ON DELETE SET NULL`, **index** | vínculo resuelto |
| `docente` | `text NULL` (**existente, se conserva**) | apellido crudo, fallback/provenance |

Modelo SQLAlchemy (`academico.py`, en `Cursada`):
```python
profesor_id: Mapped[int | None] = mapped_column(
    Integer, ForeignKey("profesor.id", ondelete="SET NULL"), nullable=True, index=True
)
profesor: Mapped["Profesor | None"] = relationship()
```

Migración Alembic (`down_revision = "c1d2e3f4a5b6"`, head actual):
```python
op.add_column("cursada", sa.Column("profesor_id", sa.Integer(), nullable=True))
op.create_index("ix_cursada_profesor_id", "cursada", ["profesor_id"])
op.create_foreign_key("fk_cursada_profesor", "cursada", "profesor",
                      ["profesor_id"], ["id"], ondelete="SET NULL")
# downgrade: drop_constraint / drop_index / drop_column
```

## Regla de negocio: resolución docente → profesor

Entrada: `cursada(materia_codigo, docente)`; universo: `materia_profesor(materia_codigo, profesor_id)`
+ `profesor(id, nombre)`.

```
apellido(docente)  = primer token antes de coma/espacio, normalizado (lower, sin acentos)
candidatos         = profesores P tal que existe materia_profesor(materia_codigo, P.id)
                     Y apellido(P.nombre) == apellido(docente)
resolver:
  len(candidatos) == 1  -> cursada.profesor_id = candidatos[0].id
  len(candidatos) != 1  -> cursada.profesor_id = NULL   (ambiguo o sin match)
```
- Idempotente y no destructivo: solo setea cuando `profesor_id IS NULL`.

## Schemas de salida (API)

### `ProfesorMiniOut` (nuevo)
| Campo | Tipo |
|-------|------|
| `id` | `int` |
| `nombre` | `string \| null` |

### `CursadaOut` (extendido)
Se agrega `profesor: ProfesorMiniOut | null` (resuelto) — se conserva `docente`.
| Campo | Tipo | Nota |
|-------|------|------|
| `id` | int | |
| `materia_codigo` | string | |
| `materia_nombre` | string? | |
| `cuatrimestre` | int? | |
| `docente` | string? | apellido crudo (fallback) |
| `profesor` | `ProfesorMiniOut \| null` | **nuevo**: vínculo resuelto |
| `horarios` | `HorarioOut[]` | día, inicio, fin, aula |

### `ComisionOut` (reusado)
`{ id, nombre, anio, cursadas: CursadaOut[] }` — la respuesta de la vista es `ComisionOut[]`.

## Entidad de presentación (frontend, no persistida)

### Score de comisión (MOCK)
- No existe en el API. El frontend calcula un placeholder **determinístico** por comisión:
  `mockScore(comisionId) -> 1.0..5.0`. Marcado visualmente como provisorio.
- Cuando llegue la spec de reviews, `ComisionOut` gana `score: number | null` real y el mock se elimina.

## Relaciones (resultantes)

```
Comision (1) ──< Cursada (N) ──< Horario (N)
                    │  └── materia_codigo → Materia
                    └── profesor_id ─(nullable)→ Profesor   [NUEVO]
Profesor (1) ──< MateriaProfesor (N) ── materia_codigo   (fuente del matcher)
```
