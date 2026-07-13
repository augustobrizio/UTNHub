"""Scrapers de novedades multi-fuente (Instagram, sitio web FRRO).

Cada fuente implementa el protocolo ``FuenteNovedad`` y devuelve
``NovedadCruda`` (contenido sin clasificar). La clasificación IA y la
persistencia viven en ``services/``.
"""
