"""Bootstrap de la aplicación FastAPI."""
from fastapi import FastAPI

from app.api import materias

app = FastAPI(title="UTNHub API")

app.include_router(materias.router)


@app.get("/health")
def health():
    return {"status": "ok"}
