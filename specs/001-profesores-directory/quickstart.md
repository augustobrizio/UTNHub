# Quickstart — Validar el Directorio de Profesores

Guía para levantar y validar la feature end-to-end. No incluye código de implementación (eso va en
`tasks.md` y la fase de implementación).

## Prerrequisitos

- `backend/.env` con `DATABASE_URL` (Neon) configurado.
- Datos de profesores cargados en la DB (o ejecutar una sincronización desde la UI para poblarlos).

## Levantar el entorno

```bash
# Backend (Docker) → http://localhost:8000
docker compose up

# Frontend (host) → http://localhost:3000
cd frontend && npm run dev      # si el repo usa pnpm: pnpm dev
```

## Chequeo estático

```bash
cd frontend && npm run lint     # o: pnpm lint
```

## Escenarios de validación (mapeados a las user stories)

### US1 — Listado + búsqueda (P1)
1. Ir a `http://localhost:3000/profesores`.
2. **Esperado**: grid de profesores; cada tarjeta con nombre, email y 2 contadores (materias /
   horarios de consulta).
3. Escribir parte de un nombre o email en el buscador → la lista se filtra en vivo, sin recargar.
4. Escribir un texto sin coincidencias → estado "sin resultados".
5. (Con DB vacía) → estado "directorio vacío" explicativo.

### US2 — Detalle (P2)
1. Click en una tarjeta → navega a `/profesores/{id}`.
2. **Esperado**: datos de contacto (email accionable), materias que dicta (con cargo y año, **sin**
   enlace), y horarios de consulta (día, `HH:MM`–`HH:MM`, modalidad, aula).
3. Abrir un profesor sin email / sin materias / sin horarios → cada sección muestra su "sin dato".
4. Navegar a `/profesores/999999` (id inexistente) → mensaje "profesor no encontrado" + volver.

### US3 — Sincronización (P3)
1. En el listado, abrir el menú de sincronización (acción secundaria).
2. Disparar "mails" (la más rápida) → se ve estado de carga; no se puede re-disparar mientras corre.
3. Al terminar → resumen con contadores (creados / actualizados / ya existentes), advertencias y
   errores; y las asignaturas no mapeadas en el caso de "cátedras".
4. Los contadores del listado reflejan los cambios (refresh automático).
5. Con el backend apagado o la fuente caída → mensaje de error legible, la pantalla sigue usable.

## Criterios de aceptación cubiertos

- Listado + filtro + estados vacíos → FR-001..FR-003, SC-001/003/005.
- Detalle + estados por sección + 404 → FR-004..FR-010, SC-002/005.
- Sincronización + loading/resumen/error + refresh → FR-011..FR-015, SC-004.
- Coherencia visual con el dashboard → FR-016/017, SC-006.
