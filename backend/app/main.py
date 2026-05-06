"""Bootstrap de la aplicacion FastAPI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import materias, usuario_materia

app = FastAPI(title="UTNHub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(materias.router)
app.include_router(usuario_materia.router)


@app.get("/health")
def health():
    """Endpoint de healthcheck."""
    return {"status": "ok"}
