"""Componentes de IA de UTNHub.

Centraliza todo lo que consume un LLM: clasificadores, y a futuro el agente
conversacional. Los prompts viven en ``app/ai/prompts/`` como módulos Python,
versionados por git (un cambio de prompt es un diff revisable en un PR).

El modelo de cada componente se configura por variable de entorno (ver
``app.config``), no se hardcodea.
"""
