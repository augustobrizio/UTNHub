"""Catálogo de imágenes genéricas (placeholders) para novedades sin imagen propia.

Los archivos viven en el frontend (``public/novedades/placeholder/``) y se
sirven desde ahí. Acá definimos solo el catálogo que:

1. se le muestra al clasificador IA para que elija la más apropiada, y
2. usa el service para deduplicar placeholders dentro de la portada (si una
   genérica ya la tiene otra novedad visible, se rota a la siguiente).

El orden importa: las variantes parecidas van adyacentes, así la rotación de
dedup cae en una imagen similar. Las genéricas institucionales van al final y
son el fallback cuando ninguna encaja.
"""
from __future__ import annotations

# Ruta pública (en el frontend) donde se sirven los archivos.
PLACEHOLDER_URL_PREFIX = "/novedades/placeholder/"

# (archivo, descripción de cuándo usarlo) — el orden define la rotación de dedup.
PLACEHOLDERS: list[tuple[str, str]] = [
    ("utn-paro-universitario.jpg", "Paro, medida de fuerza o reclamo universitario."),
    ("utn-paro-universitario-2.webp", "Paro o medida de fuerza (variante)."),
    ("fagdut-utn.png", "Paro o comunicado del gremio docente FAGDUT."),
    ("utn-sidut.jpg", "Paro o comunicado del gremio docente SIDUT."),
    ("utn-idiomas.jpg", "Cursos de idiomas."),
    ("utn-area-ingreso.jpg", "Ingreso, preinscripción o seminario de ingreso."),
    ("frro-alumnos.webp", "Estudiantes: charlas, jornadas, eventos, becas, tutorías, cursos."),
    ("frro-alumnos-2.jpg", "Estudiantes en general (variante)."),
    ("utn-frro-generica.jpg", "Genérica institucional (cuando ninguna otra encaja)."),
    ("utrnfrro.jpg", "Genérica institucional (variante)."),
]

NOMBRES: list[str] = [nombre for nombre, _ in PLACEHOLDERS]

# Índice desde donde arranca la rotación cuando no hay una elección semántica
# (ninguna sugerencia del LLM): las genéricas institucionales.
INDICE_GENERICA: int = NOMBRES.index("utn-frro-generica.jpg")


def es_placeholder(url: str | None) -> bool:
    """True si la URL apunta a un placeholder nuestro (no una imagen real)."""
    return bool(url) and url.startswith(PLACEHOLDER_URL_PREFIX)


def path_de(nombre: str) -> str:
    """Nombre de archivo -> ruta pública."""
    return f"{PLACEHOLDER_URL_PREFIX}{nombre}"


def nombre_de(url: str | None) -> str | None:
    """Ruta pública -> nombre de archivo (o None si no es un placeholder)."""
    if not es_placeholder(url):
        return None
    return url[len(PLACEHOLDER_URL_PREFIX) :]


def catalogo_para_prompt() -> str:
    """Lista formateada del catálogo para inyectar en el prompt del clasificador."""
    return "\n".join(f"- {nombre}: {desc}" for nombre, desc in PLACEHOLDERS)
