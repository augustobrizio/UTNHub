"""Scheduler in-process (APScheduler) para la ingesta periódica.

Solo orquesta *cuándo* corren los jobs; nunca contiene lógica de negocio.
Está aislado detrás de ``start()`` / ``shutdown()`` y se puede desactivar con
``SCHEDULER_ENABLED=false`` (serverless, tests, o disparo manual). Migrar a
serverless = reemplazar este módulo por un cron externo que invoque los mismos
jobs; el resto del código no cambia.
"""
from __future__ import annotations

import logging

from app.config import get_settings
from app.workers import jobs

logger = logging.getLogger(__name__)

_scheduler = None


def start() -> None:
    """Arranca el scheduler si está habilitado por config."""
    global _scheduler
    settings = get_settings()
    if not settings.scheduler_enabled:
        logger.info("Scheduler deshabilitado (SCHEDULER_ENABLED=false).")
        return
    if _scheduler is not None:
        return

    # Import local: apscheduler solo se necesita si el scheduler está activo.
    from apscheduler.schedulers.background import BackgroundScheduler

    _scheduler = BackgroundScheduler(timezone="America/Argentina/Buenos_Aires")
    _scheduler.add_job(
        jobs.ingesta_instagram,
        trigger="interval",
        hours=settings.ingesta_instagram_horas,
        id="ingesta_instagram",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        jobs.ingesta_utn_web,
        trigger="interval",
        hours=settings.ingesta_utn_web_horas,
        id="ingesta_utn_web",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info(
        "Scheduler iniciado (instagram cada %dh, utn_web cada %dh).",
        settings.ingesta_instagram_horas,
        settings.ingesta_utn_web_horas,
    )


def shutdown() -> None:
    """Detiene el scheduler si estaba corriendo."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler detenido.")
