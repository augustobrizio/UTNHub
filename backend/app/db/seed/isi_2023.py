"""Datos del plan de estudios ISI 2023 (UTN FRRO).

Fuente: ``isi-a4-plan-2023-gradiente-utn-frro.pdf`` (Centro de Estudiantes
Gradiente). Esto es la traducción literal de la grilla del PDF a estructuras
Python. El seed (`scripts/seed_isi_2023.py`) levanta este módulo y hace UPSERT
contra Neon.

Convenciones de códigos:
- Troncales: ``"1"``…``"36"`` y ``"ADUSI"`` (literal del PDF).
- Electivas: ``"E01"``…``"E19"`` siguiendo el orden del PDF.

Reglas especiales:
- Proyecto Final (``"36"``) tiene correlativas para CURSAR (las que cargamos).
  Su regla "todas las troncales aprobadas para RENDIR" la aplica el service,
  no se carga en la tabla.
"""
from __future__ import annotations

from typing import TypedDict


class MateriaSpec(TypedDict, total=False):
    codigo: str
    nombre: str
    anio_carrera: int | None
    cuatrimestre: int | None  # 1 o 2 si cuatrimestral con cuatri fijo, None si no
    horas: int
    tipo: str  # "troncal" | "electiva"
    regulares: list[str]
    aprobadas: list[str]


# ---------------------------------------------------------------------------
# Troncales
# ---------------------------------------------------------------------------
TRONCALES: list[MateriaSpec] = [
    # 1er nivel
    {"codigo": "1", "nombre": "Análisis Matemático I", "anio_carrera": 1, "cuatrimestre": None, "horas": 5, "tipo": "troncal", "regulares": [], "aprobadas": []},
    {"codigo": "2", "nombre": "Álgebra y Geometría Analítica", "anio_carrera": 1, "cuatrimestre": None, "horas": 5, "tipo": "troncal", "regulares": [], "aprobadas": []},
    {"codigo": "3", "nombre": "Física I", "anio_carrera": 1, "cuatrimestre": None, "horas": 5, "tipo": "troncal", "regulares": [], "aprobadas": []},
    {"codigo": "4", "nombre": "Inglés I", "anio_carrera": 1, "cuatrimestre": None, "horas": 2, "tipo": "troncal", "regulares": [], "aprobadas": []},
    {"codigo": "5", "nombre": "Lógica y Estructuras Discretas", "anio_carrera": 1, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": [], "aprobadas": []},
    {"codigo": "6", "nombre": "Algoritmos y Estructuras de Datos", "anio_carrera": 1, "cuatrimestre": None, "horas": 5, "tipo": "troncal", "regulares": [], "aprobadas": []},
    {"codigo": "7", "nombre": "Arquitectura de Computadoras", "anio_carrera": 1, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": [], "aprobadas": []},
    {"codigo": "8", "nombre": "Sistemas y Procesos de Negocio", "anio_carrera": 1, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": [], "aprobadas": []},

    # 2do nivel
    {"codigo": "9", "nombre": "Análisis Matemático II", "anio_carrera": 2, "cuatrimestre": None, "horas": 5, "tipo": "troncal", "regulares": ["1", "2"], "aprobadas": []},
    {"codigo": "10", "nombre": "Física II", "anio_carrera": 2, "cuatrimestre": None, "horas": 5, "tipo": "troncal", "regulares": ["1", "3"], "aprobadas": []},
    {"codigo": "11", "nombre": "Ingeniería y Sociedad", "anio_carrera": 2, "cuatrimestre": None, "horas": 2, "tipo": "troncal", "regulares": [], "aprobadas": []},
    {"codigo": "12", "nombre": "Inglés II", "anio_carrera": 2, "cuatrimestre": None, "horas": 2, "tipo": "troncal", "regulares": ["4"], "aprobadas": []},
    {"codigo": "13", "nombre": "Sintaxis y Semántica de los Lenguajes", "anio_carrera": 2, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["5", "6"], "aprobadas": []},
    {"codigo": "14", "nombre": "Paradigmas de Programación", "anio_carrera": 2, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["5", "6"], "aprobadas": []},
    {"codigo": "15", "nombre": "Sistemas Operativos", "anio_carrera": 2, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["7"], "aprobadas": []},
    {"codigo": "16", "nombre": "Análisis de Sistemas de Información", "anio_carrera": 2, "cuatrimestre": None, "horas": 6, "tipo": "troncal", "regulares": ["6", "8"], "aprobadas": []},

    # 3er nivel
    {"codigo": "17", "nombre": "Probabilidad y Estadística", "anio_carrera": 3, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["1", "2"], "aprobadas": []},
    {"codigo": "18", "nombre": "Economía", "anio_carrera": 3, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": [], "aprobadas": ["1", "2"]},
    {"codigo": "19", "nombre": "Base de Datos", "anio_carrera": 3, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["13", "16"], "aprobadas": ["5", "6"]},
    {"codigo": "20", "nombre": "Desarrollo de Software", "anio_carrera": 3, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["14", "16"], "aprobadas": ["5", "6"]},
    {"codigo": "21", "nombre": "Comunicación de Datos", "anio_carrera": 3, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": [], "aprobadas": ["3", "7"]},
    {"codigo": "22", "nombre": "Análisis Numérico", "anio_carrera": 3, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["9"], "aprobadas": ["1", "2"]},
    {"codigo": "23", "nombre": "Diseño de Sistemas de Información", "anio_carrera": 3, "cuatrimestre": None, "horas": 6, "tipo": "troncal", "regulares": ["14", "16"], "aprobadas": ["4", "6", "8"]},
    {"codigo": "ADUSI", "nombre": "Seminario Integrador (ADUSI)", "anio_carrera": 3, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["16"], "aprobadas": ["6", "8", "13", "14"]},

    # 4to nivel
    {"codigo": "24", "nombre": "Legislación", "anio_carrera": 4, "cuatrimestre": None, "horas": 2, "tipo": "troncal", "regulares": ["11"], "aprobadas": []},
    {"codigo": "25", "nombre": "Ingeniería y Calidad de Software", "anio_carrera": 4, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["19", "20", "23"], "aprobadas": ["13", "14"]},
    {"codigo": "26", "nombre": "Redes de Datos", "anio_carrera": 4, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["15", "21"], "aprobadas": []},
    {"codigo": "27", "nombre": "Investigación Operativa", "anio_carrera": 4, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["17", "22"], "aprobadas": []},
    {"codigo": "28", "nombre": "Simulación", "anio_carrera": 4, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["17"], "aprobadas": ["9"]},
    {"codigo": "29", "nombre": "Tecnologías para la Automatización", "anio_carrera": 4, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["10", "22"], "aprobadas": ["9"]},
    {"codigo": "30", "nombre": "Administración de Sistemas de Información", "anio_carrera": 4, "cuatrimestre": None, "horas": 6, "tipo": "troncal", "regulares": ["18", "23"], "aprobadas": ["16"]},

    # 5to nivel
    {"codigo": "31", "nombre": "Inteligencia Artificial", "anio_carrera": 5, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["28"], "aprobadas": ["17", "22"]},
    {"codigo": "32", "nombre": "Ciencia de Datos", "anio_carrera": 5, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["28"], "aprobadas": ["17", "19"]},
    {"codigo": "33", "nombre": "Sistemas de Gestión", "anio_carrera": 5, "cuatrimestre": None, "horas": 4, "tipo": "troncal", "regulares": ["18", "27"], "aprobadas": ["23"]},
    {"codigo": "34", "nombre": "Gestión Gerencial", "anio_carrera": 5, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["24", "30"], "aprobadas": ["18"]},
    {"codigo": "35", "nombre": "Seguridad en los Sistemas de Información", "anio_carrera": 5, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["26", "30"], "aprobadas": ["20", "21"]},
    # Proyecto Final: regla "para rendir = todas" la aplica el service.
    # Acá sólo cargamos las correlativas para CURSAR.
    {"codigo": "36", "nombre": "Proyecto Final", "anio_carrera": 5, "cuatrimestre": None, "horas": 3, "tipo": "troncal", "regulares": ["25", "26", "30"], "aprobadas": ["12", "20", "23"]},
]


# ---------------------------------------------------------------------------
# Electivas
# ---------------------------------------------------------------------------
# cuatrimestre: 1 si X solo en 1erC, 2 si X solo en 2doC, None si ambos o anual.
ELECTIVAS: list[MateriaSpec] = [
    # Año 2
    {"codigo": "E01", "nombre": "Entornos Gráficos", "anio_carrera": 2, "cuatrimestre": 1, "horas": 4, "tipo": "electiva", "regulares": ["5"], "aprobadas": ["6", "8"]},
    {"codigo": "E02", "nombre": "Análisis y Diseño de Datos e Información", "anio_carrera": 2, "cuatrimestre": None, "horas": 3, "tipo": "electiva", "regulares": ["8", "13"], "aprobadas": ["6"]},
    {"codigo": "E03", "nombre": "Sistemas de Información Geográfica", "anio_carrera": 2, "cuatrimestre": 2, "horas": 3, "tipo": "electiva", "regulares": ["1", "6"], "aprobadas": ["2"]},
    {"codigo": "E04", "nombre": "Formación de Emprendedores", "anio_carrera": 2, "cuatrimestre": None, "horas": 4, "tipo": "electiva", "regulares": [], "aprobadas": ["2"]},

    # Año 3
    {"codigo": "E05", "nombre": "Algoritmos Genéticos", "anio_carrera": 3, "cuatrimestre": None, "horas": 4, "tipo": "electiva", "regulares": ["13", "14"], "aprobadas": ["5", "6", "7", "8"]},
    {"codigo": "E06", "nombre": "Informática Jurídica", "anio_carrera": 3, "cuatrimestre": None, "horas": 3, "tipo": "electiva", "regulares": ["15"], "aprobadas": ["6", "7", "8"]},
    {"codigo": "E07", "nombre": "Lenguaje de Programación JAVA", "anio_carrera": 3, "cuatrimestre": None, "horas": 4, "tipo": "electiva", "regulares": [], "aprobadas": ["14"]},
    {"codigo": "E08", "nombre": "Tecnologías de Desarrollo de Software IDE", "anio_carrera": 3, "cuatrimestre": None, "horas": 4, "tipo": "electiva", "regulares": [], "aprobadas": ["5", "13", "14"]},
    {"codigo": "E09", "nombre": "Gestión Ingenieril", "anio_carrera": 3, "cuatrimestre": 1, "horas": 4, "tipo": "electiva", "regulares": [], "aprobadas": ["8"]},
    {"codigo": "E10", "nombre": "Introducción a la Práctica Profesional", "anio_carrera": 3, "cuatrimestre": None, "horas": 4, "tipo": "electiva", "regulares": [], "aprobadas": ["16"]},
    {"codigo": "E11", "nombre": "Química Aplicada a la Informática", "anio_carrera": 3, "cuatrimestre": 1, "horas": 4, "tipo": "electiva", "regulares": ["4", "5", "6", "7", "8"], "aprobadas": ["1", "2", "3"]},

    # Año 4
    {"codigo": "E12", "nombre": "Infraestructura Tecnológica", "anio_carrera": 4, "cuatrimestre": 2, "horas": 4, "tipo": "electiva", "regulares": ["16"], "aprobadas": ["15"]},
    {"codigo": "E13", "nombre": "Soporte a las Bases de Datos con Programación Visual", "anio_carrera": 4, "cuatrimestre": None, "horas": 4, "tipo": "electiva", "regulares": ["19"], "aprobadas": ["13", "14"]},
    {"codigo": "E14", "nombre": "Metodología de la Investigación", "anio_carrera": 4, "cuatrimestre": 1, "horas": 4, "tipo": "electiva", "regulares": ["17"], "aprobadas": ["17"]},
    {"codigo": "E15", "nombre": "Metodologías Ágiles en el Desarrollo de Software", "anio_carrera": 4, "cuatrimestre": None, "horas": 3, "tipo": "electiva", "regulares": ["25"], "aprobadas": ["14", "16"]},

    # Año 5
    {"codigo": "E16", "nombre": "Fabricación Aditiva", "anio_carrera": 5, "cuatrimestre": None, "horas": 3, "tipo": "electiva", "regulares": ["28", "29", "30"], "aprobadas": ["7", "15", "18"]},
    {"codigo": "E17", "nombre": "Dirección de Recursos Humanos", "anio_carrera": 5, "cuatrimestre": None, "horas": 3, "tipo": "electiva", "regulares": ["30"], "aprobadas": []},
    {"codigo": "E18", "nombre": "Informática en la Administración Pública", "anio_carrera": 5, "cuatrimestre": 2, "horas": 4, "tipo": "electiva", "regulares": ["16"], "aprobadas": []},
    {"codigo": "E19", "nombre": "Sistemas de Información Integrados para la Industria", "anio_carrera": 5, "cuatrimestre": 2, "horas": 4, "tipo": "electiva", "regulares": ["25", "27", "30"], "aprobadas": []},
]


def todas_las_materias() -> list[MateriaSpec]:
    """Devuelve la concatenación de troncales + electivas en orden de PDF."""
    return TRONCALES + ELECTIVAS


__all__ = ["ELECTIVAS", "TRONCALES", "MateriaSpec", "todas_las_materias"]
