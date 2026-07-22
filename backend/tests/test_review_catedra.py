"""Tests de la regla de negocio de reviews de cátedra (review_service)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.models.review import ReviewCatedra  # noqa: E402
from app.services import review_service  # noqa: E402


# --- nota_desde_votos -------------------------------------------------------

def test_nota_caso_de_referencia():
    # BOLOGNA en ANALISIS I: 41/33/13/1/0 sobre 88 respuestas -> ~4.3
    nota = review_service.nota_desde_votos(41, 33, 13, 1, 0)
    assert nota == 4.3


def test_nota_sin_votos_es_none():
    assert review_service.nota_desde_votos(0, 0, 0, 0, 0) is None


def test_nota_todo_super_recomiendo_es_5():
    assert review_service.nota_desde_votos(10, 0, 0, 0, 0) == 5.0


def test_nota_todo_super_evitaria_es_1():
    assert review_service.nota_desde_votos(0, 0, 0, 0, 7) == 1.0


def test_nota_todo_normal_es_3():
    assert review_service.nota_desde_votos(0, 0, 5, 0, 0) == 3.0


# --- nota_catedra (sobre el modelo) -----------------------------------------

def test_nota_catedra_none_si_no_hay_review():
    assert review_service.nota_catedra(None) is None


def test_nota_catedra_desde_modelo():
    r = ReviewCatedra(
        materia_codigo="1",
        profesor_id=1,
        super_recomiendo=2,
        recomiendo=0,
        normal=0,
        evitaria=0,
        super_evitaria=2,
    )
    # (5*2 + 1*2) / 4 = 3.0
    assert review_service.nota_catedra(r) == 3.0


# --- score_comision ---------------------------------------------------------

def test_score_comision_promedia_las_disponibles():
    sc = review_service.score_comision([4.0, 2.0, None])
    assert sc.score == 3.0
    assert sc.con_review == 2
    assert sc.total == 3


def test_score_comision_sin_reviews_es_none():
    sc = review_service.score_comision([None, None])
    assert sc.score is None
    assert sc.con_review == 0
    assert sc.total == 2


def test_score_comision_vacio():
    sc = review_service.score_comision([])
    assert sc.score is None
    assert sc.con_review == 0
    assert sc.total == 0
