from fastapi import FastAPI

app = FastAPI(title="UTNHub API")


@app.get("/health")
def health():
    return {"status": "ok"}
