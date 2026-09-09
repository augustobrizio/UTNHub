"""Día y hora de mesa de cada materia de ISI (UTN FRRO).

Fuente: planilla del Departamento de Sistemas ("Materias obligatorias" y
"Materias electivas"), verificada a mano el **2026-09-07**.

En FRRO la mesa reparte las materias por **día de la semana**, no por fecha:
cae la semana de mesas y el lunes se rinde Análisis Matemático I, el jueves
Simulación. Por eso lo que se carga acá es ``(materia, día, hora)`` y no una
fecha — el calendario ya sabe qué semana hay mesa.

El mapeo es **por código**, no por nombre: la planilla escribe algunos títulos
distinto del plan 2023 y hacer matching por texto sería frágil.
``nombre_fuente`` guarda el título tal cual aparece en la planilla; el seed lo
compara contra el nombre del plan y **avisa cuando difieren**, así un cambio de
plan no pasa silencioso.

Diferencias conocidas y aceptadas contra el plan (ver ``isi_2023.py``):

- ``7``   — "Arquitectura de las Computadoras" / plan: "Arquitectura de
  Computadoras".
- ``19``  — "Bases de Datos" / plan: "Base de Datos".
- ``13``  — "Sintaxis y Semántica de Lenguajes" / plan: "Sintaxis y Semántica
  de los Lenguajes".
- ``E13`` — "Soporte a Gestión de Datos con Programación Visual" / plan:
  "Soporte a las Bases de Datos con Programación Visual".

Tres materias del plan **no** figuran en la planilla y quedan sin fila:
``ADUSI`` (Seminario Integrador), ``E04`` (Formación de Emprendedores) y
``E11`` (Química Aplicada a la Informática). Sin fila significa "todavía no
tenemos el dato", no "no se rinde": las carga un admin cuando lo confirme.
"""
from __future__ import annotations

from typing import TypedDict

from app.core.plan import DIAS_MESA

#: Reexportado: los días válidos son del dominio, no de esta planilla.
__all__ = ["DIAS_MESA", "MESAS", "MESAS_ELECTIVAS", "MESAS_TRONCALES", "MesaSpec"]


class MesaSpec(TypedDict):
    codigo: str
    dia: str  # lunes | martes | miercoles | jueves | viernes
    hora: str  # "HH:MM"
    nombre_fuente: str  # título tal cual lo escribe la planilla


# ---------------------------------------------------------------------------
# Troncales (36)
# ---------------------------------------------------------------------------
MESAS_TRONCALES: list[MesaSpec] = [
    # 1er nivel
    {"codigo": "1",  "dia": "lunes",     "hora": "15:00", "nombre_fuente": "Análisis Matemático I"},
    {"codigo": "7",  "dia": "lunes",     "hora": "14:00", "nombre_fuente": "Arquitectura de las Computadoras"},
    {"codigo": "4",  "dia": "lunes",     "hora": "16:00", "nombre_fuente": "Inglés I"},
    {"codigo": "2",  "dia": "martes",    "hora": "16:30", "nombre_fuente": "Álgebra y Geometría Analítica"},
    {"codigo": "3",  "dia": "martes",    "hora": "15:00", "nombre_fuente": "Física I"},
    {"codigo": "8",  "dia": "martes",    "hora": "09:00", "nombre_fuente": "Sistemas y Procesos de Negocio"},
    {"codigo": "6",  "dia": "miercoles", "hora": "08:00", "nombre_fuente": "Algoritmos y Estructuras de Datos"},
    {"codigo": "5",  "dia": "miercoles", "hora": "15:00", "nombre_fuente": "Lógica y Estructuras Discretas"},

    # 2do nivel
    {"codigo": "16", "dia": "lunes",     "hora": "17:00", "nombre_fuente": "Análisis de Sistemas de Información"},
    {"codigo": "11", "dia": "lunes",     "hora": "09:00", "nombre_fuente": "Ingeniería y Sociedad"},
    {"codigo": "14", "dia": "lunes",     "hora": "14:30", "nombre_fuente": "Paradigmas de Programación"},
    {"codigo": "12", "dia": "martes",    "hora": "16:00", "nombre_fuente": "Inglés II"},
    {"codigo": "9",  "dia": "miercoles", "hora": "16:00", "nombre_fuente": "Análisis Matemático II"},
    {"codigo": "10", "dia": "miercoles", "hora": "15:00", "nombre_fuente": "Física II"},
    {"codigo": "15", "dia": "miercoles", "hora": "19:00", "nombre_fuente": "Sistemas Operativos"},
    {"codigo": "13", "dia": "jueves",    "hora": "09:00", "nombre_fuente": "Sintaxis y Semántica de Lenguajes"},

    # 3er nivel
    {"codigo": "19", "dia": "lunes",     "hora": "14:30", "nombre_fuente": "Bases de Datos"},
    {"codigo": "23", "dia": "lunes",     "hora": "16:00", "nombre_fuente": "Diseño de Sistemas de Información"},
    {"codigo": "17", "dia": "martes",    "hora": "16:00", "nombre_fuente": "Probabilidad y Estadística"},
    {"codigo": "20", "dia": "miercoles", "hora": "16:00", "nombre_fuente": "Desarrollo de Software"},
    {"codigo": "22", "dia": "jueves",    "hora": "15:00", "nombre_fuente": "Análisis Numérico"},
    {"codigo": "21", "dia": "viernes",   "hora": "17:00", "nombre_fuente": "Comunicación de Datos"},
    {"codigo": "18", "dia": "viernes",   "hora": "18:00", "nombre_fuente": "Economía"},

    # 4to nivel
    {"codigo": "30", "dia": "martes",    "hora": "17:00", "nombre_fuente": "Administración de Sistemas de Información"},
    {"codigo": "27", "dia": "jueves",    "hora": "09:00", "nombre_fuente": "Investigación Operativa"},
    {"codigo": "28", "dia": "jueves",    "hora": "09:00", "nombre_fuente": "Simulación"},
    {"codigo": "29", "dia": "jueves",    "hora": "16:00", "nombre_fuente": "Tecnologías para la Automatización"},
    {"codigo": "25", "dia": "viernes",   "hora": "18:30", "nombre_fuente": "Ingeniería y Calidad de Software"},
    {"codigo": "24", "dia": "viernes",   "hora": "18:00", "nombre_fuente": "Legislación"},
    {"codigo": "26", "dia": "viernes",   "hora": "15:00", "nombre_fuente": "Redes de Datos"},

    # 5to nivel
    {"codigo": "36", "dia": "lunes",     "hora": "14:00", "nombre_fuente": "Proyecto Final"},
    {"codigo": "31", "dia": "miercoles", "hora": "16:00", "nombre_fuente": "Inteligencia Artificial"},
    {"codigo": "35", "dia": "miercoles", "hora": "19:00", "nombre_fuente": "Seguridad en los Sistemas de Información"},
    {"codigo": "32", "dia": "jueves",    "hora": "15:00", "nombre_fuente": "Ciencia de Datos"},
    {"codigo": "33", "dia": "jueves",    "hora": "15:00", "nombre_fuente": "Sistemas de Gestión"},
    {"codigo": "34", "dia": "viernes",   "hora": "16:00", "nombre_fuente": "Gestión Gerencial"},
]


# ---------------------------------------------------------------------------
# Electivas (17)
# ---------------------------------------------------------------------------
MESAS_ELECTIVAS: list[MesaSpec] = [
    # Año 2
    {"codigo": "E02", "dia": "lunes",     "hora": "16:00", "nombre_fuente": "Análisis y Diseño de Datos e Información"},
    {"codigo": "E01", "dia": "miercoles", "hora": "17:00", "nombre_fuente": "Entornos Gráficos"},
    {"codigo": "E03", "dia": "jueves",    "hora": "15:00", "nombre_fuente": "Sistemas de Información Geográfica"},

    # Año 3
    {"codigo": "E06", "dia": "lunes",     "hora": "15:30", "nombre_fuente": "Informática Jurídica"},
    {"codigo": "E08", "dia": "lunes",     "hora": "17:00", "nombre_fuente": "Tecnologías de Desarrollo de Software IDE"},
    {"codigo": "E09", "dia": "lunes",     "hora": "14:00", "nombre_fuente": "Gestión Ingenieril"},
    {"codigo": "E05", "dia": "martes",    "hora": "19:00", "nombre_fuente": "Algoritmos Genéticos"},
    {"codigo": "E10", "dia": "viernes",   "hora": "18:30", "nombre_fuente": "Introducción a la Práctica Profesional"},
    {"codigo": "E07", "dia": "viernes",   "hora": "19:00", "nombre_fuente": "Lenguaje de Programación JAVA"},

    # Año 4
    {"codigo": "E15", "dia": "lunes",     "hora": "18:30", "nombre_fuente": "Metodologías Ágiles en el Desarrollo de Software"},
    {"codigo": "E12", "dia": "miercoles", "hora": "19:00", "nombre_fuente": "Infraestructura Tecnológica"},
    {"codigo": "E14", "dia": "jueves",    "hora": "17:00", "nombre_fuente": "Metodología de la Investigación"},
    {"codigo": "E13", "dia": "jueves",    "hora": "16:00", "nombre_fuente": "Soporte a Gestión de Datos con Programación Visual"},

    # Año 5
    {"codigo": "E19", "dia": "lunes",     "hora": "18:30", "nombre_fuente": "Sistemas de Información Integrados para la Industria"},
    {"codigo": "E18", "dia": "lunes",     "hora": "18:00", "nombre_fuente": "Informática en la Administración Pública"},
    {"codigo": "E17", "dia": "jueves",    "hora": "19:30", "nombre_fuente": "Dirección de Recursos Humanos"},
    {"codigo": "E16", "dia": "jueves",    "hora": "16:00", "nombre_fuente": "Fabricación Aditiva"},
]


#: Las 53 mesas de la planilla, troncales primero.
MESAS: list[MesaSpec] = MESAS_TRONCALES + MESAS_ELECTIVAS
