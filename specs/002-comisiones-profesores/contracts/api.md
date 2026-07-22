# Contract — API de Comisiones con Profesores

## Nuevo endpoint (lectura)

### GET /comisiones/con-profesores
Query params:
- `anio` (opcional): filtra por año de comisión. Si se omite, devuelve todas.

Respuesta 200: `ComisionOut[]` (ver [data-model.md](../data-model.md)):
```jsonc
[
  {
    "id": 12,
    "nombre": "3K01",
    "anio": 3,
    "cursadas": [
      {
        "id": 812,
        "materia_codigo": "E03",
        "materia_nombre": "…",
        "cuatrimestre": 1,
        "docente": "Ascolani",                 // apellido crudo (fallback)
        "profesor": { "id": 1480, "nombre": "ASCOLANI, Federico" }, // null si no resolvió
        "horarios": [
          { "dia": "Lunes", "hora_inicio": "18:00:00", "hora_fin": "22:00:00", "aula": "204" }
        ]
      }
    ]
  }
]
```
- **Uso UI**: la vista agrupa por `anio` (client-side), muestra cada comisión con sus materias
  (profesor vinculado o `docente` fallback) + horario, y un **score mockeado** (no viene del API).
- **Cache**: revalidación corta (~30s).

## Operación de mantenimiento (matcher)

La resolución `docente → profesor` corre como paso de backfill (script/servicio), no como endpoint
del hot path en esta versión. Idempotente y no destructivo (solo completa `profesor_id` NULL).
*(Puede exponerse como acción del futuro panel de admin, junto con las sincronizaciones.)*

## Contrato UI (comportamiento observable)

- **/comisiones**: comisiones agrupadas por año; cada comisión → sus materias, y por materia el
  profesor (nombre si `profesor` != null; si no, el `docente`) + horario (`HH:MM`–`HH:MM`, aula).
- **Score**: badge/nota 1–5 por comisión, **marcado como provisorio/mock** en esta versión.
- **Estados**: sin comisiones, comisión sin materias, materia sin horario/aula, profesor no resuelto →
  cada uno con estado vacío claro. Error de carga → estado de error de pantalla (patrón de 001).
- **Profesor vinculado**: puede enlazar a su detalle (`/profesores/{id}`) reutilizando el módulo 001.

## Manejo de errores
- Helpers de `lib/api.ts` lanzan `ApiError { status, body }`; la página maneja el error como en 001.
