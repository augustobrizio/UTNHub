"""Bootstrap de la aplicacion FastAPI."""
from fastapi import FastAPI

from app.api import materias, usuario_materia

app = FastAPI(title="UTNHub API")

app.include_router(materias.router)
app.include_router(usuario_materia.router)


@app.get("/health")
def health():
    """Endpoint de healthcheck."""
    return {"status": "ok"}
